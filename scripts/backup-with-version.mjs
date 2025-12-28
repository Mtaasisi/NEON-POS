#!/usr/bin/env node

/**
 * Automated Backup Script with Changelog Updates
 * Creates backups and automatically increments version numbers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting automated backup with version increment...\n');

// Read current version.json
function readVersionFile() {
  const versionPath = path.join(rootDir, 'version.json');
  try {
    const data = fs.readFileSync(versionPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading version.json:', error.message);
    return null;
  }
}

// Write version.json
function writeVersionFile(data) {
  const versionPath = path.join(rootDir, 'version.json');
  try {
    fs.writeFileSync(versionPath, JSON.stringify(data, null, 2));
    console.log('✅ version.json updated successfully');
  } catch (error) {
    console.error('❌ Error writing version.json:', error.message);
  }
}

// Increment version number
function incrementVersion(version) {
  const parts = version.split('.');
  const patch = parseInt(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// Create backup entry
function createBackupEntry(version, description = 'Automated backup') {
  return {
    version,
    date: getCurrentDate(),
    type: 'maintenance',
    description
  };
}

// Main backup function
async function createBackup() {
  console.log('📖 Reading current version information...');
  const versionData = readVersionFile();

  if (!versionData) {
    console.error('❌ Failed to read version data. Aborting backup.');
    process.exit(1);
  }

  const currentVersion = versionData.version;
  const newVersion = incrementVersion(currentVersion);

  console.log(`📈 Incrementing version: ${currentVersion} → ${newVersion}`);

  // Create new changelog entry
  const backupEntry = createBackupEntry(newVersion, 'Automated version increment after backup');
  versionData.changelog.unshift(backupEntry);

  // Update version and last updated date
  versionData.version = newVersion;
  versionData.lastUpdated = getCurrentDate();
  versionData.system.lastBackup = getCurrentDate();

  // Write updated version file
  writeVersionFile(versionData);

  // Create database backup (placeholder - you can integrate with your actual backup script)
  console.log('💾 Creating database backup...');
  try {
    // Import and run your existing backup script
    const { execSync } = await import('child_process');
    execSync('node backup-full-database.mjs', { stdio: 'inherit' });
    console.log('✅ Database backup completed');
  } catch (error) {
    console.warn('⚠️  Database backup failed, but version was updated:', error.message);
  }

  // Create code backup
  console.log('📦 Creating code backup...');
  const backupDir = path.join(rootDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-v${newVersion}-${timestamp}`;

  try {
    const { execSync } = await import('child_process');
    execSync(`tar -czf "${path.join(backupDir, backupName + '.tar.gz')}" --exclude=node_modules --exclude=.git --exclude=backups .`, { stdio: 'inherit' });
    console.log(`✅ Code backup created: ${backupName}.tar.gz`);
  } catch (error) {
    console.warn('⚠️  Code backup failed:', error.message);
  }

  console.log('\n🎉 Backup process completed!');
  console.log(`📋 New version: ${newVersion}`);
  console.log(`📅 Updated on: ${getCurrentDate()}`);
  console.log('\n📝 Changelog entry added:');
  console.log(`   ${backupEntry.description}`);
}

// Run the backup
createBackup().catch(error => {
  console.error('❌ Backup failed:', error);
  process.exit(1);
});
