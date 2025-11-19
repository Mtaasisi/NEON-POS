#!/usr/bin/env python3
"""
Call Analytics Preview Script
Shows what WOULD happen without making any database changes
"""

import csv
from datetime import datetime
from collections import defaultdict
from decimal import Decimal

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

def determine_customer_tier(call_count, missed_calls=0):
    """
    Determine customer tier based on engagement
    Note: Basic tier is ONLY for customers with 0 calls (newly created)
    Anyone who called at least once gets a proper engagement level
    """
    if call_count >= 100:
        return 'VIP', 'vip', 'platinum'
    elif call_count >= 50:
        return 'Premium', 'premium', 'platinum'
    elif call_count >= 20:
        return 'Regular', 'regular', 'gold'
    elif call_count >= 10:
        return 'Active', 'active', 'silver'
    elif call_count >= 5:
        return 'Engaged', 'engaged', 'silver'
    elif call_count >= 1:
        return 'Interested', 'interested', 'bronze'
    else:
        return 'Basic', 'new', 'bronze'

def analyze_csv(csv_path):
    """Analyze CSV and return aggregated data"""
    print(f"📊 Analyzing: {csv_path}\n")
    
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
    
    print(f"✅ Processed {total_rows:,} call records")
    print(f"✅ Found {len(customer_data):,} unique customers\n")
    
    return customer_data

def print_preview(customer_data):
    """Print detailed preview"""
    
    print("="*80)
    print("📊 PREVIEW: What Will Be Updated")
    print("="*80)
    
    # Tier distribution
    tier_counts = defaultdict(int)
    for phone, data in customer_data.items():
        tier, _, _ = determine_customer_tier(data['total_calls'], data['missed_calls'])
        tier_counts[tier] += 1
    
    print("\n🎯 CUSTOMER TIER DISTRIBUTION:")
    total = len(customer_data)
    for tier in ['VIP', 'Premium', 'Regular', 'Active', 'Engaged', 'Interested', 'Basic']:
        count = tier_counts.get(tier, 0)
        percentage = (count / total * 100) if total else 0
        bar = '█' * int(percentage / 2)
        emoji = {'VIP': '👑', 'Premium': '⭐', 'Regular': '🔥', 'Active': '✓', 'Engaged': '💬', 'Interested': '👤', 'Basic': '•'}.get(tier, '')
        print(f"  {emoji} {tier:<10}: {count:>5} customers ({percentage:>5.1f}%) {bar}")
    
    # Top 20 customers
    top_callers = sorted(customer_data.items(), key=lambda x: x[1]['total_calls'], reverse=True)[:20]
    
    print("\n🏆 TOP 20 MOST ENGAGED CUSTOMERS:")
    print(f"{'#':<4} {'Phone':<18} {'Name':<20} {'Calls':<7} {'Duration':<10} {'Tier'}")
    print("-" * 90)
    for i, (phone, data) in enumerate(top_callers, 1):
        tier, _, _ = determine_customer_tier(data['total_calls'], data['missed_calls'])
        duration_hrs = float(data['total_duration_minutes']) / 60
        emoji = '👑' if tier == 'VIP' else '⭐' if tier == 'Premium' else '🔥' if tier == 'Regular' else '✓'
        print(f"{i:<4} {phone:<18} {data['name']:<20} {data['total_calls']:<7} {duration_hrs:>7.1f}h   {emoji} {tier}")
    
    # Call statistics
    total_calls = sum(d['total_calls'] for d in customer_data.values())
    total_incoming = sum(d['incoming_calls'] for d in customer_data.values())
    total_outgoing = sum(d['outgoing_calls'] for d in customer_data.values())
    total_missed = sum(d['missed_calls'] for d in customer_data.values())
    total_duration = sum(d['total_duration_minutes'] for d in customer_data.values())
    
    print("\n📞 CALL STATISTICS:")
    print(f"  Total Calls:       {total_calls:>8,}")
    print(f"  📥 Incoming:       {total_incoming:>8,} ({total_incoming/total_calls*100:.1f}%)")
    print(f"  📤 Outgoing:       {total_outgoing:>8,} ({total_outgoing/total_calls*100:.1f}%)")
    print(f"  ❌ Missed:         {total_missed:>8,} ({total_missed/total_calls*100:.1f}%)")
    print(f"  ⏱️  Total Duration: {float(total_duration)/60:>8,.1f} hours")
    
    # High-value insights
    print("\n💎 HIGH-VALUE CUSTOMER INSIGHTS:")
    vip_customers = [d for d in customer_data.values() if d['total_calls'] >= 100]
    frequent_missed = [d for d in customer_data.values() if d['missed_calls'] >= 5]
    long_duration = [d for d in customer_data.values() if d['total_duration_minutes'] >= 60]
    
    print(f"  👑 VIP Customers (100+ calls):        {len(vip_customers):>4}")
    print(f"  ⚠️  High Missed Calls (5+):           {len(frequent_missed):>4}")
    print(f"  ⏰ Long Conversations (60+ min):      {len(long_duration):>4}")
    
    # Unknown contacts (potential new customers)
    unknown_contacts = [d for d in customer_data.values() if d['name'] == 'Unknown']
    print(f"  ❓ Unknown Contacts (need names):     {len(unknown_contacts):>4}")
    
    # Date range
    all_first_dates = [d['first_call_date'] for d in customer_data.values() if d['first_call_date']]
    all_last_dates = [d['last_call_date'] for d in customer_data.values() if d['last_call_date']]
    
    if all_first_dates and all_last_dates:
        print(f"\n📅 DATE RANGE:")
        print(f"  First Call:  {min(all_first_dates).strftime('%Y-%m-%d')}")
        print(f"  Last Call:   {max(all_last_dates).strftime('%Y-%m-%d')}")
        days = (max(all_last_dates) - min(all_first_dates)).days
        print(f"  Period:      {days} days ({days/365:.1f} years)")
    
    print("\n" + "="*80)
    print("ℹ️  This is a PREVIEW. No database changes have been made.")
    print("   Run 'python3 import_call_analytics.py' to actually update the database.")
    print("="*80 + "\n")

def main():
    csv_path = "/Users/mtaasisi/Desktop/untitled folder/Report 2023-10-13 00_00_00 to 2025-09-18 23_59_59.csv"
    
    print("\n🔍 Call Analytics Preview Tool\n")
    
    customer_data = analyze_csv(csv_path)
    
    if not customer_data:
        print("❌ No data found")
        return
    
    print_preview(customer_data)

if __name__ == "__main__":
    main()

