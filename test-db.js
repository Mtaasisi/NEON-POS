import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    const sql = neon(DATABASE_URL);

    // Test simple query
    const result = await sql`SELECT COUNT(*) as count FROM lats_delivery_orders`;
    console.log('✅ Database connection successful!');
    console.log('📊 Current delivery count:', result[0].count);

    // Test insert
    const testResult = await sql`
      INSERT INTO lats_delivery_orders (
        branch_id, delivery_method, delivery_address, delivery_phone,
        delivery_time, delivery_fee, subtotal, total_amount, status
      ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        'boda',
        'Test Connection Address',
        '+255712345678',
        'ASAP',
        5000,
        25000,
        30000,
        'pending'
      ) RETURNING id, tracking_number
    `;

    console.log('✅ Test delivery inserted successfully!');
    console.log('🆔 ID:', testResult[0].id);
    console.log('📦 Tracking:', testResult[0].tracking_number);

  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();