import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Production Supabase Database
const PROD_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';
const PROD_DB_ALT = 'postgresql://postgres:%40SMASIKA1010@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres';

// Development Database (to be replaced)
const DEV_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const DEV_DB_HOST = 'ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech';
const DEV_DB_USER = 'neondb_owner';
const DEV_DB_PASS = 'npg_dMyv1cG4KSOR';

// Supabase Configuration
const SUPABASE_URL = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

function replaceInFile(filePath, replacements) {
  if (!existsSync(filePath)) {
    return { updated: false, reason: 'File not found' };
  }

  try {
    let content = readFileSync(filePath, 'utf-8');
    let changed = false;
    const changes = [];

    for (const [oldValue, newValue] of replacements) {
      if (content.includes(oldValue)) {
        content = content.replace(new RegExp(oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newValue);
        changed = true;
        changes.push(`Replaced: ${oldValue.substring(0, 50)}...`);
      }
    }

    if (changed) {
      // Backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      writeFileSync(backupPath, readFileSync(filePath, 'utf-8'));
      
      writeFileSync(filePath, content);
      return { updated: true, changes, backup: backupPath };
    }

    return { updated: false, reason: 'No matches found' };
  } catch (error) {
    return { updated: false, reason: error.message };
  }
}

async function switchToSupabaseProduction() {
  console.log('🔄 Switching All Database Connections to Supabase Production\n');
  console.log('='.repeat(60));
  console.log('📊 Target Database: Supabase Production');
  console.log(`   ${PROD_DB.substring(0, 60)}...\n`);

  const replacements = [
    // Full connection strings
    [DEV_DB, PROD_DB],
    ['postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb', PROD_DB],
    
    // Individual components (for partial matches)
    [DEV_DB_HOST, 'aws-0-eu-north-1.pooler.supabase.com'],
    [DEV_DB_USER, 'postgres.jxhzveborezjhsmzsgbc'],
    [DEV_DB_PASS, '%40SMASIKA1010'],
    ['neondb', 'postgres'],
  ];

  // Files to update
  const filesToUpdate = [
    '.env.production',
    'netlify.toml',
    'server/src/config/database.ts',
    'server/src/db/connection.ts',
    'src/lib/supabaseClient.ts',
    'src/lib/supabaseClient.js',
    'public/config/database.php',
    'netlify/functions/whatsapp-webhook.js',
    'server/api.mjs',
  ];

  console.log('📝 Updating configuration files...\n');
  
  let updatedCount = 0;
  let skippedCount = 0;

  for (const file of filesToUpdate) {
    const filePath = join(__dirname, file);
    console.log(`   Checking ${file}...`);
    
    const result = replaceInFile(filePath, replacements);
    
    if (result.updated) {
      console.log(`      ✅ Updated (${result.changes.length} changes)`);
      if (result.backup) {
        console.log(`         💾 Backup: ${result.backup.split('/').pop()}`);
      }
      updatedCount++;
    } else {
      console.log(`      ⏭️  ${result.reason}`);
      skippedCount++;
    }
  }

  // Update netlify.toml specifically for all contexts
  console.log('\n📝 Updating netlify.toml contexts...');
  const netlifyPath = join(__dirname, 'netlify.toml');
  if (existsSync(netlifyPath)) {
    let content = readFileSync(netlifyPath, 'utf-8');
    let netlifyChanged = false;

    // Replace in all contexts
    const contexts = [
      '[build.environment]',
      '[context.production.environment]',
      '[context.deploy-preview.environment]',
      '[context.branch-deploy.environment]'
    ];

    for (const context of contexts) {
      const contextRegex = new RegExp(`(${context.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=\\[|$)`, 'g');
      content = content.replace(contextRegex, (match) => {
        if (match.includes(DEV_DB) || match.includes(DEV_DB_HOST)) {
          netlifyChanged = true;
          return match
            .replace(new RegExp(DEV_DB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), PROD_DB)
            .replace(new RegExp(DEV_DB_HOST.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'aws-0-eu-north-1.pooler.supabase.com')
            .replace(/neondb_owner/g, 'postgres.jxhzveborezjhsmzsgbc')
            .replace(/npg_dMyv1cG4KSOR/g, '%40SMASIKA1010')
            .replace(/neondb/g, 'postgres');
        }
        return match;
      });
    }

    // Add Supabase config if missing
    if (!content.includes('VITE_SUPABASE_URL')) {
      content = content.replace(
        /(VITE_DATABASE_URL = "[^"]+")/g,
        `$1\n  VITE_SUPABASE_URL = "${SUPABASE_URL}"\n  VITE_SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}"`
      );
      netlifyChanged = true;
    }

    if (netlifyChanged) {
      const backupPath = `${netlifyPath}.backup.${Date.now()}`;
      writeFileSync(backupPath, readFileSync(netlifyPath, 'utf-8'));
      writeFileSync(netlifyPath, content);
      console.log(`      ✅ Updated netlify.toml`);
      updatedCount++;
    } else {
      console.log(`      ⏭️  Already updated`);
    }
  }

  // Update .env.production
  console.log('\n📝 Updating .env.production...');
  const envProdPath = join(__dirname, '.env.production');
  const envProdContent = `# Production Environment Configuration
NODE_ENV=production
VITE_APP_ENV=production

# Production Supabase Database
VITE_DATABASE_URL=${PROD_DB}
DATABASE_URL=${PROD_DB}

# Supabase Configuration
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
`;
  
  if (existsSync(envProdPath)) {
    const backupPath = `${envProdPath}.backup.${Date.now()}`;
    writeFileSync(backupPath, readFileSync(envProdPath, 'utf-8'));
  }
  writeFileSync(envProdPath, envProdContent);
  console.log(`   ✅ Updated .env.production`);

  // Update dist folder
  console.log('\n📝 Updating dist folder...');
  const distEnvPath = join(__dirname, 'dist', '.env');
  const distConfigPath = join(__dirname, 'dist', 'config.js');
  
  if (existsSync(join(__dirname, 'dist'))) {
    const distEnvContent = `# Production Environment - Auto-generated
VITE_DATABASE_URL=${PROD_DB}
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
`;
    
    writeFileSync(distEnvPath, distEnvContent);
    console.log(`   ✅ Updated dist/.env`);

    const distConfigContent = `// Production Database Configuration
// This file is loaded at runtime
window.__ENV__ = {
  VITE_DATABASE_URL: '${PROD_DB}',
  VITE_SUPABASE_URL: '${SUPABASE_URL}',
  VITE_SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}'
};
`;
    
    writeFileSync(distConfigPath, distConfigContent);
    console.log(`   ✅ Updated dist/config.js`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SWITCH SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Files updated: ${updatedCount}`);
  console.log(`⏭️  Files skipped: ${skippedCount}`);
  console.log(`✅ .env.production: Updated`);
  console.log(`✅ dist folder: Updated`);
  console.log('='.repeat(60));
  console.log('\n💡 Next steps:');
  console.log('   1. Run: npm run build:prod');
  console.log('   2. Deploy dist/ folder');
  console.log('   3. All connections will use Supabase production database');
  console.log('\n🎉 All database connections switched to Supabase!');
}

switchToSupabaseProduction().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
