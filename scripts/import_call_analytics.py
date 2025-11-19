#!/usr/bin/env python3
"""
Call Analytics Import Script
Analyzes call log CSV and updates customer records with aggregated statistics
Does NOT store individual call records - only customer-level insights
"""

import csv
import psycopg2
from datetime import datetime
from collections import defaultdict
import sys
from decimal import Decimal

# Database connection
DATABASE_URL = "postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

def parse_duration_to_minutes(duration_str):
    """Convert '00h 00m 04s' to decimal minutes"""
    try:
        parts = duration_str.replace('h', '').replace('m', '').replace('s', '').split()
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = int(parts[2])
        total_minutes = hours * 60 + minutes + seconds / 60
        return Decimal(str(round(total_minutes, 2)))
    except:
        return Decimal('0')

def normalize_phone(phone):
    """Normalize phone number format"""
    if not phone:
        return None
    # Remove spaces and ensure starts with +
    phone = phone.strip()
    if not phone.startswith('+'):
        phone = '+' + phone
    return phone

def analyze_csv(csv_path):
    """
    Analyze CSV and return aggregated data per customer
    Returns: dict of {phone_number: customer_data}
    """
    print(f"📊 Analyzing CSV file: {csv_path}")
    
    customer_data = defaultdict(lambda: {
        'name': 'Unknown',
        'phone': None,
        'total_calls': 0,
        'incoming_calls': 0,
        'outgoing_calls': 0,
        'missed_calls': 0,
        'total_duration_minutes': Decimal('0'),
        'first_call_date': None,
        'last_call_date': None,
        'call_dates': []
    })
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        total_rows = 0
        
        for row in reader:
            total_rows += 1
            
            # Get the customer phone number (To Number)
            phone = normalize_phone(row['To Number'])
            if not phone:
                continue
            
            # Extract data
            name = row['Name'].strip('"') if row['Name'] != 'Unknown' else customer_data[phone]['name']
            call_type = row['Type']
            duration = parse_duration_to_minutes(row['Duration'])
            call_datetime_str = row['Date Time']
            
            try:
                call_datetime = datetime.strptime(call_datetime_str, '%Y-%m-%d %H:%M:%S')
            except:
                continue
            
            # Update aggregated data
            data = customer_data[phone]
            
            # Keep the first non-Unknown name we find
            if name != 'Unknown' and data['name'] == 'Unknown':
                data['name'] = name
            
            data['phone'] = phone
            data['total_calls'] += 1
            data['total_duration_minutes'] += duration
            data['call_dates'].append(call_datetime)
            
            # Count by type
            if call_type == 'Incoming':
                data['incoming_calls'] += 1
            elif call_type == 'Outgoing':
                data['outgoing_calls'] += 1
            elif call_type == 'Missed':
                data['missed_calls'] += 1
            
            # Track first and last call dates
            if not data['first_call_date'] or call_datetime < data['first_call_date']:
                data['first_call_date'] = call_datetime
            if not data['last_call_date'] or call_datetime > data['last_call_date']:
                data['last_call_date'] = call_datetime
    
    print(f"✅ Processed {total_rows} call records")
    print(f"✅ Found {len(customer_data)} unique phone numbers")
    
    return customer_data

def determine_customer_tier(call_count, total_spent=0, missed_calls=0):
    """
    Determine customer tier based on engagement
    Returns: (call_loyalty_level, color_tag, loyalty_level)
    
    Note: Basic tier is ONLY for customers with 0 calls (newly created)
    Anyone who called at least once gets a proper engagement level
    """
    # Call-based loyalty
    if call_count >= 100:
        call_loyalty = 'VIP'
        color_tag = 'vip'
        loyalty_level = 'platinum'
    elif call_count >= 50:
        call_loyalty = 'Premium'
        color_tag = 'premium'
        loyalty_level = 'platinum'
    elif call_count >= 20:
        call_loyalty = 'Regular'
        color_tag = 'regular'
        loyalty_level = 'gold'
    elif call_count >= 10:
        call_loyalty = 'Active'
        color_tag = 'active'
        loyalty_level = 'silver'
    elif call_count >= 5:
        call_loyalty = 'Engaged'
        color_tag = 'engaged'
        loyalty_level = 'silver'
    elif call_count >= 1:
        call_loyalty = 'Interested'
        color_tag = 'interested'
        loyalty_level = 'bronze'
    else:
        # Only customers with NO calls are Basic
        call_loyalty = 'Basic'
        color_tag = 'new'
        loyalty_level = 'bronze'
    
    # Enhance with spending data if available
    if total_spent > 1000000:  # 1M TZS
        loyalty_level = 'platinum'
    elif total_spent > 500000:
        if loyalty_level not in ['platinum']:
            loyalty_level = 'gold'
    elif total_spent > 100000:
        if loyalty_level not in ['platinum', 'gold']:
            loyalty_level = 'silver'
    
    return call_loyalty, color_tag, loyalty_level

