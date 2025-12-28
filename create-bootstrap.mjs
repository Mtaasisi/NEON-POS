#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Dukani Pro Bootstrap Creator');
console.log('================================');

// Essential files to keep (core functionality)
const essentialFiles = [
    'package.json',
    'package-lock.json',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'tailwind.config.js',
    'postcss.config.js',
    'index.html',
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    'src/vite-env.d.ts',
    'src/types.ts',
    'public/favicon.ico',
    'capacitor.config.ts'
];

// Essential directories to keep
const essentialDirs = [
    'src/context',
    'src/hooks',
    'src/lib',
    'src/services',
    'src/utils',
    'src/types',
    'src/layout',
    'src/features/shared',
    'src/components/ui',
    'public'
];

// Features to keep in bootstrap (core POS functionality)
const coreFeatures = [
    'shared',      // Essential shared components
    'admin',       // Basic admin functionality
    'lats',        // Core POS/inventory system
    'customers',   // Customer management
    'devices',     // Device management
    'settings'     // Basic settings
];

// Optional features (can be added later)
const optionalFeatures = [
    'appointments',
    'backup',
    'business',
    'calculator',
    'customer-portal',
    'employees',
    'forms',
    'installments',
    'mobile',
    'notifications',
    'payments',
    'reminders',
    'repair',
    'reports',
    'returns',
    'sms',
    'special-orders',
    'tablet',
    'users',
    'whatsapp'
];

function createBootstrap() {
    const bootstrapDir = 'dukani-bootstrap';

    console.log('📁 Creating bootstrap directory...');
    if (fs.existsSync(bootstrapDir)) {
        fs.rmSync(bootstrapDir, { recursive: true, force: true });
    }
    fs.mkdirSync(bootstrapDir);

    // Copy essential files
    console.log('📋 Copying essential files...');
    for (const file of essentialFiles) {
        if (fs.existsSync(file)) {
            const destPath = path.join(bootstrapDir, file);
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(file, destPath);
        }
    }

    // Copy essential directories
    console.log('📂 Copying essential directories...');
    for (const dir of essentialDirs) {
        if (fs.existsSync(dir)) {
            copyDirectory(dir, path.join(bootstrapDir, dir));
        }
    }

    // Copy core features
    console.log('🔧 Copying core features...');
    for (const feature of coreFeatures) {
        const featurePath = `src/features/${feature}`;
        if (fs.existsSync(featurePath)) {
            copyDirectory(featurePath, path.join(bootstrapDir, featurePath));
        }
    }

    // Create bootstrap configuration
    const bootstrapConfig = {
        name: 'dukani-bootstrap',
        version: '1.0.0',
        description: 'Dukani Pro Bootstrap - Clean POS System',
        features: {
            included: coreFeatures,
            optional: optionalFeatures
        },
        created: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(bootstrapDir, 'bootstrap-config.json'),
        JSON.stringify(bootstrapConfig, null, 2)
    );

    // Create README for bootstrap
    const bootstrapReadme = `# Dukani Pro Bootstrap

This is a clean bootstrap version of Dukani Pro POS System with core functionality.

## Included Features

### Core Features ✅
${coreFeatures.map(f => `- ${f}`).join('\n')}

### Optional Features (Add as needed)
${optionalFeatures.map(f => `- ${f}`).join('\n')}

## Setup

1. \`npm install\`
2. Configure your database connection
3. \`npm run dev\` for development
4. \`npm run build\` for production

## Adding Features

To add optional features, copy them from the original codebase:
\`\`\`bash
cp -r ../original/src/features/[feature-name] src/features/
\`\`\`

## Database Setup

Run the essential migrations from \`sql/\` and \`migrations/\` directories.

---
Created: ${new Date().toISOString()}
Original Version: 1.0.3
`;

    fs.writeFileSync(path.join(bootstrapDir, 'README.md'), bootstrapReadme);

    console.log('✅ Bootstrap created successfully!');
    console.log(`📍 Location: ./${bootstrapDir}`);
    console.log('\n📋 Next steps:');
    console.log('1. cd dukani-bootstrap');
    console.log('2. npm install');
    console.log('3. Configure database connection');
    console.log('4. npm run dev');
}

function copyDirectory(source, destination) {
    if (!fs.existsSync(source)) return;

    fs.mkdirSync(destination, { recursive: true });

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(destination, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Run the bootstrap creation
createBootstrap();
