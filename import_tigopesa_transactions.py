#!/usr/bin/env python3
"""
TigoPesa Transaction Import Script
Parses TigoPesa SMS messages from JSON and imports them into the database
"""

import json
import re
import psycopg2
from datetime import datetime
from typing import Dict, List, Optional
import sys

# Database connection string
DB_CONN = "postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

def parse_amount(text: str) -> Optional[float]:
    """Extract amount from text like 'TSh 350,000'"""
    match = re.search(r'TSh\s+([\d,]+)', text)
    if match:
        return float(match.group(1).replace(',', ''))
    return None

def parse_phone_number(text: str) -> Optional[str]:
    """Extract Tanzania phone number from text"""
    match = re.search(r'(255[67]\d{8})', text)
    if match:
        return match.group(1)
    return None

def parse_reference_number(text: str) -> Optional[str]:
    """Extract reference/transaction number"""
    # Look for Kumbukumbu No. or Muamala:
    match = re.search(r'(?:Kumbukumbu No\.|Muamala):\s*(\d+)', text)
    if match:
        return match.group(1)
    return None

def parse_balance(text: str) -> Optional[float]:
    """Extract balance from text"""
    match = re.search(r'Salio\s+(?:lako\s+)?jipya\s+ni\s+TSh\s+([\d,]+)', text)
    if match:
        return float(match.group(1).replace(',', ''))
    return None

def parse_bank_info(text: str) -> tuple:
    """Extract bank name and account number"""
    # Pattern for bank transfers like "CRDB SAMWEL HANCE MASIKA - 152626627200"
    bank_match = re.search(r'(CRDB|NMB Bank|NBC|CRDB Bank)\s+([^-]+)\s*-\s*(\d+)', text, re.IGNORECASE)
    if bank_match:
        return bank_match.group(1), bank_match.group(2).strip(), bank_match.group(3)
    
    # Pattern for incoming from bank like "NMB Bank; 21210022515 - JAMES LAMECK KILLER"
    bank_match2 = re.search(r'(CRDB|NMB Bank|NBC|CRDB Bank);\s*(\d+)\s*-\s*([^K]+)', text, re.IGNORECASE)
    if bank_match2:
        return bank_match2.group(1), bank_match2.group(3).strip(), bank_match2.group(2)
    
    return None, None, None

def parse_sender_info(text: str) -> tuple:
    """Extract sender phone and name from incoming payment"""
    # Pattern: "255675892152 - ANGEL GEOFREY"
    match = re.search(r'(255[67]\d{8})\s*-\s*([^.]+?)(?:\s+Kumbukumbu|\.|$)', text)
    if match:
        return match.group(1), match.group(2).strip()
    
    # Check for mobile money providers
    if 'Airtel Money' in text:
        match = re.search(r'Airtel Money;\s*(255\d{9})\s*-\s*([^K]+)', text)
        if match:
            return match.group(1), match.group(2).strip()
    
    return None, None

def parse_fees(text: str) -> tuple:
    """Extract fees and tax information"""
    fee_match = re.search(r'Ada TSh\s+([\d,]+)', text)
    tax_match = re.search(r'VAT TSh\s+([\d,]+)', text)
    
    fee = float(fee_match.group(1).replace(',', '')) if fee_match else 0
    tax = float(tax_match.group(1).replace(',', '')) if tax_match else 0
    
    return fee, tax

def classify_transaction(body: str) -> str:
    """Determine transaction type from message body"""
    body_lower = body.lower()
    
    if 'umepokea malipo' in body_lower or 'umepokea tsh' in body_lower:
        if 'bank' in body_lower:
            return 'bank_deposit'
        return 'incoming'
    elif 'umetuma' in body_lower:
        if 'bank' in body_lower or 'crdb' in body_lower or 'nmb' in body_lower:
            return 'bank_withdrawal'
        return 'outgoing'
    elif 'withdrawal' in body_lower or 'kutoa' in body_lower:
        return 'withdrawal'
    elif 'deposit' in body_lower or 'kuweka' in body_lower:
        return 'deposit'
    
    return 'other'

