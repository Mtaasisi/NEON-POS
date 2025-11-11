#!/usr/bin/env python3
"""
Customer Import Script
Maps CSV data to lats_customers table with 5-tier loyalty system
"""

import csv
import psycopg2
from datetime import datetime, timedelta
import sys

# Database connection string
DB_CONNECTION = "postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# 5-Level Tier Mapping (consolidating from original tiers)
TIER_MAPPING = {
    'VIP Gold': 'vip',       # Highest tier
    'Silver': 'gold',         # Second tier (rename Silver to Gold)
    'Bronze': 'silver',       # Third tier (rename Bronze to Silver)
    'Regular': 'bronze',      # Fourth tier (rename Regular to Bronze)
}

# Status mapping
STATUS_MAPPING = {
    'Active': 'active',
    'At Risk': 'at_risk',
    'Recent': 'recent',
    'Inactive': 'inactive'
}

def clean_phone_number(phone):
    """Clean and format phone number"""
    if not phone or phone == 'Unknown':
        return None
    # Remove any spaces and ensure it starts with +
    phone = phone.strip()
    if not phone.startswith('+'):
        phone = '+' + phone
    return phone

def parse_date(date_str):
    """Parse date from CSV format (YYYY-MM-DD)"""
    if not date_str or date_str == 'Unknown':
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except:
        return None

def get_loyalty_level(tier, loyalty_points):
    """Map tier to 5-level loyalty system"""
    # Map original tier to new 5-level system
    if tier in TIER_MAPPING:
        return TIER_MAPPING[tier]
    
    # Fallback: determine by loyalty points if tier not recognized
    if loyalty_points >= 200:
        return 'vip'
    elif loyalty_points >= 100:
        return 'gold'
    elif loyalty_points >= 50:
        return 'silver'
    elif loyalty_points >= 20:
        return 'bronze'
    else:
        return 'basic'

def get_color_tag(status):
    """Map status to color tag"""
    status_lower = status.lower()
    if status_lower == 'active':
        return 'green'
    elif status_lower == 'at risk':
        return 'yellow'
    elif status_lower == 'recent':
        return 'blue'
    elif status_lower == 'inactive':
        return 'red'
    else:
        return 'new'

