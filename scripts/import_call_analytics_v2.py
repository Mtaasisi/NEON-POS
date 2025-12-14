#!/usr/bin/env python3
"""
Call Analytics Import Script V2 - With Progress Display and Resume Support
"""

import csv
import psycopg2
from datetime import datetime
from collections import defaultdict
import sys
from decimal import Decimal
import time

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
    phone = phone.strip()
    if not phone.startswith('+'):
        phone = '+' + phone
    return phone

def determine_customer_tier(call_count, total_spent=0, missed_calls=0):
    """Determine customer tier"""
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
        call_loyalty = 'Basic'
        color_tag = 'new'
        loyalty_level = 'bronze'
    
    # Enhance with spending
    if total_spent > 1000000:
        loyalty_level = 'platinum'
    elif total_spent > 500000:
        if loyalty_level not in ['platinum']:
            loyalty_level = 'gold'
    elif total_spent > 100000:
        if loyalty_level not in ['platinum', 'gold']:
            loyalty_level = 'silver'
    
    return call_loyalty, color_tag, loyalty_level

def analyze_csv(csv_path):
    """Analyze CSV and return aggregated data"""
    print(f"📊 Analyzing CSV file...")
    sys.stdout.flush()
    
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
    })
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        total_rows = 0
        
        for row in reader:
            total_rows += 1
            if total_rows % 5000 == 0:
                print(f"  📖 Read {total_rows:,} call records...")
                sys.stdout.flush()
            
            phone = normalize_phone(row['To Number'])
            if not phone:
                continue
            
            name = row['Name'].strip('"') if row['Name'] != 'Unknown' else customer_data[phone]['name']
            call_type = row['Type']
            duration = parse_duration_to_minutes(row['Duration'])
            
            try:
                call_datetime = datetime.strptime(row['Date Time'], '%Y-%m-%d %H:%M:%S')
            except:
                continue
            
            data = customer_data[phone]
            
            if name != 'Unknown' and data['name'] == 'Unknown':
                data['name'] = name
            
            data['phone'] = phone
            data['total_calls'] += 1
            data['total_duration_minutes'] += duration
            
            if call_type == 'Incoming':
                data['incoming_calls'] += 1
            elif call_type == 'Outgoing':
                data['outgoing_calls'] += 1
            elif call_type == 'Missed':
                data['missed_calls'] += 1
            
            if not data['first_call_date'] or call_datetime < data['first_call_date']:
                data['first_call_date'] = call_datetime
            if not data['last_call_date'] or call_datetime > data['last_call_date']:
                data['last_call_date'] = call_datetime
    
    print(f"✅ Analyzed {total_rows:,} records → {len(customer_data):,} unique customers\n")
    sys.stdout.flush()
    
    return customer_data