def parse_tigopesa_message(message: Dict) -> Optional[Dict]:
    """Parse a single TigoPesa SMS message"""
    try:
        body = message.get('body', '')
        if not body:
            return None
        
        # Extract basic info
        amount = parse_amount(body)
        if not amount:
            return None
        
        transaction_type = classify_transaction(body)
        reference = parse_reference_number(body)
        balance = parse_balance(body)
        fees, tax = parse_fees(body)
        
        # Parse date (Unix timestamp in milliseconds)
        date_ms = int(message.get('date', 0))
        message_date = datetime.fromtimestamp(date_ms / 1000) if date_ms else None
        
        # Extract sender/receiver info
        sender_phone, sender_name = None, None
        receiver_phone, receiver_name = None, None
        bank_name, bank_account_name, bank_account = None, None, None
        
        if transaction_type == 'incoming' or transaction_type == 'bank_deposit':
            sender_phone, sender_name = parse_sender_info(body)
            if transaction_type == 'bank_deposit':
                bank_name, bank_account_name, bank_account = parse_bank_info(body)
                sender_name = bank_account_name if bank_account_name else sender_name
        elif transaction_type == 'outgoing' or transaction_type == 'bank_withdrawal':
            bank_name, receiver_name, bank_account = parse_bank_info(body)
            receiver_phone = parse_phone_number(body)
        
        return {
            'provider': 'TIGOPESA',
            'transaction_type': transaction_type,
            'amount': amount,
            'currency': 'TZS',
            'sender_phone': sender_phone,
            'sender_name': sender_name,
            'receiver_phone': receiver_phone,
            'receiver_name': receiver_name,
            'bank_name': bank_name,
            'bank_account': bank_account,
            'reference_number': reference,
            'balance_after': balance,
            'fees': fees,
            'tax': tax,
            'message_body': body,
            'message_date': message_date,
            'metadata': {
                'raw_message': message,
                'message_type': message.get('type')
            }
        }
    except Exception as e:
        print(f"Error parsing message: {e}")
        print(f"Message: {message}")
        return None