def import_customers(csv_file_path):
    """Import customers from CSV to database"""
    
    conn = None
    cursor = None
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(DB_CONNECTION)
        cursor = conn.cursor()
        
        # Read CSV file
        print(f"Reading CSV file: {csv_file_path}")
        with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            imported = 0
            skipped = 0
            updated = 0
            
            for row in reader:
                try:
                    # Extract and clean data
                    name = row.get('Customer_Name', 'Unknown').strip()
                    if name == 'Unknown' or not name:
                        name = f"Customer {row.get('Rank', 'N/A')}"
                    
                    phone = clean_phone_number(row.get('Phone_Number'))
                    if not phone:
                        skipped += 1
                        print(f"Skipping {name} - no valid phone number")
                        continue
                    
                    # Parse dates
                    creation_date = parse_date(row.get('Customer_Creation_Date'))
                    last_visit = parse_date(row.get('Last_Visit'))
                    lifetime_days = int(row.get('Customer_Lifetime_Days', 0) or 0)
                    # Derive first_call_date from lifetime (first call = last_visit - lifetime_days)
                    first_call_date = None
                    if last_visit and lifetime_days > 0:
                        try:
                            first_call_date = (datetime.combine(last_visit, datetime.min.time()) - timedelta(days=lifetime_days)).date()
                        except Exception:
                            first_call_date = None
                    last_call_date = last_visit
                    
                    # Parse numeric fields
                    loyalty_points = int(row.get('Loyalty_Points', 0) or 0)
                    total_checkins = int(row.get('Total_Checkins', 0) or 0)
                    total_talk_time = float(row.get('Total_Talk_Time_Minutes', 0) or 0)
                    incoming_calls = int(row.get('Incoming_Calls', 0) or 0)
                    outgoing_calls = int(row.get('Outgoing_Calls', 0) or 0)
                    missed_calls = int(row.get('Missed_Calls', 0) or 0)
                    
                    # Calculate average call duration
                    total_calls = incoming_calls + outgoing_calls
                    avg_call_duration = round(total_talk_time / total_calls, 2) if total_calls > 0 else 0

                    # Compute points from calls (exclude missed calls)
                    # Formula: points = incoming + outgoing + floor(total talk minutes)
                    points_from_calls = max(0, (incoming_calls + outgoing_calls) + int(total_talk_time))
                    
                    # Get tier and status
                    tier = row.get('Customer_Tier', 'Bronze')
                    status = row.get('Status', 'active')
                    
                    # Map to 5-level system
                    loyalty_level = get_loyalty_level(tier, loyalty_points)
                    color_tag = get_color_tag(status)
                    
                    # Check if customer already exists
                    cursor.execute(
                        "SELECT id FROM lats_customers WHERE phone = %s OR whatsapp = %s",
                        (phone, phone)
                    )
                    existing = cursor.fetchone()
                    
                    if existing:
                        # Update existing customer
                        cursor.execute("""
                            UPDATE lats_customers 
                            SET 
                                name = %s,
                                phone = %s,
                                whatsapp = %s,
                                loyalty_points = %s,
                                points = %s,
                                loyalty_level = %s,
                                last_visit = %s,
                                last_activity_date = %s,
                                first_call_date = COALESCE(%s, first_call_date),
                                last_call_date = COALESCE(%s, last_call_date),
                                total_purchases = %s,
                                total_call_duration_minutes = %s,
                                incoming_calls = %s,
                                outgoing_calls = %s,
                                missed_calls = %s,
                                total_calls = %s,
                                avg_call_duration_minutes = %s,
                                status = %s,
                                color_tag = %s,
                                joined_date = COALESCE(%s, COALESCE(%s, joined_date)),
                                updated_at = NOW()
                            WHERE id = %s
                        """, (
                            name, phone, phone, loyalty_points, points_from_calls,
                            loyalty_level, last_visit, last_visit,
                            first_call_date, last_call_date,
                            total_checkins,
                            total_talk_time, incoming_calls, outgoing_calls,
                            missed_calls, total_calls, avg_call_duration,
                            status.lower(), color_tag, first_call_date or creation_date, first_call_date, existing[0]
                        ))
                        updated += 1
                        if updated % 50 == 0:
                            print(f"Updated {updated} customers...")
                    else:
                        # Insert new customer
                        cursor.execute("""
                            INSERT INTO lats_customers (
                                name, phone, whatsapp, loyalty_points, points,
                                loyalty_level, last_visit, last_activity_date,
                                first_call_date, last_call_date,
                                total_purchases, total_call_duration_minutes,
                                incoming_calls, outgoing_calls, missed_calls,
                                total_calls, avg_call_duration_minutes,
                                status, color_tag, created_at, joined_date, is_active
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                                %s, %s,
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, true
                            )
                        """, (
                            name, phone, phone, loyalty_points, points_from_calls,
                            loyalty_level, last_visit, last_visit,
                            first_call_date, last_call_date,
                            total_checkins,
                            total_talk_time, incoming_calls, outgoing_calls,
                            missed_calls, total_calls, avg_call_duration,
                            status.lower(), color_tag, creation_date, first_call_date or creation_date
                        ))
                        imported += 1
                        if imported % 50 == 0:
                            print(f"Imported {imported} new customers...")
                        if (imported + updated) % 200 == 0:
                            conn.commit()
                            print("Committed batch of 200 records...")
                
                except Exception as e:
                    print(f"Error processing row for {name}: {str(e)}")
                    skipped += 1
                    continue
            
            # Commit all changes
            conn.commit()
            
            print("\n" + "="*60)
            print("Import Complete!")
            print("="*60)
            print(f"✅ New customers imported: {imported}")
            print(f"🔄 Existing customers updated: {updated}")
            print(f"⚠️  Skipped: {skipped}")
            print(f"📊 Total processed: {imported + updated + skipped}")
            print("="*60)
            
            # Show tier distribution
            cursor.execute("""
                SELECT loyalty_level, COUNT(*) as count 
                FROM lats_customers 
                GROUP BY loyalty_level 
                ORDER BY 
                    CASE loyalty_level
                        WHEN 'vip' THEN 1
                        WHEN 'gold' THEN 2
                        WHEN 'silver' THEN 3
                        WHEN 'bronze' THEN 4
                        WHEN 'basic' THEN 5
                        ELSE 6
                    END
            """)
            
            print("\n📊 Loyalty Tier Distribution:")
            print("-" * 40)
            tier_names = {
                'vip': '👑 VIP',
                'gold': '🥇 Gold',
                'silver': '🥈 Silver',
                'bronze': '🥉 Bronze',
                'basic': '⭐ Basic'
            }
            for tier, count in cursor.fetchall():
                tier_display = tier_names.get(tier, tier.title())
                print(f"{tier_display:20} {count:5} customers")
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        if conn:
            conn.rollback()
        sys.exit(1)
    
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Import customers from CSV to database')
    parser.add_argument('--yes', '-y', action='store_true', help='Skip confirmation prompt')
    args = parser.parse_args()
    
    csv_file = "/Users/mtaasisi/Desktop/ANDROID SHARE/For my database/Call log Pixel clean.csv"
    
    print("="*60)
    print("Customer Import Script")
    print("="*60)
    print(f"Source: {csv_file}")
    print(f"Target: lats_customers table")
    print(f"Loyalty System: 5 tiers (VIP → Gold → Silver → Bronze → Basic)")
    print("="*60)
    print()
    
    if args.yes:
        import_customers(csv_file)
    else:
        confirm = input("Proceed with import? (yes/no): ")
        if confirm.lower() in ['yes', 'y']:
            import_customers(csv_file)
        else:
            print("Import cancelled.")

