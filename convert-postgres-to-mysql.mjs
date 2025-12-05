#!/usr/bin/env node

/**
 * =====================================================
 * CONVERT POSTGRESQL DUMP TO MYSQL FORMAT
 * =====================================================
 * 
 * This script converts a PostgreSQL database dump to MySQL-compatible format
 * 
 * Usage:
 *   node convert-postgres-to-mysql.mjs input.sql output.sql
 */

import { readFileSync, writeFileSync } from 'fs';

// Colors for console output
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

function convertPostgresToMySQL(content) {
  log('\n🔄 Converting PostgreSQL syntax to MySQL...', 'cyan');
  
  let converted = content;
  let changes = [];

  // Remove PostgreSQL-specific commands
  converted = converted.replace(/SET statement_timeout = \d+;/g, '-- Removed: SET statement_timeout');
  changes.push('Removed SET statement_timeout');

  converted = converted.replace(/SET lock_timeout = \d+;/g, '-- Removed: SET lock_timeout');
  
  converted = converted.replace(/SET idle_in_transaction_session_timeout = \d+;/g, '-- Removed: SET idle_in_transaction_session_timeout');
  
  converted = converted.replace(/SET client_encoding = '[^']+';/g, '-- Removed: SET client_encoding');
  changes.push('Removed SET client_encoding');

  converted = converted.replace(/SET standard_conforming_strings = \w+;/g, '-- Removed: SET standard_conforming_strings');
  
  converted = converted.replace(/SET check_function_bodies = \w+;/g, '-- Removed: SET check_function_bodies');
  
  converted = converted.replace(/SET xmloption = \w+;/g, '-- Removed: SET xmloption');
  
  converted = converted.replace(/SET client_min_messages = \w+;/g, '-- Removed: SET client_min_messages');
  
  converted = converted.replace(/SET row_security = \w+;/g, '-- Removed: SET row_security');
  
  converted = converted.replace(/SET default_tablespace = '[^']*';/g, '-- Removed: SET default_tablespace');
  
  converted = converted.replace(/SET default_table_access_method = \w+;/g, '-- Removed: SET default_table_access_method');

  // Remove PostgreSQL-specific schema commands
  converted = converted.replace(/CREATE SCHEMA IF NOT EXISTS \w+;/g, '-- Removed: CREATE SCHEMA');
  
  converted = converted.replace(/ALTER SCHEMA \w+ OWNER TO \w+;/g, '-- Removed: ALTER SCHEMA OWNER');

  // Remove PostgreSQL extensions
  converted = converted.replace(/CREATE EXTENSION IF NOT EXISTS "[^"]+";?/g, '-- Removed: CREATE EXTENSION');
  changes.push('Removed PostgreSQL extensions');

  converted = converted.replace(/COMMENT ON EXTENSION "[^"]+" IS '[^']*';?/g, '-- Removed: COMMENT ON EXTENSION');

  // Remove ALTER TABLE OWNER commands
  converted = converted.replace(/ALTER TABLE [^\s]+ OWNER TO [^;]+;/g, '-- Removed: ALTER TABLE OWNER');
  changes.push('Removed OWNER statements');

  // Remove ALTER SEQUENCE OWNER commands
  converted = converted.replace(/ALTER SEQUENCE [^\s]+ OWNER TO [^;]+;/g, '-- Removed: ALTER SEQUENCE OWNER');

  // Remove PostgreSQL-specific sequence commands (keep basic sequences)
  converted = converted.replace(/ALTER SEQUENCE [^\s]+ OWNED BY [^;]+;/g, '-- Removed: ALTER SEQUENCE OWNED BY');

  // Convert SERIAL to AUTO_INCREMENT
  converted = converted.replace(/\s+SERIAL\s+/gi, ' INT AUTO_INCREMENT ');
  converted = converted.replace(/\s+BIGSERIAL\s+/gi, ' BIGINT AUTO_INCREMENT ');
  changes.push('Converted SERIAL to AUTO_INCREMENT');

  // Convert boolean true/false to 1/0
  converted = converted.replace(/\s+DEFAULT true\b/gi, ' DEFAULT 1');
  converted = converted.replace(/\s+DEFAULT false\b/gi, ' DEFAULT 0');
  converted = converted.replace(/\s+boolean\s+/gi, ' TINYINT(1) ');
  changes.push('Converted BOOLEAN to TINYINT');

  // Convert TEXT to TEXT (compatible, but add note)
  // TEXT is compatible between both

  // Convert TIMESTAMP to DATETIME
  converted = converted.replace(/\s+timestamp without time zone\s+/gi, ' DATETIME ');
  converted = converted.replace(/\s+timestamp with time zone\s+/gi, ' DATETIME ');
  converted = converted.replace(/\s+TIMESTAMP\s+/gi, ' DATETIME ');
  changes.push('Converted TIMESTAMP to DATETIME');

  // Convert now() to NOW()
  converted = converted.replace(/DEFAULT now\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP');
  converted = converted.replace(/DEFAULT CURRENT_TIMESTAMP::timestamp without time zone/gi, 'DEFAULT CURRENT_TIMESTAMP');

  // Convert UUID to VARCHAR(36) or CHAR(36)
  converted = converted.replace(/\s+uuid\s+/gi, ' CHAR(36) ');
  changes.push('Converted UUID to CHAR(36)');

  // Convert JSONB to JSON
  converted = converted.replace(/\s+jsonb\s+/gi, ' JSON ');
  converted = converted.replace(/\s+json\s+/gi, ' JSON ');
  changes.push('Converted JSONB to JSON');

  // Remove DROP TABLE IF EXISTS (keep it, it's compatible)
  // Actually, keep it as it's compatible

  // Convert COPY statements to INSERT statements (basic conversion)
  // Note: This is complex and may need manual review
  converted = converted.replace(/COPY [^\(]+ \([^)]+\) FROM stdin;/gi, function(match) {
    return '-- ' + match + '\n-- NOTE: COPY command needs manual conversion to INSERT statements';
  });
  changes.push('Marked COPY statements for manual review');

  // Remove PostgreSQL-specific \. end markers
  converted = converted.replace(/^\\\.$/gm, '-- Removed: PostgreSQL COPY end marker');

  // Convert nextval() for sequences to AUTO_INCREMENT behavior
  converted = converted.replace(/DEFAULT nextval\('[^']+'\)/gi, '-- Removed: nextval (use AUTO_INCREMENT instead)');
  
  // Remove CREATE SEQUENCE statements (MySQL uses AUTO_INCREMENT)
  converted = converted.replace(/CREATE SEQUENCE [^;]+;/gi, '-- Removed: CREATE SEQUENCE (use AUTO_INCREMENT)');
  changes.push('Removed CREATE SEQUENCE statements');

  // Remove SELECT pg_catalog.setval()
  converted = converted.replace(/SELECT pg_catalog\.setval\([^;]+;/gi, '-- Removed: setval (not needed in MySQL)');

  // Convert public schema references to database name
  converted = converted.replace(/public\./g, '');
  changes.push('Removed schema qualifiers');

  // Remove ALTER TABLE ONLY
  converted = converted.replace(/ALTER TABLE ONLY /gi, 'ALTER TABLE ');

  // Convert CONSTRAINT syntax (mostly compatible, but check)
  // Keep it as it's mostly compatible

  // Remove COMMENT ON statements (MySQL uses different syntax)
  converted = converted.replace(/COMMENT ON [^;]+;/gi, '-- Removed: COMMENT ON (use ALTER TABLE for column comments in MySQL)');
  changes.push('Removed COMMENT statements');

  // Remove PostgreSQL-specific index options
  converted = converted.replace(/USING btree/gi, '');
  converted = converted.replace(/USING gin/gi, '-- Warning: GIN index not supported in MySQL');
  converted = converted.replace(/USING gist/gi, '-- Warning: GIST index not supported in MySQL');

  // Remove CREATE TRIGGER and CREATE FUNCTION (PostgreSQL-specific)
  converted = converted.replace(/CREATE(?: OR REPLACE)? FUNCTION [^;]*\$\$[^$]*\$\$[^;]*;/gis, 
    '-- Removed: PostgreSQL FUNCTION (needs manual conversion to MySQL stored procedure)');
  
  converted = converted.replace(/CREATE TRIGGER [^;]+;/gi, 
    '-- Removed: PostgreSQL TRIGGER (needs manual conversion)');
  changes.push('Removed FUNCTION and TRIGGER definitions');

  // Remove ALTER FUNCTION
  converted = converted.replace(/ALTER FUNCTION [^;]+;/gi, '-- Removed: ALTER FUNCTION');

  // Remove CREATE POLICY (RLS - Row Level Security)
  converted = converted.replace(/CREATE POLICY [^;]+;/gi, '-- Removed: PostgreSQL RLS POLICY (not supported in MySQL)');
  converted = converted.replace(/ALTER TABLE [^\s]+ ENABLE ROW LEVEL SECURITY;/gi, '-- Removed: ROW LEVEL SECURITY');
  changes.push('Removed RLS policies');

  // Add MySQL compatibility header
  const header = `-- =====================================================
-- CONVERTED FROM POSTGRESQL TO MYSQL
-- =====================================================
-- Original file: PostgreSQL database dump
-- Converted on: ${new Date().toISOString()}
-- 
-- IMPORTANT NOTES:
-- 1. Review all "-- Removed:" and "-- Warning:" comments
-- 2. COPY statements need manual conversion to INSERT
-- 3. Some advanced PostgreSQL features may not convert
-- 4. Test thoroughly before using in production
-- 5. Triggers and functions need manual conversion
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

`;

  const footer = `
SET FOREIGN_KEY_CHECKS = 1;
`;

  converted = header + converted + footer;

  log(`\n✅ Conversion completed!`, 'green');
  log(`\n📋 Changes made:`, 'cyan');
  changes.forEach((change, index) => {
    log(`   ${index + 1}. ${change}`, 'yellow');
  });

  return converted;
}

// Main function
function main() {
  log('\n╔══════════════════════════════════════════════════════════════════╗', 'bright');
  log('║          PostgreSQL to MySQL Converter                          ║', 'bright');
  log('╚══════════════════════════════════════════════════════════════════╝', 'bright');

  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    log('\n❌ Error: Missing input file', 'red');
    log('\nUsage:', 'cyan');
    log('   node convert-postgres-to-mysql.mjs input.sql [output.sql]', 'yellow');
    log('\nExample:', 'cyan');
    log('   node convert-postgres-to-mysql.mjs database-for-phpmyadmin.sql mysql-database.sql', 'yellow');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace('.sql', '-mysql.sql');

  log(`\n📥 Input file: ${inputFile}`, 'cyan');
  log(`📤 Output file: ${outputFile}`, 'cyan');

  try {
    log('\n📖 Reading PostgreSQL dump...', 'cyan');
    const content = readFileSync(inputFile, 'utf-8');
    const lines = content.split('\n').length;
    const sizeKB = (content.length / 1024).toFixed(2);
    log(`   Lines: ${lines.toLocaleString()}`, 'yellow');
    log(`   Size: ${sizeKB} KB`, 'yellow');

    const converted = convertPostgresToMySQL(content);

    log('\n💾 Writing MySQL-compatible dump...', 'cyan');
    writeFileSync(outputFile, converted, 'utf-8');
    
    const convertedSizeKB = (converted.length / 1024).toFixed(2);
    log(`✅ File saved: ${outputFile}`, 'green');
    log(`   Size: ${convertedSizeKB} KB`, 'yellow');

    log('\n⚠️  IMPORTANT WARNINGS:', 'yellow');
    log('   1. This is an automated conversion - manual review required!', 'red');
    log('   2. Search for "-- Removed:" and "-- Warning:" comments', 'yellow');
    log('   3. COPY statements need manual conversion to INSERT', 'yellow');
    log('   4. Functions and triggers need manual rewriting', 'yellow');
    log('   5. Test the import on a test database first!', 'yellow');
    
    log('\n📖 Next steps:', 'cyan');
    log('   1. Review the converted file:', 'yellow');
    log(`      cat ${outputFile} | grep "Removed:"`, 'yellow');
    log('   2. Import to MySQL:', 'yellow');
    log(`      mysql -u username -p database_name < ${outputFile}`, 'yellow');
    log('   3. Or use phpMyAdmin to import the file', 'yellow');

    log('\n✅ Conversion complete!\n', 'green');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();