def update_database(customer_data):
    """Update customer records in database"""
    print("\n🔄 Connecting to database...")
    
    stats = {
        'updated': 0,
        'created': 0,
        'skipped': 0,
        'errors': 0
    }
    
    print("🔄 Processing customers...")
    
    # Process in smaller batches to avoid connection timeout
    batch_size = 50
    customer_items = list(customer_data.items())
    total_customers = len(customer_items)
    
    for batch_start in range(0, total_customers, batch_size):
        batch_end = min(batch_start + batch_size, total_customers)
        batch = customer_items[batch_start:batch_end]
        
        # Create new connection for each batch
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
        except Exception as e:
            print(f"\n❌ Connection error: {str(e)}")
            stats['errors'] += len(batch)
            continue
        
        for phone, data in batch:
            try:
                # Check if customer exists
                cur.execute(
                    "SELECT id, name, total_spent, created_at FROM customers WHERE phone = %s",
                    (phone,)
                )
                result = cur.fetchone()
                
                avg_duration = data['total_duration_minutes'] / data['total_calls'] if data['total_calls'] > 0 else Decimal('0')
                
                if result:
                    # Customer exists - UPDATE
                    customer_id, existing_name, total_spent, created_at = result
                    
                    # Use existing name if it's not Unknown
                    final_name = existing_name if existing_name and existing_name != 'Unknown' else data['name']
                    
                    # Determine tier
                    call_loyalty, color_tag, loyalty_level = determine_customer_tier(
                        data['total_calls'],
                        float(total_spent) if total_spent else 0,
                        data['missed_calls']
                    )
                    
                    # Update with earliest date between created_at and first_call_date
                    final_created_at = created_at
                    if data['first_call_date'] and (not created_at or data['first_call_date'] < created_at):
                        final_created_at = data['first_call_date']
                    
                    cur.execute("""
                        UPDATE customers SET
                            name = %s,
                            total_calls = %s,
                            incoming_calls = %s,
                            outgoing_calls = %s,
                            missed_calls = %s,
                            total_call_duration_minutes = %s,
                            avg_call_duration_minutes = %s,
                            first_call_date = %s,
                            last_call_date = %s,
                            last_activity_date = %s,
                            call_loyalty_level = %s,
                            color_tag = %s,
                            loyalty_level = %s,
                            created_at = %s,
                            updated_at = NOW()
                        WHERE id = %s
                    """, (
                        final_name,
                        data['total_calls'],
                        data['incoming_calls'],
                        data['outgoing_calls'],
                        data['missed_calls'],
                        data['total_duration_minutes'],
                        avg_duration,
                        data['first_call_date'],
                        data['last_call_date'],
                        data['last_call_date'],
                        call_loyalty,
                        color_tag,
                        loyalty_level,
                        final_created_at,
                        customer_id
                    ))
                    
                    stats['updated'] += 1
                    
                else:
                    # Customer doesn't exist - CREATE
                    call_loyalty, color_tag, loyalty_level = determine_customer_tier(
                        data['total_calls'],
                        0,
                        data['missed_calls']
                    )
                    
                    cur.execute("""
                        INSERT INTO customers (
                            name,
                            phone,
                            total_calls,
                            incoming_calls,
                            outgoing_calls,
                            missed_calls,
                            total_call_duration_minutes,
                            avg_call_duration_minutes,
                            first_call_date,
                            last_call_date,
                            last_activity_date,
                            call_loyalty_level,
                            color_tag,
                            loyalty_level,
                            created_at,
                            joined_date,
                            is_active
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        data['name'],
                        phone,
                        data['total_calls'],
                        data['incoming_calls'],
                        data['outgoing_calls'],
                        data['missed_calls'],
                        data['total_duration_minutes'],
                        avg_duration,
                        data['first_call_date'],
                        data['last_call_date'],
                        data['last_call_date'],
                        call_loyalty,
                        color_tag,
                        loyalty_level,
                        data['first_call_date'],  # created_at = first call date
                        data['first_call_date'].date() if data['first_call_date'] else None,  # joined_date
                        True  # is_active
                    ))
                    
                    stats['created'] += 1
                    
            except Exception as e:
                print(f"❌ Error processing {phone}: {str(e)}")
                stats['errors'] += 1
                continue
        
        # Commit and close connection for this batch
        try:
            conn.commit()
            cur.close()
            conn.close()
            print(f"  ✅ Batch complete: {batch_end}/{total_customers} customers processed ({stats['updated']} updated, {stats['created']} created)")
        except Exception as e:
            print(f"❌ Error committing batch: {str(e)}")
            try:
                cur.close()
                conn.close()
            except:
                pass
    
    return stats

def print_statistics(customer_data, db_stats):
    """Print analysis statistics"""
    print("\n" + "="*60)
    print("📊 CALL ANALYTICS SUMMARY")
    print("="*60)
    
    # Top callers
    top_callers = sorted(customer_data.items(), key=lambda x: x[1]['total_calls'], reverse=True)[:10]
    
    print("\n🏆 TOP 10 MOST ENGAGED CUSTOMERS:")
    print(f"{'Rank':<6} {'Phone':<20} {'Name':<20} {'Calls':<8} {'Duration'}")
    print("-" * 80)
    for i, (phone, data) in enumerate(top_callers, 1):
        print(f"{i:<6} {phone:<20} {data['name']:<20} {data['total_calls']:<8} {float(data['total_duration_minutes']):.1f} min")
    
    # Tier distribution
    tier_counts = defaultdict(int)
    for phone, data in customer_data.items():
        tier, _, _ = determine_customer_tier(data['total_calls'], 0, data['missed_calls'])
        tier_counts[tier] += 1
    
    print("\n📈 CUSTOMER TIER DISTRIBUTION:")
    tier_emojis = {'VIP': '👑', 'Premium': '⭐', 'Regular': '🔥', 'Active': '✓', 'Engaged': '💬', 'Interested': '👤', 'Basic': '•'}
    for tier in ['VIP', 'Premium', 'Regular', 'Active', 'Engaged', 'Interested', 'Basic']:
        count = tier_counts.get(tier, 0)
        percentage = (count / len(customer_data) * 100) if customer_data else 0
        emoji = tier_emojis.get(tier, '')
        print(f"  {emoji} {tier:<10}: {count:>5} customers ({percentage:>5.1f}%)")
    
    # Database update stats
    print("\n💾 DATABASE UPDATE RESULTS:")
    print(f"  ✅ Customers Updated: {db_stats['updated']}")
    print(f"  ✨ New Customers Created: {db_stats['created']}")
    print(f"  ❌ Errors: {db_stats['errors']}")
    print(f"  📊 Total Processed: {db_stats['updated'] + db_stats['created']}")
    
    # Call type breakdown
    total_incoming = sum(d['incoming_calls'] for d in customer_data.values())
    total_outgoing = sum(d['outgoing_calls'] for d in customer_data.values())
    total_missed = sum(d['missed_calls'] for d in customer_data.values())
    total = total_incoming + total_outgoing + total_missed
    
    print("\n📞 CALL TYPE BREAKDOWN:")
    print(f"  📥 Incoming: {total_incoming:>6} ({total_incoming/total*100:.1f}%)")
    print(f"  📤 Outgoing: {total_outgoing:>6} ({total_outgoing/total*100:.1f}%)")
    print(f"  ❌ Missed:   {total_missed:>6} ({total_missed/total*100:.1f}%)")
    
    print("\n" + "="*60)

def main():
    csv_path = "/Users/mtaasisi/Desktop/untitled folder/Report 2023-10-13 00_00_00 to 2025-09-18 23_59_59.csv"
    
    print("🚀 Call Analytics Import Tool")
    print("="*60)
    
    # Step 1: Analyze CSV
    customer_data = analyze_csv(csv_path)
    
    if not customer_data:
        print("❌ No customer data found in CSV")
        return
    
    # Step 2: Update database
    db_stats = update_database(customer_data)
    
    # Step 3: Print statistics
    print_statistics(customer_data, db_stats)
    
    print("\n✅ Import completed successfully!")

if __name__ == "__main__":
    main()

