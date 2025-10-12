#!/usr/bin/env node
import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

const config = JSON.parse(readFileSync(new URL('./database-config.json', import.meta.url)));
if (!config?.url) {
  console.error('❌ Missing database URL in database-config.json');
  process.exit(1);
}

const sql = neon(config.url);

function nowIso() { return new Date().toISOString(); }

async function main() {
  console.log('\n🧪 Running E2E Device Workflow Check');
  const deviceId = uuidv4();
  const performerId = uuidv4();
  const startedAt = nowIso();

  try {
    console.log('→ Inserting test device...');
    await sql.query(
      `INSERT INTO devices (
        id, device_name, brand, model, status, created_at, updated_at
      ) VALUES (
        $1, 'E2E Test Device', 'TestBrand', 'TestModel X', 'assigned', $2, $2
      )`,
      [deviceId, startedAt]
    );

    console.log('→ Inserting status transitions...');
    const transitions = [
      ['assigned', 'diagnosis-started'],
      ['diagnosis-started', 'in-repair'],
      ['in-repair', 'reassembled-testing'],
      ['reassembled-testing', 'repair-complete'],
      ['repair-complete', 'returned-to-customer-care'],
      ['returned-to-customer-care', 'done']
    ];
    for (const [fromStatus, toStatus] of transitions) {
      await sql.query(
        `INSERT INTO device_transitions (
          device_id, from_status, to_status, performed_by, created_at, signature
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [deviceId, fromStatus, toStatus, performerId, nowIso(), 'e2e-signature']
      );
    }

    console.log('→ Saving diagnostic checklist results...');
    await sql.query(
      `INSERT INTO diagnostic_checklist_results (
        device_id, problem_template_id, checklist_items, notes, performed_by,
        overall_status, technician_notes, completed_at, created_at, updated_at
      ) VALUES (
        $1, NULL, '[]'::jsonb, 'E2E checklist OK', $2,
        'all-passed', 'No issues', $3, $3, $3
      )`,
      [deviceId, performerId, nowIso()]
    );

    console.log('→ Updating device diagnostic summary and final status...');
    await sql.query(
      `UPDATE devices SET diagnostic_checklist = $2, status = 'done', updated_at = $3 WHERE id = $1`,
      [deviceId, { summary: 'E2E all-passed', last_updated: nowIso() }, nowIso()]
    );

    console.log('→ Logging SMS event...');
    await sql.query(
      `INSERT INTO sms_logs (id, phone_number, message, status, device_id, sent_at, created_at)
       VALUES ($1, $2, $3, 'sent', $4, $5, $5)`,
      [uuidv4(), '255700000000', 'Device ready for pickup (E2E)', deviceId, nowIso()]
    );

    console.log('→ Verifying results...');
    const [{ count: tCount }] = await sql`SELECT COUNT(*)::int as count FROM device_transitions WHERE device_id = ${deviceId}`;
    const [{ count: rCount }] = await sql`SELECT COUNT(*)::int as count FROM diagnostic_checklist_results WHERE device_id = ${deviceId}`;
    const [{ count: sCount }] = await sql`SELECT COUNT(*)::int as count FROM sms_logs WHERE device_id = ${deviceId}`;
    const [device] = await sql`SELECT status, diagnostic_checklist FROM devices WHERE id = ${deviceId}`;

    console.log('\n📊 Verification');
    console.log('   transitions:', tCount);
    console.log('   checklist results:', rCount);
    console.log('   sms logs:', sCount);
    console.log('   device status:', device?.status);
    console.log('   diagnostic_checklist:', JSON.stringify(device?.diagnostic_checklist));

    const ok = tCount >= transitions.length && rCount >= 1 && sCount >= 1 && device?.status === 'done';
    if (ok) {
      console.log('\n✅ E2E Device Workflow Check PASSED');
      process.exit(0);
    } else {
      console.error('\n❌ E2E Device Workflow Check FAILED');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();


