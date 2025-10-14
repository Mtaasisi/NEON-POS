#!/usr/bin/env node

/**
 * Execute PO Payment Spending Fix
 * This script applies the database fix automatically
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function main() {
  console.log(`\n${c.bright}${'='.repeat(70)}${c.reset}`);
  console.log(`${c.bright}${c.cyan}   🚀 APPLYING PO PAYMENT SPENDING FIX${c.reset}`);
  console.log(`${c.bright}${'='.repeat(70)}${c.reset}\n`);

  try {
    // Step 1: Load environment
    console.log(`${c.cyan}📡 Step 1: Loading database connection...${c.reset}`);
    
    let dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!dbUrl) {
      // Try to load from .env file
      try {
        const envContent = await readFile(join(__dirname, '.env'), 'utf-8');
        const match = envContent.match(/VITE_DATABASE_URL\s*=\s*(.+)/);
        if (match) {
          dbUrl = match[1].trim();
        }
      } catch (e) {
        // .env not found, that's okay
      }
    }
    
    if (!dbUrl) {
      console.log(`${c.red}❌ No database URL found${c.reset}`);
      console.log(`\n${c.yellow}Please set VITE_DATABASE_URL in your .env file or run:${c.reset}`);
      console.log(`${c.cyan}VITE_DATABASE_URL=your_url node execute-fix-now.mjs${c.reset}\n`);
      process.exit(1);
    }
    
    console.log(`${c.green}✅ Database connection found${c.reset}`);
    console.log(`${c.cyan}   ${dbUrl.substring(0, 40)}...${c.reset}\n`);

    // Step 2: Load SQL
    console.log(`${c.cyan}📄 Step 2: Loading SQL fix script...${c.reset}`);
    const sqlPath = join(__dirname, 'FIX-PO-PAYMENT-SPENDING-TRACKING.sql');
    const sqlContent = await readFile(sqlPath, 'utf-8');
    console.log(`${c.green}✅ SQL script loaded (${sqlContent.length} bytes)${c.reset}\n`);

    // Step 3: Execute
    console.log(`${c.cyan}🔄 Step 3: Executing fix on database...${c.reset}`);
    console.log(`${c.yellow}   (This may take 10-30 seconds)${c.reset}\n`);
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(dbUrl);
    
    // Create proper tagged template
    const templateParts = [sqlContent];
    templateParts.raw = [sqlContent];
    
    // Execute the SQL using tagged template syntax
    const result = await sql(templateParts);
    
    console.log(`${c.green}✅ SQL executed successfully!${c.reset}\n`);

    // Success message
    console.log(`${c.bright}${c.green}${'='.repeat(70)}${c.reset}`);
    console.log(`${c.bright}${c.green}   ✅ FIX APPLIED SUCCESSFULLY!${c.reset}`);
    console.log(`${c.bright}${c.green}${'='.repeat(70)}${c.reset}\n`);

    console.log(`${c.bright}📊 What was fixed:${c.reset}`);
    console.log(`${c.green}  ✅ Created trigger to auto-track PO payments as expenses${c.reset}`);
    console.log(`${c.green}  ✅ Backfilled existing PO payments${c.reset}`);
    console.log(`${c.green}  ✅ Created account transaction records${c.reset}`);
    console.log(`${c.green}  ✅ Added "Purchase Orders" expense category${c.reset}`);

    console.log(`\n${c.bright}🎯 Next steps:${c.reset}`);
    console.log(`${c.cyan}  1. Refresh your browser (Ctrl+Shift+R)${c.reset}`);
    console.log(`${c.cyan}  2. Go to Spending/Expense Reports${c.reset}`);
    console.log(`${c.cyan}  3. Look for "Purchase Orders" category${c.reset}`);
    console.log(`${c.cyan}  4. All PO payments should now be visible!${c.reset}`);

    console.log(`\n${c.yellow}💡 Tip: Future PO payments will automatically be tracked${c.reset}\n`);

  } catch (error) {
    console.log(`\n${c.red}❌ Error: ${error.message}${c.reset}\n`);
    console.log(`${c.yellow}Alternative: Run the SQL manually in Neon Dashboard${c.reset}`);
    console.log(`${c.cyan}File: FIX-PO-PAYMENT-SPENDING-TRACKING.sql${c.reset}\n`);
    process.exit(1);
  }
}

main();

