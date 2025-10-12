#!/usr/bin/env node
import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';

const config = JSON.parse(readFileSync(new URL('./database-config.json', import.meta.url)));
if (!config?.url) {
  console.error('❌ Missing database URL in database-config.json');
  process.exit(1);
}

const sql = neon(config.url);

async function main() {
  console.log('\n🔧 Applying ALIGN-SMS-AND-AUDIT-SCHEMA.sql...');
  const migrationRaw = readFileSync(new URL('./ALIGN-SMS-AND-AUDIT-SCHEMA.sql', import.meta.url), 'utf8');
  try {
    // Remove single-line comments to avoid dropping statements that start with comments
    const migration = migrationRaw.replace(/^\s*--.*$/gm, '');

    // Split by semicolon; trim and skip empties
    const statements = migration
      .split(/;\s*(\n|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      // Append semicolon lost by split for logging readability only
      const printable = stmt.length > 200 ? stmt.slice(0, 200) + '…' : stmt;
      console.log('→ Executing:', printable);
      // Execute dynamic SQL statement safely
      await sql.query(stmt);
    }
    console.log('✅ Migration applied successfully');

    // Quick verification queries
    const [smsLogsCols, smsTriggersCols, auditLogsCols] = await Promise.all([
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'sms_logs'`,
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'sms_triggers'`,
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs'`
    ]);

    console.log('\n📋 sms_logs columns:', smsLogsCols.map(r => r.column_name).sort().join(', '));
    console.log('📋 sms_triggers columns:', smsTriggersCols.map(r => r.column_name).sort().join(', '));
    console.log('📋 audit_logs columns:', auditLogsCols.map(r => r.column_name).sort().join(', '));

    console.log('\n🎉 All set.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

main();


