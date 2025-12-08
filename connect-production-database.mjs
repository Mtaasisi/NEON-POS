import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Production Supabase Database Configuration
const PROD_DB_CONFIG = {
  connectionString: 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres',
  supabaseUrl: 'https://jxhzveborezjhsmzsgbc.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw'
};

function updateEnvProduction() {
  const envProdPath = join(__dirname, '.env.production');
  
  console.log('📝 Updating .env.production...');
  
  // Backup if exists
  if (existsSync(envProdPath)) {
    const backupPath = `${envProdPath}.backup.${Date.now()}`;
    writeFileSync(backupPath, readFileSync(envProdPath, 'utf-8'));
    console.log(`   💾 Backed up to ${backupPath}`);
  }
  
  const content = `# Production Environment Configuration
NODE_ENV=production
VITE_APP_ENV=production

# Production Supabase Database
VITE_DATABASE_URL=${PROD_DB_CONFIG.connectionString}
DATABASE_URL=${PROD_DB_CONFIG.connectionString}

# Supabase Configuration
VITE_SUPABASE_URL=${PROD_DB_CONFIG.supabaseUrl}
VITE_SUPABASE_ANON_KEY=${PROD_DB_CONFIG.supabaseAnonKey}
SUPABASE_URL=${PROD_DB_CONFIG.supabaseUrl}
SUPABASE_ANON_KEY=${PROD_DB_CONFIG.supabaseAnonKey}
`;
  
  writeFileSync(envProdPath, content);
  console.log('   ✅ Updated .env.production');
}

function updateNetlifyToml() {
  const netlifyPath = join(__dirname, 'netlify.toml');
  
  if (!existsSync(netlifyPath)) {
    console.log('   ⚠️  netlify.toml not found, skipping...');
    return;
  }
  
  console.log('📝 Updating netlify.toml...');
  
  let content = readFileSync(netlifyPath, 'utf-8');
  
  // Update production environment
  content = content.replace(
    /\[context\.production\.environment\][\s\S]*?(?=\[|$)/,
    `[context.production.environment]
  NODE_ENV = "production"
  VITE_APP_ENV = "production"
  VITE_DATABASE_URL = "${PROD_DB_CONFIG.connectionString}"
  DATABASE_URL = "${PROD_DB_CONFIG.connectionString}"
  VITE_SUPABASE_URL = "${PROD_DB_CONFIG.supabaseUrl}"
  VITE_SUPABASE_ANON_KEY = "${PROD_DB_CONFIG.supabaseAnonKey}"
  SUPABASE_URL = "${PROD_DB_CONFIG.supabaseUrl}"
  SUPABASE_ANON_KEY = "${PROD_DB_CONFIG.supabaseAnonKey}"
`
  );
  
  // Update build environment
  content = content.replace(
    /\[build\.environment\][\s\S]*?(?=\[|$)/,
    `[build.environment]
  NODE_VERSION = "18"
  NODE_ENV = "production"
  VITE_APP_ENV = "production"
  VITE_DATABASE_URL = "${PROD_DB_CONFIG.connectionString}"
  DATABASE_URL = "${PROD_DB_CONFIG.connectionString}"
  VITE_SUPABASE_URL = "${PROD_DB_CONFIG.supabaseUrl}"
  VITE_SUPABASE_ANON_KEY = "${PROD_DB_CONFIG.supabaseAnonKey}"
`
  );
  
  writeFileSync(netlifyPath, content);
  console.log('   ✅ Updated netlify.toml');
}

function updateServerConfig() {
  const serverDbPath = join(__dirname, 'server', 'src', 'config', 'database.ts');
  
  if (!existsSync(serverDbPath)) {
    console.log('   ⚠️  server/src/config/database.ts not found, skipping...');
    return;
  }
  
  console.log('📝 Updating server database config...');
  
  let content = readFileSync(serverDbPath, 'utf-8');
  
  // Update default database URL
  content = content.replace(
    /const databaseUrl = process\.env\.DATABASE_URL \|\| '[^']*';/,
    `const databaseUrl = process.env.DATABASE_URL || '${PROD_DB_CONFIG.connectionString}';`
  );
  
  writeFileSync(serverDbPath, content);
  console.log('   ✅ Updated server database config');
}

function updateServerConnection() {
  const serverConnPath = join(__dirname, 'server', 'src', 'db', 'connection.ts');
  
  if (!existsSync(serverConnPath)) {
    console.log('   ⚠️  server/src/db/connection.ts not found, skipping...');
    return;
  }
  
  console.log('📝 Updating server connection...');
  
  let content = readFileSync(serverConnPath, 'utf-8');
  
  // Update default database URL
  content = content.replace(
    /const databaseUrl = process\.env\.DATABASE_URL \|\| '[^']*';/,
    `const databaseUrl = process.env.DATABASE_URL || '${PROD_DB_CONFIG.connectionString}';`
  );
  
  writeFileSync(serverConnPath, content);
  console.log('   ✅ Updated server connection');
}

