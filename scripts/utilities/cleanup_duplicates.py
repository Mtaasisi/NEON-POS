#!/usr/bin/env python3
"""
Remove duplicate customers, keeping the one with highest loyalty points
"""

import psycopg2

DB_CONNECTION = "postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

def cleanup_duplicates():
    conn = None
    cursor = None
    
    try:
        print("Connecting to database...")
        conn = psycopg2.connect(DB_CONNECTION)
        cursor = conn.cursor()
        
        # Find duplicates
        print("Finding duplicate phone numbers...")
        cursor.execute("""
            SELECT phone, COUNT(*) as count 
            FROM lats_customers 
            WHERE phone IS NOT NULL
            GROUP BY phone 
            HAVING COUNT(*) > 1
        """)
        
        duplicates = cursor.fetchall()
        print(f"Found {len(duplicates)} phone numbers with duplicates")
        
        if len(duplicates) == 0:
            print("No duplicates found!")
            return
        
        total_deleted = 0
        
        for phone, count in duplicates:
            # Get all records for this phone
            cursor.execute("""
                SELECT id, name, loyalty_points, created_at
                FROM lats_customers 
                WHERE phone = %s
                ORDER BY loyalty_points DESC, created_at DESC
            """, (phone,))
            
            records = cursor.fetchall()
            
            # Keep the first one (highest loyalty points, most recent)
            keep_id = records[0][0]
            
            # Delete the rest
            delete_ids = [r[0] for r in records[1:]]
            
            if delete_ids:
                # Convert to proper format for PostgreSQL
                placeholders = ','.join(['%s'] * len(delete_ids))
                cursor.execute(f"""
                    DELETE FROM lats_customers 
                    WHERE id IN ({placeholders})
                """, delete_ids)
                
                deleted_count = len(delete_ids)
                total_deleted += deleted_count
                print(f"  Deleted {deleted_count} duplicate(s) for {records[0][1]} ({phone})")
        
        # Commit changes
        conn.commit()
        
        print("\n" + "="*60)
        print("Cleanup Complete!")
        print("="*60)
        print(f"Total duplicates removed: {total_deleted}")
        print("="*60)
        
        # Show final count
        cursor.execute("SELECT COUNT(*) FROM lats_customers")
        final_count = cursor.fetchone()[0]
        print(f"\nTotal customers in database: {final_count}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        if conn:
            conn.rollback()
    
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    cleanup_duplicates()

