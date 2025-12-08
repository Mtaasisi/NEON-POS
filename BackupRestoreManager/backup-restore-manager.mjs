#!/usr/bin/env node
/**
 * Interactive Backup and Restore Manager
 * Allows choosing options by number for backup and restore operations
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';

const execAsync = promisify(exec);
const { Client } = pg;

// Color output utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Progress indicator
function showProgress(current, total, item = '') {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filled = Math.round((percentage / 100) * barLength);
  const empty = barLength - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  process.stdout.write(`\r${colorize(`[${bar}]`, 'cyan')} ${percentage}% ${item ? `- ${item}` : ''}`);
  if (current === total) {
    process.stdout.write('\n');
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Database connection strings storage
const CONNECTION_STRINGS_FILE = path.join(__dirname, '.db-connections.json');

// Load saved connection strings
function loadConnections() {
  try {
    if (fs.existsSync(CONNECTION_STRINGS_FILE)) {
      return JSON.parse(fs.readFileSync(CONNECTION_STRINGS_FILE, 'utf8'));
    }
  } catch (error) {
    // File doesn't exist or is invalid, return empty
  }
  return [];
}

// Save connection strings
function saveConnections(connections) {
  fs.writeFileSync(CONNECTION_STRINGS_FILE, JSON.stringify(connections, null, 2), 'utf8');
}

// Prompt for input
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Display menu and get choice
async function showMenu(title, options) {
  console.log('\n' + colorize('═'.repeat(60), 'cyan'));
  console.log(`  ${colorize(title, 'bright')}`);
  console.log(colorize('═'.repeat(60), 'cyan'));
  options.forEach((option, index) => {
    console.log(`  ${colorize(`${index + 1}.`, 'yellow')} ${option.label}`);
  });
  console.log(colorize('═'.repeat(60), 'cyan'));
  
  while (true) {
    const answer = await question(colorize('\nEnter your choice (number): ', 'cyan'));
    const choice = parseInt(answer);
    if (choice >= 1 && choice <= options.length) {
      return choice - 1;
    }
    console.log(colorize(`❌ Invalid choice. Please enter a number between 1 and ${options.length}.`, 'red'));
  }
}

// Check if connection is to localhost
function isLocalConnection(connectionString) {
  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
  } catch {
    // If URL parsing fails, check if it contains localhost
    return connectionString.includes('localhost') || 
           connectionString.includes('127.0.0.1') ||
           !connectionString.includes('@');
  }
}

// Check if PostgreSQL service is running (macOS)
async function checkPostgreSQLService() {
  const platform = process.platform;
  
  try {
    if (platform === 'darwin') {
      // macOS - check via brew services
      const { stdout } = await execAsync('brew services list | grep postgresql || echo ""');
      const services = stdout.trim();
      
      if (services) {
        // Check if any PostgreSQL service is running
        const running = services.split('\n').some(line => 
          line.includes('postgresql') && line.includes('started')
        );
        return { running, method: 'brew' };
      }
      
      // Fallback: check if postgres process is running
      try {
        await execAsync('pg_isready -h localhost 2>/dev/null');
        return { running: true, method: 'process' };
      } catch {
        return { running: false, method: 'unknown' };
      }
    } else if (platform === 'win32') {
      // Windows - check via service
      try {
        const { stdout } = await execAsync('sc query postgresql-x64-* 2>nul || echo ""');
        if (stdout.includes('RUNNING')) {
          return { running: true, method: 'service' };
        }
      } catch {
        // Try alternative method
        try {
          await execAsync('pg_isready -h localhost 2>nul');
          return { running: true, method: 'process' };
        } catch {
          return { running: false, method: 'unknown' };
        }
      }
      return { running: false, method: 'service' };
    } else {
      // Linux - check via systemctl or pg_isready
      try {
        const { stdout } = await execAsync('systemctl is-active postgresql 2>/dev/null || echo "inactive"');
        if (stdout.trim() === 'active') {
          return { running: true, method: 'systemctl' };
        }
      } catch {
        // Fallback to pg_isready
        try {
          await execAsync('pg_isready -h localhost 2>/dev/null');
          return { running: true, method: 'process' };
        } catch {
          return { running: false, method: 'unknown' };
        }
      }
      return { running: false, method: 'unknown' };
    }
  } catch (error) {
    return { running: false, method: 'unknown', error: error.message };
  }
}

// Start PostgreSQL service
async function startPostgreSQLService() {
  const platform = process.platform;
  
  console.log('\n🔧 Attempting to start PostgreSQL server...\n');
  
  try {
    if (platform === 'darwin') {
      // macOS - try brew services
      try {
        // Find PostgreSQL service name
        const { stdout } = await execAsync('brew services list | grep postgresql | head -1');
        const match = stdout.match(/(postgresql[@\d]+)/);
        
        if (match) {
          const serviceName = match[1];
          console.log(`   📦 Starting ${serviceName} via Homebrew...`);
          await execAsync(`brew services start ${serviceName}`);
          
          // Wait a bit for service to start
          console.log('   ⏳ Waiting for service to start...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Verify it's running
          const check = await checkPostgreSQLService();
          if (check.running) {
            console.log('   ✅ PostgreSQL started successfully!\n');
            return { success: true, method: 'brew' };
          }
        }
      } catch (error) {
        // Try alternative: pg_ctl
        try {
          console.log('   📦 Trying alternative method...');
          // Common PostgreSQL data directory locations
          const possibleDirs = [
            '/usr/local/var/postgres',
            `/usr/local/var/postgresql@14`,
            `/usr/local/var/postgresql@15`,
            `/usr/local/var/postgresql@16`,
            `/usr/local/var/postgresql@17`,
            `~/.local/var/postgres`
          ];
          
          for (const dir of possibleDirs) {
            try {
              const expandedDir = dir.replace('~', process.env.HOME || '');
              if (fs.existsSync(expandedDir)) {
                await execAsync(`pg_ctl -D "${expandedDir}" start 2>&1 || true`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                const check = await checkPostgreSQLService();
                if (check.running) {
                  console.log('   ✅ PostgreSQL started successfully!\n');
                  return { success: true, method: 'pg_ctl' };
                }
              }
            } catch {}
          }
        } catch {}
      }
      
      console.log('   ⚠️  Could not start PostgreSQL automatically');
      console.log('   💡 Try manually: brew services start postgresql@17');
      return { success: false, method: 'brew', manual: 'brew services start postgresql@17' };
      
    } else if (platform === 'win32') {
      // Windows - try net start
      try {
        console.log('   📦 Starting PostgreSQL service...');
        await execAsync('net start postgresql-x64-* 2>nul || sc start postgresql-x64-*');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const check = await checkPostgreSQLService();
        if (check.running) {
          console.log('   ✅ PostgreSQL started successfully!\n');
          return { success: true, method: 'net' };
        }
      } catch (error) {
        console.log('   ⚠️  Could not start PostgreSQL automatically');
        console.log('   💡 Try manually: net start postgresql-x64-*');
        return { success: false, method: 'net', manual: 'net start postgresql-x64-*' };
      }
    } else {
      // Linux - try systemctl
      try {
        console.log('   📦 Starting PostgreSQL service...');
        await execAsync('sudo systemctl start postgresql 2>&1 || systemctl start postgresql 2>&1');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const check = await checkPostgreSQLService();
        if (check.running) {
          console.log('   ✅ PostgreSQL started successfully!\n');
          return { success: true, method: 'systemctl' };
        }
      } catch (error) {
        console.log('   ⚠️  Could not start PostgreSQL automatically (may need sudo)');
        console.log('   💡 Try manually: sudo systemctl start postgresql');
        return { success: false, method: 'systemctl', manual: 'sudo systemctl start postgresql' };
      }
    }
    
    return { success: false };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test database connection with auto-start
async function testConnection(connectionString, autoStart = true) {
  // First, try to connect
  const client = new Client({ 
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });
  
  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    await client.end();
    return { success: true, version: result.rows[0].version };
  } catch (error) {
    await client.end().catch(() => {});
    
    // If it's a local connection and auto-start is enabled, try to start the server
    if (autoStart && isLocalConnection(connectionString)) {
      const errorMsg = error.message.toLowerCase();
      
      // Check if error suggests server is not running
      if (errorMsg.includes('connect econnrefused') || 
          errorMsg.includes('connection refused') ||
          errorMsg.includes('could not connect') ||
          errorMsg.includes('timeout') ||
          errorMsg.includes('no connection')) {
        
        console.log('\n⚠️  Database connection failed. Checking if PostgreSQL server is running...');
        
        const serviceStatus = await checkPostgreSQLService();
        
        if (!serviceStatus.running) {
          console.log('   ❌ PostgreSQL server is not running');
          
          const startResult = await startPostgreSQLService();
          
          if (startResult.success) {
            // Wait a bit more and retry
            console.log('   🔄 Retrying connection...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Retry connection
            const retryClient = new Client({ 
              connectionString: connectionString,
              ssl: { rejectUnauthorized: false },
              connectionTimeoutMillis: 10000
            });
            
            try {
              await retryClient.connect();
              const retryResult = await retryClient.query('SELECT version()');
              await retryClient.end();
              console.log('   ✅ Connection successful after starting server!\n');
              return { success: true, version: retryResult.rows[0].version, serverStarted: true };
            } catch (retryError) {
              await retryClient.end().catch(() => {});
              return { 
                success: false, 
                error: retryError.message,
                serverStarted: true,
                suggestion: startResult.manual || 'Please start PostgreSQL manually and try again'
              };
            }
          } else {
            return { 
              success: false, 
              error: error.message,
              serverNotRunning: true,
              suggestion: startResult.manual || 'Please start PostgreSQL manually and try again'
            };
          }
        }
      }
    }
    
    return { success: false, error: error.message };
  }
}

// Ensure database server is running before operations
async function ensureServerRunning(connectionString) {
  if (isLocalConnection(connectionString)) {
    const serviceStatus = await checkPostgreSQLService();
    if (!serviceStatus.running) {
      console.log('\n⚠️  PostgreSQL server is not running. Attempting to start...\n');
      const startResult = await startPostgreSQLService();
      if (!startResult.success) {
        throw new Error(`PostgreSQL server is not running. ${startResult.manual || 'Please start it manually.'}`);
      }
      // Wait a bit for server to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

// Helper function to escape SQL values
function escapeSQLValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  if (value instanceof Date) return `'${value.toISOString()}'::timestamptz`;
  if (Array.isArray(value)) {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  if (typeof value === 'object' && value !== null) {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Backup function with type option
async function backupDatabase(connectionString, backupName, backupType = 'full') {
  // Check and start server if needed
  await ensureServerRunning(connectionString);
  
  const client = new Client({ 
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                   new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
  const backupDir = path.join(__dirname, 'PROD BACKUP', backupName || `backup-${today}`);
  
  if (!fs.existsSync(path.join(__dirname, 'PROD BACKUP'))) {
    fs.mkdirSync(path.join(__dirname, 'PROD BACKUP'), { recursive: true });
  }
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const typeLabel = backupType === 'data' ? 'Data Only' : backupType === 'schema' ? 'Schema Only' : 'Full Backup';
  console.log(colorize(`\n📁 Backup directory: ${backupDir}`, 'cyan'));
  console.log(colorize(`📦 Backup type: ${typeLabel}\n`, 'yellow'));

  try {
    await client.connect();
    console.log(colorize('✅ Connected to database\n', 'green'));

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(colorize(`📋 Found ${tables.length} tables\n`, 'cyan'));

    // Ask about compression
    const compressChoice = await question(colorize('💾 Compress backup? (y/n, default: n): ', 'yellow'));
    const shouldCompress = compressChoice.toLowerCase() === 'y' || compressChoice.toLowerCase() === 'yes';

    if (backupType === 'schema') {
      // Schema-only backup - single SQL file
      return await backupSchemaOnly(client, tables, backupDir, timestamp, connectionString, shouldCompress);
    } else if (backupType === 'data') {
      // Data-only backup - single JSON and SQL file
      return await backupDataOnly(client, tables, backupDir, timestamp, connectionString, shouldCompress);
    } else {
      // Full backup - separate files per table (original behavior)
      return await backupFull(client, tables, backupDir, timestamp, connectionString, shouldCompress);
    }
  } catch (error) {
    await client.end().catch(() => {});
    return { success: false, error: error.message };
  }
}

// Compress backup directory
async function compressBackup(backupDir, timestamp) {
  return new Promise((resolve, reject) => {
    const zipPath = `${backupDir}_${timestamp}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const size = archive.pointer();
      console.log(colorize(`\n✅ Backup compressed: ${formatFileSize(size)}`, 'green'));
      console.log(colorize(`   File: ${path.basename(zipPath)}`, 'cyan'));
      resolve({ success: true, zipPath, size });
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(backupDir, false);
    archive.finalize();
  });
}

// Full backup - separate files per table
async function backupFull(client, tables, backupDir, timestamp, connectionString, shouldCompress = false) {
  const backupResults = {};
  let totalRecords = 0;
  const totalTables = tables.length;

  for (let i = 0; i < tables.length; i++) {
    const tableName = tables[i];
    try {
      showProgress(i + 1, totalTables, `Backing up ${tableName}`);
      const result = await client.query(`SELECT * FROM ${tableName}`);
      const data = result.rows;
      
      if (data.length > 0) {
        // Save JSON
        const jsonFile = path.join(backupDir, `${tableName}_${timestamp}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf8');
        
        // Save SQL
        const columns = Object.keys(data[0]);
        const sqlStatements = [];
        sqlStatements.push(`-- Backup of ${tableName} table`);
        sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
        sqlStatements.push(`-- Total records: ${data.length}\n`);
        
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          const values = batch.map(row => {
            const rowValues = columns.map(col => escapeSQLValue(row[col]));
            return `(${rowValues.join(', ')})`;
          });
          
          sqlStatements.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES`);
          sqlStatements.push(values.join(',\n') + ';');
          sqlStatements.push('');
        }
        
        const sqlFile = path.join(backupDir, `${tableName}_${timestamp}.sql`);
        fs.writeFileSync(sqlFile, sqlStatements.join('\n'), 'utf8');
        
          backupResults[tableName] = data.length;
          totalRecords += data.length;
        }
      } catch (error) {
        console.log(colorize(`\n   ❌ Error backing up ${tableName}: ${error.message}`, 'red'));
      }
    }
    
    console.log(''); // New line after progress

    // Calculate total backup size
    let totalSize = 0;
    const files = fs.readdirSync(backupDir);
    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      if (fs.statSync(filePath).isFile()) {
        totalSize += fs.statSync(filePath).size;
      }
    });

  // Create summary
  const summary = {
    backup_date: new Date().toISOString(),
    timestamp: timestamp,
    backup_type: 'full',
    connection_string: connectionString.replace(/:[^:@]+@/, ':****@'),
    tables_backed_up: Object.keys(backupResults).length,
    total_records: totalRecords,
    record_counts: backupResults
  };

    const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

    console.log('\n' + colorize('═'.repeat(60), 'cyan'));
    console.log(colorize('📊 BACKUP SUMMARY', 'bright'));
    console.log(colorize('═'.repeat(60), 'cyan'));
    console.log(`Type: ${colorize('Full Backup', 'yellow')}`);
    console.log(`Total Tables: ${colorize(Object.keys(backupResults).length, 'green')}`);
    console.log(`Total Records: ${colorize(totalRecords.toLocaleString(), 'green')}`);
    console.log(`Backup Size: ${colorize(formatFileSize(totalSize), 'cyan')}`);
    console.log(`Backup Location: ${colorize(backupDir, 'cyan')}`);
    
    let zipPath = null;
    if (shouldCompress) {
      console.log(colorize('\n💾 Compressing backup...', 'yellow'));
      try {
        const compressResult = await compressBackup(backupDir, timestamp);
        zipPath = compressResult.zipPath;
        console.log(colorize(`✅ Compression complete!`, 'green'));
        console.log(colorize(`   Original: ${formatFileSize(totalSize)}`, 'dim'));
        console.log(colorize(`   Compressed: ${formatFileSize(compressResult.size)}`, 'dim'));
        const ratio = ((1 - compressResult.size / totalSize) * 100).toFixed(1);
        console.log(colorize(`   Saved: ${ratio}% space`, 'green'));
      } catch (error) {
        console.log(colorize(`⚠️  Compression failed: ${error.message}`, 'yellow'));
      }
    }
    
    console.log(colorize('═'.repeat(60), 'cyan'));

    await client.end();
    return { success: true, backupDir, totalRecords, zipPath, size: totalSize };
}

// Data-only backup - single JSON and SQL file with all data
async function backupDataOnly(client, tables, backupDir, timestamp, connectionString, shouldCompress = false) {
  console.log(colorize('📦 Backing up data from all tables...\n', 'yellow'));
  
  const allData = {};
  const allSQLStatements = [];
  let totalRecords = 0;

  allSQLStatements.push('-- ============================================');
  allSQLStatements.push('-- DATA-ONLY BACKUP');
  allSQLStatements.push(`-- Generated: ${new Date().toISOString()}`);
  allSQLStatements.push('-- This file contains INSERT statements for all tables');
  allSQLStatements.push('-- ============================================\n');
  allSQLStatements.push('BEGIN;\n');

  for (let i = 0; i < tables.length; i++) {
    const tableName = tables[i];
    try {
      showProgress(i + 1, tables.length, `Backing up ${tableName}`);
      const result = await client.query(`SELECT * FROM ${tableName}`);
      const data = result.rows;
      
      if (data.length > 0) {
        allData[tableName] = data;
        
        // Add to SQL file
        const columns = Object.keys(data[0]);
        allSQLStatements.push(`-- Table: ${tableName} (${data.length} records)`);
        
        const batchSize = 100;
        for (let j = 0; j < data.length; j += batchSize) {
          const batch = data.slice(j, j + batchSize);
          const values = batch.map(row => {
            const rowValues = columns.map(col => escapeSQLValue(row[col]));
            return `(${rowValues.join(', ')})`;
          });
          
          allSQLStatements.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES`);
          allSQLStatements.push(values.join(',\n') + ';');
          allSQLStatements.push('');
        }
        
        totalRecords += data.length;
      }
    } catch (error) {
      console.log(colorize(`\n      ❌ Error backing up ${tableName}: ${error.message}`, 'red'));
    }
  }
  
  console.log(''); // New line after progress

  allSQLStatements.push('COMMIT;');

  // Save single JSON file with all data
  const jsonFile = path.join(backupDir, `all-data_${timestamp}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(allData, null, 2), 'utf8');
  const jsonSize = fs.statSync(jsonFile).size;
  console.log(colorize(`\n   💾 JSON file: ${path.basename(jsonFile)} (${formatFileSize(jsonSize)})`, 'green'));

  // Save single SQL file with all INSERTs
  const sqlFile = path.join(backupDir, `all-data_${timestamp}.sql`);
  fs.writeFileSync(sqlFile, allSQLStatements.join('\n'), 'utf8');
  const sqlSize = fs.statSync(sqlFile).size;
  console.log(colorize(`   💾 SQL file: ${path.basename(sqlFile)} (${formatFileSize(sqlSize)})`, 'green'));
  
  const totalSize = jsonSize + sqlSize;

  // Create summary
  const summary = {
    backup_date: new Date().toISOString(),
    timestamp: timestamp,
    backup_type: 'data-only',
    connection_string: connectionString.replace(/:[^:@]+@/, ':****@'),
    tables_backed_up: Object.keys(allData).length,
    total_records: totalRecords,
    files: {
      json: path.basename(jsonFile),
      sql: path.basename(sqlFile)
    }
  };

  const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n' + colorize('═'.repeat(60), 'cyan'));
  console.log(colorize('📊 BACKUP SUMMARY', 'bright'));
  console.log(colorize('═'.repeat(60), 'cyan'));
  console.log(`Type: ${colorize('Data Only', 'yellow')}`);
  console.log(`Total Tables: ${colorize(Object.keys(allData).length, 'green')}`);
  console.log(`Total Records: ${colorize(totalRecords.toLocaleString(), 'green')}`);
  console.log(`Backup Size: ${colorize(formatFileSize(totalSize), 'cyan')}`);
  console.log(`JSON File: ${colorize(path.basename(jsonFile), 'cyan')}`);
  console.log(`SQL File: ${colorize(path.basename(sqlFile), 'cyan')}`);
  console.log(`Backup Location: ${colorize(backupDir, 'cyan')}`);
  
  let zipPath = null;
  if (shouldCompress) {
    console.log(colorize('\n💾 Compressing backup...', 'yellow'));
    try {
      const compressResult = await compressBackup(backupDir, timestamp);
      zipPath = compressResult.zipPath;
      console.log(colorize(`✅ Compression complete!`, 'green'));
      console.log(colorize(`   Original: ${formatFileSize(totalSize)}`, 'dim'));
      console.log(colorize(`   Compressed: ${formatFileSize(compressResult.size)}`, 'dim'));
      const ratio = ((1 - compressResult.size / totalSize) * 100).toFixed(1);
      console.log(colorize(`   Saved: ${ratio}% space`, 'green'));
    } catch (error) {
      console.log(colorize(`⚠️  Compression failed: ${error.message}`, 'yellow'));
    }
  }
  
  console.log(colorize('═'.repeat(60), 'cyan'));

  await client.end();
  return { success: true, backupDir, totalRecords, zipPath, size: totalSize };
}

// Schema-only backup - single SQL file with all CREATE TABLE statements
async function backupSchemaOnly(client, tables, backupDir, timestamp, connectionString, shouldCompress = false) {
  console.log(colorize('📦 Backing up schema from all tables...\n', 'yellow'));
  
  const allSQLStatements = [];
  let tablesBackedUp = 0;

  allSQLStatements.push('-- ============================================');
  allSQLStatements.push('-- SCHEMA-ONLY BACKUP');
  allSQLStatements.push(`-- Generated: ${new Date().toISOString()}`);
  allSQLStatements.push('-- This file contains CREATE TABLE statements for all tables');
  allSQLStatements.push('-- ============================================\n');
  allSQLStatements.push('BEGIN;\n');

  for (let i = 0; i < tables.length; i++) {
    const tableName = tables[i];
    try {
      showProgress(i + 1, tables.length, `Backing up schema for ${tableName}`);
      
      // Get table structure
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          is_nullable,
          column_default,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      if (columnsResult.rows.length > 0) {
        const columnDefs = [];
        for (const col of columnsResult.rows) {
          let typeDef = col.data_type;
          
          // Handle specific types
          if (col.data_type === 'character varying' || col.data_type === 'varchar') {
            typeDef = col.character_maximum_length 
              ? `VARCHAR(${col.character_maximum_length})` 
              : 'VARCHAR';
          } else if (col.data_type === 'character' || col.data_type === 'char') {
            typeDef = col.character_maximum_length 
              ? `CHAR(${col.character_maximum_length})` 
              : 'CHAR';
          } else if (col.data_type === 'numeric') {
            if (col.numeric_precision && col.numeric_scale) {
              typeDef = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
            } else if (col.numeric_precision) {
              typeDef = `NUMERIC(${col.numeric_precision})`;
            } else {
              typeDef = 'NUMERIC';
            }
          } else if (col.udt_name && col.udt_name.startsWith('_')) {
            const baseType = col.udt_name.substring(1);
            typeDef = `${baseType}[]`;
          } else {
            typeDef = col.udt_name || col.data_type;
          }

          let colDef = `${col.column_name} ${typeDef}`;
          
          if (col.is_nullable === 'NO') {
            colDef += ' NOT NULL';
          }
          
          if (col.column_default) {
            colDef += ` DEFAULT ${col.column_default}`;
          }
          
          columnDefs.push(colDef);
        }

        allSQLStatements.push(`-- Table: ${tableName}`);
        allSQLStatements.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);
        allSQLStatements.push('  ' + columnDefs.join(',\n  '));
        allSQLStatements.push(');');
        allSQLStatements.push('');
        
        tablesBackedUp++;
      }
    } catch (error) {
      console.log(colorize(`\n      ❌ Error backing up ${tableName}: ${error.message}`, 'red'));
    }
  }
  
  console.log(''); // New line after progress

  allSQLStatements.push('COMMIT;');

  // Save single SQL file with all CREATE TABLE statements
  const sqlFile = path.join(backupDir, `schema-only_${timestamp}.sql`);
  fs.writeFileSync(sqlFile, allSQLStatements.join('\n'), 'utf8');
  const sqlSize = fs.statSync(sqlFile).size;
  console.log(colorize(`\n   💾 SQL file: ${path.basename(sqlFile)} (${formatFileSize(sqlSize)})`, 'green'));

  // Create summary
  const summary = {
    backup_date: new Date().toISOString(),
    timestamp: timestamp,
    backup_type: 'schema-only',
    connection_string: connectionString.replace(/:[^:@]+@/, ':****@'),
    tables_backed_up: tablesBackedUp,
    files: {
      sql: path.basename(sqlFile)
    }
  };

  const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n' + colorize('═'.repeat(60), 'cyan'));
  console.log(colorize('📊 BACKUP SUMMARY', 'bright'));
  console.log(colorize('═'.repeat(60), 'cyan'));
  console.log(`Type: ${colorize('Schema Only', 'yellow')}`);
  console.log(`Total Tables: ${colorize(tablesBackedUp, 'green')}`);
  console.log(`Backup Size: ${colorize(formatFileSize(sqlSize), 'cyan')}`);
  console.log(`SQL File: ${colorize(path.basename(sqlFile), 'cyan')}`);
  console.log(`Backup Location: ${colorize(backupDir, 'cyan')}`);
  
  let zipPath = null;
  if (shouldCompress) {
    console.log(colorize('\n💾 Compressing backup...', 'yellow'));
    try {
      const compressResult = await compressBackup(backupDir, timestamp);
      zipPath = compressResult.zipPath;
      console.log(colorize(`✅ Compression complete!`, 'green'));
      console.log(colorize(`   Original: ${formatFileSize(sqlSize)}`, 'dim'));
      console.log(colorize(`   Compressed: ${formatFileSize(compressResult.size)}`, 'dim'));
      const ratio = ((1 - compressResult.size / sqlSize) * 100).toFixed(1);
      console.log(colorize(`   Saved: ${ratio}% space`, 'green'));
    } catch (error) {
      console.log(colorize(`⚠️  Compression failed: ${error.message}`, 'yellow'));
    }
  }
  
  console.log(colorize('═'.repeat(60), 'cyan'));

  await client.end();
  return { success: true, backupDir, totalRecords: 0, zipPath, size: sqlSize };
}

// Restore function
async function restoreDatabase(connectionString, backupDir) {
  // Check and start server if needed
  await ensureServerRunning(connectionString);
  
  const client = new Client({ 
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(colorize('✅ Connected to database\n', 'green'));

    // Find all SQL files (try different patterns)
    let files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
    
    // Filter out summary and schema-only files, prioritize data files
    files = files.filter(f => {
      const name = f.toLowerCase();
      return !name.includes('summary') && 
             !name.includes('schema-only') && 
             (name.includes('all-data') || name.includes('lats_') || name.includes('_'));
    });
    
    if (files.length === 0) {
      // Try to find any SQL file
      files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql') && !f.includes('summary'));
    }
    
    console.log(colorize(`📋 Found ${files.length} SQL files to restore\n`, 'cyan'));

    if (files.length === 0) {
      console.log(colorize('⚠️  No SQL files found to restore!', 'yellow'));
      await client.end();
      return { success: false, error: 'No SQL files found in backup directory' };
    }

    await client.query('BEGIN');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(backupDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Extract table name from filename or use filename
      let tableName = file.replace('.sql', '').replace(/_/g, ' ');
      if (file.includes('all-data')) {
        tableName = 'All Data';
      } else if (file.includes('_')) {
        const parts = file.split('_');
        tableName = parts.slice(0, 2).join('_');
      }
      
      showProgress(i + 1, files.length, `Restoring ${tableName}`);
      
      try {
        // Execute SQL
        await client.query(sql);
      } catch (error) {
        console.log(colorize(`\n   ⚠️  Error restoring ${tableName}: ${error.message}`, 'yellow'));
        // Continue with other tables
      }
    }
    
    console.log(''); // New line after progress

    await client.query('COMMIT');
    await client.end();
    
    console.log(colorize('\n✅ Restore completed successfully!', 'green'));
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
    return { success: false, error: error.message };
  }
}

// Get database schema using existing client
async function getDatabaseSchemaFromClient(client) {
  // Get all tables
  const tablesResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const tables = {};
  
  for (const row of tablesResult.rows) {
    const tableName = row.table_name;
    
    // Get columns for each table
    const columnsResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    tables[tableName] = {
      columns: columnsResult.rows.map(col => ({
        name: col.column_name,
        type: col.data_type,
        maxLength: col.character_maximum_length,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        udtName: col.udt_name
      }))
    };
  }

  return tables;
}

// Merge database schema
async function mergeDatabaseSchema(sourceConn, targetConn, dryRun = true) {
  console.log('\n🔍 Analyzing schemas...\n');
  
  // Check and start servers if needed
  await ensureServerRunning(sourceConn);
  await ensureServerRunning(targetConn);
  
  const sourceClient = new Client({ 
    connectionString: sourceConn,
    ssl: { rejectUnauthorized: false }
  });
  
  const targetClient = new Client({ 
    connectionString: targetConn,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await sourceClient.connect();
    await targetClient.connect();
    console.log('✅ Connected to both databases\n');

    // Get schemas
    const sourceSchema = await getDatabaseSchemaFromClient(sourceClient);
    const targetSchema = await getDatabaseSchemaFromClient(targetClient);

    const migrations = [];
    let tablesAdded = 0;
    let columnsAdded = 0;

    // Find missing tables
    for (const tableName in sourceSchema) {
      if (!targetSchema[tableName]) {
        console.log(`📋 Missing table: ${tableName}`);
        
        // Get column definitions for CREATE TABLE
        const columnsResult = await sourceClient.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default,
            udt_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        const columnDefs = [];
        for (const col of columnsResult.rows) {
          let typeDef = col.data_type;
          
          // Handle specific types
          if (col.data_type === 'character varying' || col.data_type === 'varchar') {
            typeDef = col.character_maximum_length 
              ? `VARCHAR(${col.character_maximum_length})` 
              : 'VARCHAR';
          } else if (col.data_type === 'character' || col.data_type === 'char') {
            typeDef = col.character_maximum_length 
              ? `CHAR(${col.character_maximum_length})` 
              : 'CHAR';
          } else if (col.data_type === 'numeric') {
            if (col.numeric_precision && col.numeric_scale) {
              typeDef = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
            } else if (col.numeric_precision) {
              typeDef = `NUMERIC(${col.numeric_precision})`;
            } else {
              typeDef = 'NUMERIC';
            }
          } else if (col.udt_name && col.udt_name.startsWith('_')) {
            // Array types
            const baseType = col.udt_name.substring(1);
            typeDef = `${baseType}[]`;
          } else {
            typeDef = col.udt_name || col.data_type;
          }

          let colDef = `${col.column_name} ${typeDef}`;
          
          if (col.is_nullable === 'NO') {
            colDef += ' NOT NULL';
          }
          
          if (col.column_default) {
            colDef += ` DEFAULT ${col.column_default}`;
          }
          
          columnDefs.push(colDef);
        }

        const createStatement = `CREATE TABLE ${tableName} (\n  ${columnDefs.join(',\n  ')}\n);`;

        migrations.push({
          type: 'CREATE_TABLE',
          table: tableName,
          sql: createStatement
        });
        tablesAdded++;
      } else {
        // Check for missing columns
        const sourceColumns = sourceSchema[tableName].columns;
        const targetColumns = targetSchema[tableName].columns;
        const targetColumnNames = new Set(targetColumns.map(c => c.name));

        // Get full column details for missing columns
        const missingCols = sourceColumns.filter(col => !targetColumnNames.has(col.name));
        
        if (missingCols.length > 0) {
          const colDetailsResult = await sourceClient.query(`
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              numeric_precision,
              numeric_scale,
              is_nullable,
              column_default,
              udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = $1
            AND column_name = ANY($2)
            ORDER BY ordinal_position
          `, [tableName, missingCols.map(c => c.name)]);

          for (const col of colDetailsResult.rows) {
            console.log(`   📋 Missing column: ${tableName}.${col.column_name}`);
            
            let typeDef = col.data_type;
            
            // Handle specific types
            if (col.data_type === 'character varying' || col.data_type === 'varchar') {
              typeDef = col.character_maximum_length 
                ? `VARCHAR(${col.character_maximum_length})` 
                : 'VARCHAR';
            } else if (col.data_type === 'character' || col.data_type === 'char') {
              typeDef = col.character_maximum_length 
                ? `CHAR(${col.character_maximum_length})` 
                : 'CHAR';
            } else if (col.data_type === 'numeric') {
              if (col.numeric_precision && col.numeric_scale) {
                typeDef = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
              } else if (col.numeric_precision) {
                typeDef = `NUMERIC(${col.numeric_precision})`;
              } else {
                typeDef = 'NUMERIC';
              }
            } else if (col.udt_name && col.udt_name.startsWith('_')) {
              // Array types
              const baseType = col.udt_name.substring(1);
              typeDef = `${baseType}[]`;
            } else {
              typeDef = col.udt_name || col.data_type;
            }

            let alterSql = `ALTER TABLE ${tableName} ADD COLUMN ${col.column_name} ${typeDef}`;
            
            if (col.is_nullable === 'NO') {
              alterSql += ' NOT NULL';
            }
            
            if (col.column_default) {
              alterSql += ` DEFAULT ${col.column_default}`;
            } else if (col.is_nullable === 'NO') {
              // If NOT NULL and no default, make it nullable for safety
              alterSql = alterSql.replace(' NOT NULL', '');
            }
            
            alterSql += ';';
            
            migrations.push({
              type: 'ADD_COLUMN',
              table: tableName,
              column: col.column_name,
              sql: alterSql
            });
            columnsAdded++;
          }
        }
      }
    }

    // Generate migration SQL file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const migrationDir = path.join(__dirname, 'PROD BACKUP', 'schema-migrations');
    
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }

    const migrationFile = path.join(migrationDir, `schema-merge-${timestamp}.sql`);
    
    const sqlStatements = [];
    sqlStatements.push('-- ============================================');
    sqlStatements.push('-- DATABASE SCHEMA MERGE MIGRATION');
    sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
    sqlStatements.push(`-- Source: ${sourceConn.replace(/:[^:@]+@/, ':****@')}`);
    sqlStatements.push(`-- Target: ${targetConn.replace(/:[^:@]+@/, ':****@')}`);
    sqlStatements.push(`-- Tables to add: ${tablesAdded}`);
    sqlStatements.push(`-- Columns to add: ${columnsAdded}`);
    sqlStatements.push('-- ============================================\n');
    sqlStatements.push('BEGIN;\n');

    for (const migration of migrations) {
      sqlStatements.push(`-- ${migration.type}: ${migration.table}${migration.column ? '.' + migration.column : ''}`);
      sqlStatements.push(migration.sql);
      sqlStatements.push('');
    }

    sqlStatements.push('COMMIT;');
    
    fs.writeFileSync(migrationFile, sqlStatements.join('\n'), 'utf8');

    console.log('\n' + '═'.repeat(60));
    console.log('📊 SCHEMA MERGE SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Tables to add: ${tablesAdded}`);
    console.log(`Columns to add: ${columnsAdded}`);
    console.log(`Migration file: ${path.basename(migrationFile)}`);
    console.log('═'.repeat(60));

    if (!dryRun && migrations.length > 0) {
      console.log('\n⚠️  Applying migrations to target database...');
      await targetClient.query('BEGIN');
      
      for (const migration of migrations) {
        try {
          await targetClient.query(migration.sql);
          console.log(`   ✅ ${migration.type}: ${migration.table}${migration.column ? '.' + migration.column : ''}`);
        } catch (error) {
          console.log(`   ❌ Error: ${migration.table}${migration.column ? '.' + migration.column : ''} - ${error.message}`);
        }
      }
      
      await targetClient.query('COMMIT');
      console.log('\n✅ Schema merge completed!');
    } else if (migrations.length > 0) {
      console.log('\n💡 This was a DRY RUN. No changes were made.');
      console.log(`   Review the migration file: ${migrationFile}`);
      console.log('   Run again and choose "Apply Migration" to execute.');
    } else {
      console.log('\n✅ Schemas are already in sync! No migrations needed.');
    }

    await sourceClient.end();
    await targetClient.end();
    
    return { 
      success: true, 
      tablesAdded, 
      columnsAdded, 
      migrations: migrations.length,
      migrationFile 
    };
  } catch (error) {
    await sourceClient.end().catch(() => {});
    await targetClient.end().catch(() => {});
    return { success: false, error: error.message };
  }
}

// Merge schema menu
async function mergeSchemaMenu() {
  const connections = loadConnections();
  
  if (connections.length < 2) {
    console.log('\n⚠️  You need at least 2 saved connections to merge schemas.');
    console.log('   Please add connections in "Manage Connection Strings" first.');
    await question('Press Enter to continue...');
    return 'back';
  }

  // Select source database
  const sourceOptions = [
    ...connections.map((conn, index) => ({
      label: `${conn.name} (${conn.connectionString.replace(/:[^:@]+@/, ':****@')})`,
      connectionString: conn.connectionString
    })),
    { label: 'Enter New Connection String', connectionString: null }
  ];

  console.log('\n📥 Select SOURCE database (schema to copy FROM):');
  const sourceChoice = await showMenu('Source Database', sourceOptions.map(o => ({ label: o.label })));
  
  let sourceConn;
  if (sourceChoice === connections.length) {
    sourceConn = await question('Enter source database connection string: ');
    const test = await testConnection(sourceConn);
    if (!test.success) {
      console.log(`\n❌ Connection failed: ${test.error}`);
      await question('Press Enter to continue...');
      return 'back';
    }
    console.log('✅ Source connection successful!');
  } else {
    sourceConn = sourceOptions[sourceChoice].connectionString;
  }

  // Select target database
  const targetOptions = [
    ...connections.map((conn, index) => ({
      label: `${conn.name} (${conn.connectionString.replace(/:[^:@]+@/, ':****@')})`,
      connectionString: conn.connectionString
    })),
    { label: 'Enter New Connection String', connectionString: null }
  ];

  console.log('\n📤 Select TARGET database (schema to merge TO):');
  const targetChoice = await showMenu('Target Database', targetOptions.map(o => ({ label: o.label })));
  
  let targetConn;
  if (targetChoice === connections.length) {
    targetConn = await question('Enter target database connection string: ');
    const test = await testConnection(targetConn);
    if (!test.success) {
      console.log(`\n❌ Connection failed: ${test.error}`);
      await question('Press Enter to continue...');
      return 'back';
    }
    console.log('✅ Target connection successful!');
  } else {
    targetConn = targetOptions[targetChoice].connectionString;
  }

  if (sourceConn === targetConn) {
    console.log('\n❌ Source and target cannot be the same database!');
    await question('Press Enter to continue...');
    return 'back';
  }

  // Choose action
  const actionChoice = await showMenu('Merge Options', [
    { label: 'Dry Run (Generate migration file only)' },
    { label: 'Apply Migration (Execute changes)' },
    { label: 'Cancel' }
  ]);

  if (actionChoice === 2) {
    return 'back';
  }

  const dryRun = actionChoice === 0;

  if (!dryRun) {
    console.log('\n⚠️  WARNING: This will modify the target database schema!');
    const confirm = await question('Are you sure you want to continue? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Merge cancelled.');
      await question('Press Enter to continue...');
      return 'back';
    }
  }

  const result = await mergeDatabaseSchema(sourceConn, targetConn, dryRun);
  
  if (result.success) {
    if (result.migrations === 0) {
      console.log('\n✅ Schemas are already in sync!');
    } else {
      console.log(`\n✅ Schema merge ${dryRun ? 'analysis' : 'completed'} successfully!`);
    }
  } else {
    console.log(`\n❌ Schema merge failed: ${result.error}`);
  }
  
  await question('Press Enter to continue...');
  return 'back';
}

// Main menu
async function mainMenu() {
  console.log('\n' + colorize('╔════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║     DATABASE BACKUP & RESTORE MANAGER                  ║', 'bright'));
  console.log(colorize('╚════════════════════════════════════════════════════════╝', 'cyan'));

  const choice = await showMenu('Main Menu', [
    { label: 'Backup Database', action: 'backup' },
    { label: 'Restore Database', action: 'restore' },
    { label: 'Merge Database Schema', action: 'merge' },
    { label: 'Manage Connection Strings', action: 'manage' },
    { label: 'Exit', action: 'exit' }
  ]);

  const options = ['backup', 'restore', 'merge', 'manage', 'exit'];
  return options[choice];
}

// Backup menu
async function backupMenu() {
  const connections = loadConnections();
  
  // First, ask for backup type
  const backupTypeChoice = await showMenu('Select Backup Type', [
    { label: 'Full Backup (Data + Schema - separate files per table)' },
    { label: 'Data Only (Single JSON + SQL file with all data)' },
    { label: 'Schema Only (Single SQL file with CREATE TABLE statements)' },
    { label: 'Back to Main Menu' }
  ]);

  if (backupTypeChoice === 3) {
    return 'back';
  }

  const backupTypes = ['full', 'data', 'schema'];
  const backupType = backupTypes[backupTypeChoice];
  const typeLabels = ['Full Backup', 'Data Only', 'Schema Only'];
  console.log(`\n📦 Selected: ${typeLabels[backupTypeChoice]}\n`);
  
  const options = [
    ...connections.map((conn, index) => ({
      label: `${conn.name} (${conn.connectionString.replace(/:[^:@]+@/, ':****@')})`,
      connectionString: conn.connectionString
    })),
    { label: 'Enter New Connection String', connectionString: null },
    { label: 'Back to Main Menu', connectionString: 'back' }
  ];

  const choice = await showMenu('Select Database to Backup', options.map(o => ({ label: o.label })));
  
  if (choice === options.length - 1) {
    return 'back';
  }
  
  if (choice === options.length - 2) {
    // New connection string
    const name = await question('Enter a name for this connection: ');
    const connectionString = await question('Enter database connection string: ');
    
    const test = await testConnection(connectionString);
    if (!test.success) {
      console.log(`\n❌ Connection failed: ${test.error}`);
      await question('Press Enter to continue...');
      return 'back';
    }
    
    console.log('\n✅ Connection successful!');
    connections.push({ name, connectionString });
    saveConnections(connections);
    
    const backupName = await question('Enter backup name (or press Enter for default): ');
    const result = await backupDatabase(connectionString, backupName || undefined, backupType);
    
    if (result.success) {
      console.log('\n✅ Backup completed successfully!');
    } else {
      console.log(`\n❌ Backup failed: ${result.error}`);
    }
  } else {
    // Use saved connection
    const connectionString = options[choice].connectionString;
    const backupName = await question('Enter backup name (or press Enter for default): ');
    const result = await backupDatabase(connectionString, backupName || undefined, backupType);
    
    if (result.success) {
      console.log('\n✅ Backup completed successfully!');
    } else {
      console.log(`\n❌ Backup failed: ${result.error}`);
    }
  }
  
  await question('\nPress Enter to continue...');
  return 'back';
}

// Restore menu
async function restoreMenu() {
  const backupBaseDir = path.join(__dirname, 'PROD BACKUP');
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupBaseDir)) {
    fs.mkdirSync(backupBaseDir, { recursive: true });
  }

  // Get all backup folders (exclude schema-migrations)
  let backups = [];
  try {
    backups = fs.readdirSync(backupBaseDir)
      .filter(item => {
        // Skip schema-migrations folder and hidden files
        if (item === 'schema-migrations' || item.startsWith('.')) {
          return false;
        }
        const itemPath = path.join(backupBaseDir, item);
        return fs.statSync(itemPath).isDirectory();
      })
      .map(item => ({
        label: item,
        path: path.join(backupBaseDir, item)
      }));
  } catch (error) {
    console.log(`\n❌ Error reading backup directory: ${error.message}`);
    await question('Press Enter to continue...');
    return 'back';
  }

  if (backups.length === 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('📦 NO BACKUPS FOUND');
    console.log('═'.repeat(60));
    console.log('\n💡 You need to create a backup first!');
    console.log('\n📁 Backup location:');
    console.log(`   ${backupBaseDir}`);
    console.log('\n📋 To create a backup:');
    console.log('   1. Go to Main Menu');
    console.log('   2. Select "Backup Database"');
    console.log('   3. Choose your database');
    console.log('   4. Enter a backup name (optional)');
    console.log('\n💾 Your backups will be stored in:');
    console.log(`   PROD BACKUP/[backup-name]/`);
    console.log('═'.repeat(60));
    await question('\nPress Enter to continue...');
    return 'back';
  }

  const options = [
    ...backups.map(b => ({ label: b.label })),
    { label: 'Back to Main Menu' }
  ];

  const choice = await showMenu('Select Backup to Restore', options);
  
  if (choice === backups.length) {
    return 'back';
  }

  const selectedBackup = backups[choice];
  
  // Get connection string
  const connections = loadConnections();
  const connOptions = [
    ...connections.map(conn => ({
      label: `${conn.name} (${conn.connectionString.replace(/:[^:@]+@/, ':****@')})`,
      connectionString: conn.connectionString
    })),
    { label: 'Enter New Connection String', connectionString: null }
  ];

  const connChoice = await showMenu('Select Target Database', connOptions.map(o => ({ label: o.label })));
  
  let connectionString;
  if (connChoice === connOptions.length - 1) {
    connectionString = await question('Enter database connection string: ');
    const test = await testConnection(connectionString);
    if (!test.success) {
      console.log(`\n❌ Connection failed: ${test.error}`);
      await question('Press Enter to continue...');
      return 'back';
    }
    console.log('\n✅ Connection successful!');
  } else {
    connectionString = connOptions[connChoice].connectionString;
  }

  console.log('\n⚠️  WARNING: This will restore data to the selected database!');
  const confirm = await question('Are you sure you want to continue? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Restore cancelled.');
    await question('Press Enter to continue...');
    return 'back';
  }

  const result = await restoreDatabase(connectionString, selectedBackup.path);
  
  if (result.success) {
    console.log('\n✅ Restore completed successfully!');
  } else {
    console.log(`\n❌ Restore failed: ${result.error}`);
  }
  
  await question('Press Enter to continue...');
  return 'back';
}

// Manage connections menu
async function manageConnectionsMenu() {
  const connections = loadConnections();
  
  while (true) {
    const options = [
      ...connections.map((conn, index) => ({
        label: `${index + 1}. ${conn.name} - ${conn.connectionString.replace(/:[^:@]+@/, ':****@')}`
      })),
      { label: 'Add New Connection' },
      { label: 'Test Connection' },
      { label: 'Delete Connection' },
      { label: 'Back to Main Menu' }
    ];

    const choice = await showMenu('Manage Connection Strings', options);
    
    if (choice === connections.length) {
      // Add new
      const name = await question('Enter a name for this connection: ');
      const connectionString = await question('Enter database connection string: ');
      
      const test = await testConnection(connectionString);
      if (!test.success) {
        console.log(`\n❌ Connection failed: ${test.error}`);
      } else {
        console.log('\n✅ Connection successful!');
        connections.push({ name, connectionString });
        saveConnections(connections);
        console.log('✅ Connection saved!');
      }
    } else if (choice === connections.length + 1) {
      // Test
      if (connections.length === 0) {
        console.log('\n❌ No connections to test!');
        await question('Press Enter to continue...');
        continue;
      }
      
      const testOptions = connections.map((conn, index) => ({
        label: `${index + 1}. ${conn.name}`
      }));
      
      const testChoice = await showMenu('Select Connection to Test', testOptions);
      const connectionString = connections[testChoice].connectionString;
      
      console.log('\n🔍 Testing connection...');
      const test = await testConnection(connectionString);
      
      if (test.success) {
        console.log('✅ Connection successful!');
        console.log(`Database: ${test.version}`);
      } else {
        console.log(`❌ Connection failed: ${test.error}`);
      }
    } else if (choice === connections.length + 2) {
      // Delete
      if (connections.length === 0) {
        console.log('\n❌ No connections to delete!');
        await question('Press Enter to continue...');
        continue;
      }
      
      const deleteOptions = connections.map((conn, index) => ({
        label: `${index + 1}. ${conn.name}`
      }));
      
      const deleteChoice = await showMenu('Select Connection to Delete', deleteOptions);
      const deleted = connections.splice(deleteChoice, 1)[0];
      saveConnections(connections);
      console.log(`\n✅ Deleted: ${deleted.name}`);
    } else {
      // Back to main
      return 'back';
    }
    
    await question('\nPress Enter to continue...');
  }
}

// Main loop
async function main() {
  while (true) {
    const action = await mainMenu();
    
    if (action === 'backup') {
      const result = await backupMenu();
      if (result === 'back') continue;
    } else if (action === 'restore') {
      const result = await restoreMenu();
      if (result === 'back') continue;
    } else if (action === 'merge') {
      const result = await mergeSchemaMenu();
      if (result === 'back') continue;
    } else if (action === 'manage') {
      await manageConnectionsMenu();
    } else if (action === 'exit') {
      console.log(colorize('\n👋 Goodbye!', 'cyan'));
      rl.close();
      process.exit(0);
    }
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(colorize('\n\n👋 Goodbye!', 'cyan'));
  rl.close();
  process.exit(0);
});

// Start
main().catch(error => {
  console.error('\n❌ Fatal Error:', error);
  rl.close();
  process.exit(1);
});