function updateSupabaseClient() {
  const supabaseClientPath = join(__dirname, 'src', 'lib', 'supabaseClient.ts');
  
  if (!existsSync(supabaseClientPath)) {
    console.log('   ⚠️  src/lib/supabaseClient.ts not found, skipping...');
    return;
  }
  
  console.log('📝 Updating Supabase client...');
  
  let content = readFileSync(supabaseClientPath, 'utf-8');
  
  // Update Supabase URL default
  content = content.replace(
    /const SUPABASE_URL_ENV = import\.meta\.env\.VITE_SUPABASE_URL \|\| '[^']*';/,
    `const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL || '${PROD_DB_CONFIG.supabaseUrl}';`
  );
  
  // Update default database URL fallback
  content = content.replace(
    /DATABASE_URL = 'postgresql:\/\/[^']*';/,
    `DATABASE_URL = '${PROD_DB_CONFIG.connectionString}';`
  );
  
  writeFileSync(supabaseClientPath, content);
  console.log('   ✅ Updated Supabase client');
}

function createDistConfig() {
  const distPath = join(__dirname, 'dist');
  
  if (!existsSync(distPath)) {
    console.log('   ⚠️  dist folder not found, will be created on build');
    return;
  }
  
  console.log('📝 Creating dist/.env file...');
  
  const distEnvPath = join(distPath, '.env');
  const distEnvContent = `# Production Environment - Auto-generated
VITE_DATABASE_URL=${PROD_DB_CONFIG.connectionString}
VITE_SUPABASE_URL=${PROD_DB_CONFIG.supabaseUrl}
VITE_SUPABASE_ANON_KEY=${PROD_DB_CONFIG.supabaseAnonKey}
`;
  
  writeFileSync(distEnvPath, distEnvContent);
  console.log('   ✅ Created dist/.env');
  
  // Also create a config.js file for runtime config
  const configJsPath = join(distPath, 'config.js');
  const configJsContent = `// Production Database Configuration
// This file is loaded at runtime
window.__ENV__ = {
  VITE_DATABASE_URL: '${PROD_DB_CONFIG.connectionString}',
  VITE_SUPABASE_URL: '${PROD_DB_CONFIG.supabaseUrl}',
  VITE_SUPABASE_ANON_KEY: '${PROD_DB_CONFIG.supabaseAnonKey}'
};
`;
  
  writeFileSync(configJsPath, configJsContent);
  console.log('   ✅ Created dist/config.js');
}

async function main() {
  console.log('🔧 Connecting Production Database to Dist Folder\n');
  console.log('='.repeat(60));
  console.log('📊 Production Database:');
  console.log(`   URL: ${PROD_DB_CONFIG.connectionString.substring(0, 60)}...`);
  console.log(`   Supabase: ${PROD_DB_CONFIG.supabaseUrl}\n`);
  
  // Update all configuration files
  updateEnvProduction();
  updateNetlifyToml();
  updateServerConfig();
  updateServerConnection();
  updateSupabaseClient();
  createDistConfig();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Configuration Updated!');
  console.log('='.repeat(60));
  console.log('\n📝 Files updated:');
  console.log('   ✅ .env.production');
  console.log('   ✅ netlify.toml');
  console.log('   ✅ server/src/config/database.ts');
  console.log('   ✅ server/src/db/connection.ts');
  console.log('   ✅ src/lib/supabaseClient.ts');
  console.log('   ✅ dist/.env (if dist exists)');
  console.log('\n💡 Next steps:');
  console.log('   1. Run: npm run build:prod');
  console.log('   2. Deploy the dist/ folder to your hosting');
  console.log('   3. Your app will now use the production Supabase database');
  console.log('\n🎉 Production database is now connected!');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