def load_json_file(file_path: str) -> List[Dict]:
    """Load and parse the JSON file containing SMS messages"""
    print(f"Loading file: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse JSON - could be array or object with 'data' key
    json_data = json.loads(content)
    
    # Handle different JSON structures
    if isinstance(json_data, dict) and 'data' in json_data:
        data = json_data['data']
    elif isinstance(json_data, list):
        data = json_data
    else:
        print("Unexpected JSON structure")
        return []
    
    # Filter for TigoPesa messages
    tigopesa_messages = []
    for item in data:
        if isinstance(item, dict) and item.get('address') == 'TIGOPESA':
            tigopesa_messages.append(item)
    
    print(f"Found {len(tigopesa_messages)} TigoPesa messages")
    return tigopesa_messages

def find_customer_by_phone(cursor, phone: str) -> Optional[str]:
    """Find customer ID by phone number"""
    if not phone:
        return None
    
    # Try exact match
    cursor.execute("""
        SELECT id FROM customers 
        WHERE phone = %s OR whatsapp = %s
        LIMIT 1
    """, (phone, phone))
    
    result = cursor.fetchone()
    if result:
        return result[0]
    
    # Try partial match (last 9 digits)
    if len(phone) >= 9:
        last_9 = phone[-9:]
        cursor.execute("""
            SELECT id FROM customers 
            WHERE phone LIKE %s OR whatsapp LIKE %s
            LIMIT 1
        """, (f'%{last_9}', f'%{last_9}'))
        
        result = cursor.fetchone()
        if result:
            return result[0]
    
    return None

def insert_transaction(cursor, transaction: Dict) -> tuple:
    """Insert a parsed transaction into the database
    Returns (success: bool, skipped: bool, error: bool)
    """
    try:
        # Check if transaction already exists (by reference number)
        if transaction['reference_number']:
            cursor.execute("""
                SELECT id FROM mobile_money_transactions 
                WHERE reference_number = %s AND provider = %s
            """, (transaction['reference_number'], transaction['provider']))
            
            if cursor.fetchone():
                return (False, True, False)  # skipped
        
        # Try to find customer by phone
        customer_id = None
        if transaction['sender_phone']:
            customer_id = find_customer_by_phone(cursor, transaction['sender_phone'])
        if not customer_id and transaction['receiver_phone']:
            customer_id = find_customer_by_phone(cursor, transaction['receiver_phone'])
        
        # Insert transaction
        metadata_json = json.dumps(transaction['metadata'])
        cursor.execute("""
            INSERT INTO mobile_money_transactions (
                provider, transaction_type, amount, currency,
                sender_phone, sender_name, receiver_phone, receiver_name,
                bank_name, bank_account, reference_number,
                balance_after, fees, tax, message_body, message_date,
                customer_id, metadata
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s
            )
        """, (
            transaction['provider'], transaction['transaction_type'], transaction['amount'], transaction['currency'],
            transaction['sender_phone'], transaction['sender_name'], transaction['receiver_phone'], transaction['receiver_name'],
            transaction['bank_name'], transaction['bank_account'], transaction['reference_number'],
            transaction['balance_after'], transaction['fees'], transaction['tax'], transaction['message_body'], transaction['message_date'],
            customer_id, metadata_json
        ))
        
        return (True, False, False)  # success
    except Exception as e:
        print(f"Error inserting transaction: {e}")
        import traceback
        traceback.print_exc()
        return (False, False, True)  # error

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_tigopesa_transactions.py <json_file_path>")
        sys.exit(1)
    
    json_file = sys.argv[1]
    
    # Load messages
    messages = load_json_file(json_file)
    
    if not messages:
        print("No TigoPesa messages found")
        return
    
    # Connect to database
    print("Connecting to database...")
    conn = psycopg2.connect(DB_CONN)
    conn.autocommit = False  # Use manual transactions
    cursor = conn.cursor()
    
    # Parse and insert transactions
    success_count = 0
    skip_count = 0
    error_count = 0
    
    print(f"\nProcessing {len(messages)} messages...")
    
    try:
        for i, message in enumerate(messages, 1):
            if i % 100 == 0:
                print(f"Processed {i}/{len(messages)} messages...")
                # Commit periodically to avoid long transactions
                conn.commit()
            
            parsed = parse_tigopesa_message(message)
            if not parsed:
                error_count += 1
                continue
            
            success, skipped, error = insert_transaction(cursor, parsed)
            if success:
                success_count += 1
            elif skipped:
                skip_count += 1
            else:
                error_count += 1
        
        # Commit remaining changes
        conn.commit()
    except Exception as e:
        print(f"\nFatal error during import: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    
    print("\n" + "="*60)
    print("Import Summary:")
    print(f"Total messages: {len(messages)}")
    print(f"Successfully imported: {success_count}")
    print(f"Skipped (duplicates): {skip_count}")
    print(f"Errors: {error_count}")
    print("="*60)
    
    # Show some statistics
    cursor.execute("""
        SELECT 
            transaction_type,
            COUNT(*) as count,
            SUM(amount) as total_amount,
            AVG(amount) as avg_amount
        FROM mobile_money_transactions
        WHERE provider = 'TIGOPESA'
        GROUP BY transaction_type
        ORDER BY count DESC
    """)
    
    print("\nTransaction Statistics:")
    print("-" * 60)
    for row in cursor.fetchall():
        print(f"{row[0]:20} | Count: {row[1]:5} | Total: TSh {row[2]:,.2f} | Avg: TSh {row[3]:,.2f}")
    
    # Show customer linking stats
    cursor.execute("""
        SELECT 
            COUNT(*) FILTER (WHERE customer_id IS NOT NULL) as linked,
            COUNT(*) FILTER (WHERE customer_id IS NULL) as unlinked,
            COUNT(*) as total
        FROM mobile_money_transactions
        WHERE provider = 'TIGOPESA'
    """)
    
    row = cursor.fetchone()
    print("\nCustomer Linking:")
    print("-" * 60)
    if row[2] > 0:
        print(f"Linked to customers: {row[0]} ({row[0]/row[2]*100:.1f}%)")
        print(f"Not linked: {row[1]} ({row[1]/row[2]*100:.1f}%)")
    else:
        print("No transactions found")
    
    cursor.close()
    conn.close()
    
    print("\nDone!")

if __name__ == '__main__':
    main()

