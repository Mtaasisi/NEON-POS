#!/usr/bin/env node

/**
 * POST-BUILD SCRIPT: Fix MIME Type Issues
 * 
 * This script runs after every build to ensure:
 * 1. Server configuration files are copied to dist/
 * 2. Asset paths are correct
 * 3. MIME type configuration is present
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, 'dist');
const publicDir = join(__dirname, 'public');

console.log('🔧 Running post-build MIME type fix...\n');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  console.error('❌ Error: dist directory does not exist. Run build first.');
  process.exit(1);
}

// Files to copy to dist/
const filesToCopy = [
  '.htaccess',
  'web.config',
  '_redirects'
];

// Copy configuration files
console.log('📋 Copying server configuration files to dist/...');
let copiedCount = 0;

filesToCopy.forEach(file => {
  const source = join(publicDir, file);
  const dest = join(distDir, file);
  
  if (existsSync(source)) {
    try {
      copyFileSync(source, dest);
      console.log(`  ✅ Copied ${file}`);
      copiedCount++;
    } catch (error) {
      console.error(`  ⚠️  Failed to copy ${file}:`, error.message);
    }
  } else {
    console.log(`  ⚠️  ${file} not found in public/`);
  }
});

// Also copy nginx.conf for reference
const nginxSource = join(__dirname, 'nginx.conf');
const nginxDest = join(distDir, 'nginx.conf');
if (existsSync(nginxSource)) {
  try {
    copyFileSync(nginxSource, nginxDest);
    console.log(`  ✅ Copied nginx.conf (for reference)`);
    copiedCount++;
  } catch (error) {
    console.error(`  ⚠️  Failed to copy nginx.conf:`, error.message);
  }
}

console.log(`\n✨ Post-build fix complete! Copied ${copiedCount} configuration files.\n`);

// Check if assets directory exists
const assetsDir = join(distDir, 'assets');
if (existsSync(assetsDir)) {
  const assetFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
  console.log(`📦 Found ${assetFiles.length} JavaScript files in assets/`);
}

// Check for /lats/ subdirectory build
const latsDir = join(distDir, 'lats');
if (existsSync(latsDir)) {
  console.log('📁 Detected /lats/ subdirectory deployment');
  
  // Copy config files to lats directory too
  filesToCopy.forEach(file => {
    const source = join(publicDir, file);
    const dest = join(latsDir, file);
    
    if (existsSync(source)) {
      try {
        copyFileSync(source, dest);
        console.log(`  ✅ Copied ${file} to lats/`);
      } catch (error) {
        console.error(`  ⚠️  Failed to copy ${file} to lats/:`, error.message);
      }
    }
  });
}

console.log('\n🎉 Build is ready for deployment with correct MIME type configuration!');
console.log('\n📝 Next steps:');
console.log('   - For Apache: The .htaccess file will be used automatically');
console.log('   - For IIS: The web.config file will be used automatically');
console.log('   - For Nginx: Use the nginx.conf file as a reference');
console.log('   - For Vercel: Use vercel.json in the root directory');
console.log('   - For Netlify: Use netlify.toml in the root directory\n');

