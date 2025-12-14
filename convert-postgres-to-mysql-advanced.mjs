#!/usr/bin/env node

/**
 * =====================================================
 * ADVANCED POSTGRESQL TO MYSQL CONVERTER
 * =====================================================
 * 
 * Converts PostgreSQL dump to MySQL including COPY statements
 */

import { readFileSync, writeFileSync } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { createInterface } from 'readline';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function convertFileStreaming(inputFile, outputFile) {
  log('\n🔄 Starting conversion (streaming mode)...', 'cyan');
  
  const writeStream = createWriteStream(outputFile);
  const rl = createInterface({
    input: createReadStream(inputFile),
    crlfDelay: Infinity
  });

  // Write header
  const header = `-- =====================================================
-- CONVERTED FROM POSTGRESQL TO MYSQL
-- =====================================================
-- Converted on: ${new Date().toISOString()}
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

`;
  writeStream.write(header);

  let inCopyMode = false;
  let copyTableName = '';
  let copyColumns = [];
  let lineCount = 0;
  let dataRowCount = 0;
  let insertBatch = [];
  const BATCH_SIZE = 1000;

  for await (const line of rl) {
    lineCount++;
    
    if (lineCount % 10000 === 0) {
      process.stdout.write(`\r   Processing line ${lineCount.toLocaleString()}...`);
    }

    let outputLine = line;

    // Check if entering COPY mode
    if (line.startsWith('COPY ')) {
      const copyMatch = line.match(/COPY ([^\s]+)\s+\(([^)]+)\)\s+FROM stdin;/);
      if (copyMatch) {
        inCopyMode = true;
        copyTableName = copyMatch[1].replace('public.', '');
        copyColumns = copyMatch[2].split(', ').map(col => col.trim());
        
        // Don't write the COPY line, we'll write INSERT statements instead
        writeStream.write(`-- Original: ${line}\n`);
        writeStream.write(`-- Converting to INSERT statements...\n`);
        continue;
      }
    }

    // Check if exiting COPY mode
    if (line === '\\.') {
      if (inCopyMode && insertBatch.length > 0) {
        // Flush remaining batch
        const insertSQL = `INSERT INTO \`${copyTableName}\` (\`${copyColumns.join('`, `')}\`) VALUES\n${insertBatch.join(',\n')};\n\n`;
        writeStream.write(insertSQL);
        insertBatch = [];
      }
      
      inCopyMode = false;
      copyTableName = '';
      copyColumns = [];
      writeStream.write(`-- End of data\n\n`);
      continue;
    }

    // Process data lines in COPY mode
    if (inCopyMode && line.trim() !== '') {
      dataRowCount++;
      
      // Split by tab (PostgreSQL COPY format uses tabs)
      const values = line.split('\t');
      
      // Convert values to MySQL format
      const convertedValues = values.map(value => {
        if (value === '\\N') return 'NULL';
        if (value === 't') return '1';
        if (value === 'f') return '0';
        
        // Escape single quotes
        const escaped = value.replace(/'/g, "''");
        
        // Handle backslashes
        const cleaned = escaped.replace(/\\/g, '\\\\');
        
        return `'${cleaned}'`;
      });
      
      insertBatch.push(`  (${convertedValues.join(', ')})`);
      
      // Write batch when it reaches BATCH_SIZE
      if (insertBatch.length >= BATCH_SIZE) {
        const insertSQL = `INSERT INTO \`${copyTableName}\` (\`${copyColumns.join('`, `')}\`) VALUES\n${insertBatch.join(',\n')};\n\n`;
        writeStream.write(insertSQL);
        insertBatch = [];
      }
      
      continue;
    }

    // Skip if in COPY mode (shouldn't reach here normally)
    if (inCopyMode) continue;

    // PostgreSQL-specific removals
    if (line.startsWith('SET statement_timeout')) continue;
    if (line.startsWith('SET lock_timeout')) continue;
    if (line.startsWith('SET idle_in_transaction_session_timeout')) continue;
    if (line.startsWith('SET client_encoding')) continue;
    if (line.startsWith('SET standard_conforming_strings')) continue;
    if (line.startsWith('SET check_function_bodies')) continue;
    if (line.startsWith('SET xmloption')) continue;
    if (line.startsWith('SET client_min_messages')) continue;
    if (line.startsWith('SET row_security')) continue;
    if (line.startsWith('SET default_tablespace')) continue;
    if (line.startsWith('SET default_table_access_method')) continue;
    if (line.startsWith('CREATE SCHEMA')) continue;
    if (line.startsWith('ALTER SCHEMA')) continue;
    if (line.startsWith('CREATE EXTENSION')) continue;
    if (line.startsWith('COMMENT ON EXTENSION')) continue;
    if (line.match(/ALTER TABLE .* OWNER TO/)) continue;
    if (line.match(/ALTER SEQUENCE .* OWNER TO/)) continue;
    if (line.match(/ALTER SEQUENCE .* OWNED BY/)) continue;
    if (line.startsWith('CREATE SEQUENCE')) continue;
    if (line.match(/SELECT pg_catalog\.setval/)) continue;
    if (line.startsWith('COMMENT ON')) continue;
    if (line.startsWith('CREATE POLICY')) continue;
    if (line.match(/ALTER TABLE .* ENABLE ROW LEVEL SECURITY/)) continue;
    if (line.match(/CREATE(?: OR REPLACE)? FUNCTION/)) {
      // Skip function definitions
      continue;
    }
    if (line.match(/CREATE TRIGGER/)) continue;
    if (line.match(/ALTER FUNCTION/)) continue;

    // Conversions
    outputLine = outputLine.replace(/\bSERIAL\b/gi, 'INT AUTO_INCREMENT');
    outputLine = outputLine.replace(/\bBIGSERIAL\b/gi, 'BIGINT AUTO_INCREMENT');
    outputLine = outputLine.replace(/\bboolean\b/gi, 'TINYINT(1)');
    outputLine = outputLine.replace(/\btimestamp without time zone\b/gi, 'DATETIME');
    outputLine = outputLine.replace(/\btimestamp with time zone\b/gi, 'DATETIME');
    outputLine = outputLine.replace(/\bTIMESTAMP\b/gi, 'DATETIME');
    outputLine = outputLine.replace(/\buuid\b/gi, 'CHAR(36)');
    outputLine = outputLine.replace(/\bjsonb\b/gi, 'JSON');
    outputLine = outputLine.replace(/\bDEFAULT true\b/gi, 'DEFAULT 1');
    outputLine = outputLine.replace(/\bDEFAULT false\b/gi, 'DEFAULT 0');
    outputLine = outputLine.replace(/DEFAULT now\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP');
    outputLine = outputLine.replace(/DEFAULT CURRENT_TIMESTAMP::timestamp without time zone/gi, 'DEFAULT CURRENT_TIMESTAMP');
    outputLine = outputLine.replace(/DEFAULT nextval\('[^']+'\)/gi, '');
    outputLine = outputLine.replace(/public\./g, '');
    outputLine = outputLine.replace(/ALTER TABLE ONLY /gi, 'ALTER TABLE ');
    outputLine = outputLine.replace(/USING btree/gi, '');
    outputLine = outputLine.replace(/USING gin/gi, '');
    outputLine = outputLine.replace(/USING gist/gi, '');

    // Write the line
    writeStream.write(outputLine + '\n');
  }

  // Write footer
  writeStream.write('\nSET FOREIGN_KEY_CHECKS = 1;\n');
  writeStream.end();

  await new Promise(resolve => writeStream.on('finish', resolve));

  console.log(''); // New line after progress
  log(`✅ Processed ${lineCount.toLocaleString()} lines`, 'green');
  log(`✅ Converted ${dataRowCount.toLocaleString()} data rows`, 'green');
}

async function main() {
  log('\n╔══════════════════════════════════════════════════════════════════╗', 'bright');
  log('║     Advanced PostgreSQL to MySQL Converter (with COPY support)  ║', 'bright');
  log('╚══════════════════════════════════════════════════════════════════╝', 'bright');

  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    log('\n❌ Error: Missing input file', 'red');
    log('\nUsage:', 'cyan');
    log('   node convert-postgres-to-mysql-advanced.mjs input.sql [output.sql]', 'yellow');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace('.sql', '-mysql-converted.sql');

  log(`\n📥 Input:  ${inputFile}`, 'cyan');
  log(`📤 Output: ${outputFile}`, 'cyan');

  try {
    await convertFileStreaming(inputFile, outputFile);

    log('\n✅ Conversion completed successfully!', 'green');
    log('\n📖 Next steps:', 'cyan');
    log('   1. Import to MySQL/phpMyAdmin:', 'yellow');
    log(`      - Use the file: ${outputFile}`, 'yellow');
    log('   2. Check for errors during import', 'yellow');
    log('   3. Verify data integrity after import', 'yellow');
    log('\n⚠️  Note: Some PostgreSQL-specific features were removed', 'yellow');
    log('   (triggers, functions, RLS policies)\n', 'yellow');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();