def get_already_imported_phones():
    """Get list of phones that already have call data"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT phone FROM customers WHERE total_calls > 0 AND phone IS NOT NULL")
        phones = set(row[0] for row in cur.fetchall())
        cur.close()
        conn.close()
        return phones
    except:
        return set()

def update_database(customer_data, skip_existing=True):
    """Update customer records"""
    print(f"\n🔄 Starting database import...")
    sys.stdout.flush()
    
    # Check what's already imported
    already_imported = get_already_imported_phones() if skip_existing else set()
    
    if already_imported:
        print(f"✅ Found {len(already_imported):,} already imported - skipping those")
        sys.stdout.flush()
    
    stats = {
        'updated': 0,
        'created': 0,
        'skipped': len(already_imported),
        'errors': 0
    }
    
    # Filter out already imported
    to_process = {phone: data for phone, data in customer_data.items() 
                  if phone not in already_imported}
    
    if not to_process:
        print("✅ All customers already imported!")
        return stats
    
    print(f"📦 Processing {len(to_process):,} remaining customers...\n")
    sys.stdout.flush()
    
    # Process in small batches
    batch_size = 25
    customer_items = list(to_process.items())
    total_customers = len(customer_items)
    
    start_time = time.time()
    
    for batch_start in range(0, total_customers, batch_size):
        batch_end = min(batch_start + batch_size, total_customers)
        batch = customer_items[batch_start:batch_end]
        
        # New connection per batch
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
        except Exception as e:
            print(f"\n❌ Connection error: {str(e)}")
            sys.stdout.flush()
            stats['errors'] += len(batch)
            continue
        
        for phone, data in batch:
            try:
                cur.execute(
                    "SELECT id, name, total_spent, created_at FROM customers WHERE phone = %s",
                    (phone,)
                )
                result = cur.fetchone()
                
                avg_duration = data['total_duration_minutes'] / data['total_calls'] if data['total_calls'] > 0 else Decimal('0')
                
                if result:
                    customer_id, existing_name, total_spent, created_at = result
                    final_name = existing_name if existing_name and existing_name != 'Unknown' else data['name']
                    
                    call_loyalty, color_tag, loyalty_level = determine_customer_tier(
                        data['total_calls'],
                        float(total_spent) if total_spent else 0,
                        data['missed_calls']
                    )
                    
                    final_created_at = created_at
                    if data['first_call_date'] and (not created_at or data['first_call_date'] < created_at):
                        final_created_at = data['first_call_date']
                    
                    cur.execute("""
                        UPDATE customers SET
                            name = %s, total_calls = %s, incoming_calls = %s, outgoing_calls = %s,
                            missed_calls = %s, total_call_duration_minutes = %s, avg_call_duration_minutes = %s,
                            first_call_date = %s, last_call_date = %s, last_activity_date = %s,
                            call_loyalty_level = %s, color_tag = %s, loyalty_level = %s,
                            created_at = %s, updated_at = NOW()
                        WHERE id = %s
                    """, (
                        final_name, data['total_calls'], data['incoming_calls'], data['outgoing_calls'],
                        data['missed_calls'], data['total_duration_minutes'], avg_duration,
                        data['first_call_date'], data['last_call_date'], data['last_call_date'],
                        call_loyalty, color_tag, loyalty_level, final_created_at, customer_id
                    ))
                    
                    stats['updated'] += 1
                else:
                    call_loyalty, color_tag, loyalty_level = determine_customer_tier(
                        data['total_calls'], 0, data['missed_calls']
                    )
                    
                    cur.execute("""
                        INSERT INTO customers (
                            name, phone, total_calls, incoming_calls, outgoing_calls, missed_calls,
                            total_call_duration_minutes, avg_call_duration_minutes,
                            first_call_date, last_call_date, last_activity_date,
                            call_loyalty_level, color_tag, loyalty_level, created_at, joined_date, is_active
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        data['name'], phone, data['total_calls'], data['incoming_calls'],
                        data['outgoing_calls'], data['missed_calls'], data['total_duration_minutes'],
                        avg_duration, data['first_call_date'], data['last_call_date'], data['last_call_date'],
                        call_loyalty, color_tag, loyalty_level, data['first_call_date'],
                        data['first_call_date'].date() if data['first_call_date'] else None, True
                    ))
                    
                    stats['created'] += 1
                    
            except Exception as e:
                stats['errors'] += 1
                continue
        
        # Commit batch
        try:
            conn.commit()
            cur.close()
            conn.close()
            
            # Progress update
            total_processed = stats['updated'] + stats['created']
            percent = (batch_end / total_customers) * 100
            elapsed = time.time() - start_time
            rate = total_processed / elapsed if elapsed > 0 else 0
            eta = (total_customers - batch_end) / rate if rate > 0 else 0
            
            print(f"  ✅ {batch_end:,}/{total_customers:,} ({percent:.1f}%) | "
                  f"Updated: {stats['updated']:,} | Created: {stats['created']:,} | "
                  f"Rate: {rate:.0f}/s | ETA: {int(eta)}s")
            sys.stdout.flush()
            
        except Exception as e:
            print(f"❌ Batch commit error: {str(e)}")
            sys.stdout.flush()
            try:
                cur.close()
                conn.close()
            except:
                pass
    
    return stats

def main():
    csv_path = "/Users/mtaasisi/Desktop/untitled folder/Report 2023-10-13 00_00_00 to 2025-09-18 23_59_59.csv"
    
    print("\n🚀 Call Analytics Import V2 - With Progress & Resume")
    print("="*60)
    sys.stdout.flush()
    
    customer_data = analyze_csv(csv_path)
    db_stats = update_database(customer_data, skip_existing=True)
    
    print("\n" + "="*60)
    print("📊 IMPORT COMPLETE!")
    print("="*60)
    print(f"  ✅ Updated: {db_stats['updated']:,}")
    print(f"  ✨ Created: {db_stats['created']:,}")
    print(f"  ⏭️  Skipped: {db_stats['skipped']:,} (already imported)")
    print(f"  ❌ Errors: {db_stats['errors']:,}")
    print(f"  📊 Total: {db_stats['updated'] + db_stats['created'] + db_stats['skipped']:,}")
    print("="*60 + "\n")
    sys.stdout.flush()

if __name__ == "__main__":
    main()

