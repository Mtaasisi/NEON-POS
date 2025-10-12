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
    // Remove single-line comments for robustness
    const migration = migrationRaw.replace(/^\s*--.*$/gm, '');

    // Split SQL respecting quotes and dollar-quoted functions
    const statements = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    let inDollar = false;
    let dollarTag = '';

    for (let i = 0; i < migration.length; i++) {
      const ch = migration[i];
      const next2 = migration.slice(i, i + 2);

      // Handle start/end of dollar-quoted block $$tag$$ ... $$tag$$
      if (!inSingle && !inDouble) {
        // Detect start of dollar quote $$ or $tag$
        const dollarStart = migration.slice(i).match(/^\$[a-zA-Z0-9_]*\$/);
        if (!inDollar && dollarStart) {
          inDollar = true;
          dollarTag = dollarStart[0];
          current += dollarTag;
          i += dollarTag.length - 1;
          continue;
        }
        // Detect end of dollar quote
        if (inDollar) {
          const maybeEnd = migration.slice(i, i + dollarTag.length);
          if (maybeEnd === dollarTag) {
            inDollar = false;
            current += dollarTag;
            i += dollarTag.length - 1;
            continue;
          }
        }
      }

      // Handle single/double quotes
      if (!inDollar) {
        if (ch === "'" && !inDouble) {
          inSingle = !inSingle;
        } else if (ch === '"' && !inSingle) {
          inDouble = !inDouble;
        }
      }

      if (ch === ';' && !inSingle && !inDouble && !inDollar) {
        const stmt = current.trim();
        if (stmt.length > 0) statements.push(stmt);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim().length > 0) statements.push(current.trim());

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


