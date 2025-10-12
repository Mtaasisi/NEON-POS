#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync(new URL('./database-config.json', import.meta.url)));
if (!config?.url) {
  console.error('❌ Missing database URL in database-config.json');
  process.exit(1);
}

const sql = neon(config.url);

async function main() {
  console.log('\n⏰ Processing scheduled SMS...');
  try {
    // Fetch due pending SMS (limit batch to 50)
    const due = await sql`
      SELECT id, recipients, message, template_id, variables, ai_enhanced, personalization_data, created_by
      FROM scheduled_sms
      WHERE status = 'pending' AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT 50
    `;

    if (!due || due.length === 0) {
      console.log('No pending scheduled SMS.');
      return;
    }

    console.log(`Found ${due.length} scheduled SMS.`);
    for (const row of due) {
      const recipients = Array.isArray(row.recipients) ? row.recipients : [];
      if (recipients.length === 0) {
        await sql`UPDATE scheduled_sms SET status = 'failed' WHERE id = ${row.id}`;
        continue;
      }

      // Simulate sending by writing to sms_logs for each recipient
      for (const phone of recipients) {
        await sql`
          INSERT INTO sms_logs (phone_number, message, status, sent_at, created_at)
          VALUES (${phone}, ${row.message}, 'sent', NOW(), NOW())
        `;
      }

      await sql`UPDATE scheduled_sms SET status = 'sent' WHERE id = ${row.id}`;
    }

    console.log('✅ Scheduled SMS processing complete.');
  } catch (err) {
    console.error('❌ Error processing scheduled SMS:', err.message);
    process.exit(1);
  }
}

main();


