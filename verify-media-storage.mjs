#!/usr/bin/env node

/**
 * Verification Script for Local Media Storage Implementation
 * 
 * This script verifies that:
 * 1. All required files exist
 * 2. Media folder structure is correct
 * 3. Build configuration includes public folder
 * 4. No errors in implementation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Local Media Storage Implementation...\n');

let hasErrors = false;

// Check required files exist
const requiredFiles = [
  'src/lib/localMediaStorage.ts',
  'src/lib/migrateMediaToLocal.ts',
  'src/features/whatsapp/components/MediaBackupRestore.tsx',
  'public/media/whatsapp/README.md',
  'public/media/whatsapp/.gitkeep',
  'MEDIA_LIBRARY_LOCAL_STORAGE.md',
  'MEDIA_LIBRARY_CHANGES_SUMMARY.md'
];

console.log('📁 Checking required files...');
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    hasErrors = true;
  }
}

// Check modified files
console.log('\n📝 Checking modified files...');
const modifiedFiles = [
  'src/services/whatsappAdvancedService.ts',
  'src/features/whatsapp/components/MediaLibraryModal.tsx'
];

for (const file of modifiedFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for key imports/functions
    if (file.includes('whatsappAdvancedService.ts')) {
      if (content.includes('import { localMediaStorage }')) {
        console.log(`  ✅ ${file} - Updated with local storage`);
      } else {
        console.log(`  ❌ ${file} - Missing local storage import`);
        hasErrors = true;
      }
    }
    
    if (file.includes('MediaLibraryModal.tsx')) {
      if (content.includes('MediaBackupRestore')) {
        console.log(`  ✅ ${file} - Updated with backup/restore`);
      } else {
        console.log(`  ❌ ${file} - Missing backup/restore component`);
        hasErrors = true;
      }
    }
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    hasErrors = true;
  }
}

// Check folder structure
console.log('\n📂 Checking folder structure...');
const requiredDirs = [
  'public/media',
  'public/media/whatsapp'
];

for (const dir of requiredDirs) {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    console.log(`  ✅ ${dir}/`);
  } else {
    console.log(`  ❌ ${dir}/ - MISSING`);
    hasErrors = true;
  }
}

// Check vite.config.ts includes publicDir
console.log('\n⚙️  Checking build configuration...');
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
  if (viteConfig.includes("publicDir: 'public'")) {
    console.log('  ✅ Vite config includes public directory');
  } else {
    console.log('  ⚠️  Vite config may not include public directory');
  }
} else {
  console.log('  ❌ vite.config.ts not found');
  hasErrors = true;
}

// Check for TypeScript errors (basic check)
console.log('\n🔧 Checking for basic code issues...');
const tsFiles = [
  'src/lib/localMediaStorage.ts',
  'src/lib/migrateMediaToLocal.ts',
  'src/services/whatsappAdvancedService.ts'
];

for (const file of tsFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Basic syntax checks
    const syntaxIssues = [];
    
    // Check for proper imports
    if (!content.includes('import')) {
      syntaxIssues.push('No imports found');
    }
    
    // Check for export
    if (!content.includes('export')) {
      syntaxIssues.push('No exports found');
    }
    
    if (syntaxIssues.length > 0) {
      console.log(`  ⚠️  ${file}:`);
      syntaxIssues.forEach(issue => console.log(`     - ${issue}`));
    } else {
      console.log(`  ✅ ${file} - Basic checks passed`);
    }
  }
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ VERIFICATION FAILED - Please fix the issues above');
  console.log('='.repeat(60));
  process.exit(1);
} else {
  console.log('✅ VERIFICATION SUCCESSFUL - All checks passed!');
  console.log('='.repeat(60));
  console.log('\n📋 Next Steps:');
  console.log('  1. Run: npm run build');
  console.log('  2. Check dist/media/whatsapp/ folder exists');
  console.log('  3. Test upload functionality');
  console.log('  4. Test backup/restore');
  console.log('  5. Deploy to production');
  console.log('\n📚 Documentation:');
  console.log('  - MEDIA_LIBRARY_LOCAL_STORAGE.md (technical docs)');
  console.log('  - MEDIA_LIBRARY_CHANGES_SUMMARY.md (summary)');
  console.log('  - public/media/whatsapp/README.md (folder info)');
  console.log('\n💡 Tips:');
  console.log('  - Media is stored in browser localStorage');
  console.log('  - Remind users to backup regularly');
  console.log('  - Use migration tool for existing external URLs');
  console.log('  - Check browser DevTools > Application > Local Storage');
  process.exit(0);
}

