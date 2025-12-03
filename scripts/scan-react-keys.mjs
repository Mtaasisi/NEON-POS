#!/usr/bin/env node

/**
 * React Key Scanner
 * Scans the codebase for potential duplicate key issues
 * 
 * Usage: node scripts/scan-react-keys.mjs
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Patterns to detect potential issues
const PATTERNS = {
  // Direct .map without key
  noKey: /\.map\s*\(\s*\(?[^)]*\)?\s*=>\s*<[^>]*(?!key=)/g,
  
  // Using index as key
  indexKey: /key=\{(?:index|idx|i)\}/g,
  
  // Using Math.random() in render
  randomKey: /key=\{[^}]*Math\.random\(\)[^}]*\}/g,
  
  // Potentially duplicate-prone patterns
  simpleKey: /key=\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g,
  
  // Map calls (to count total)
  allMaps: /\.map\s*\(/g
};

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

const issues = {
  noKey: [],
  indexKey: [],
  randomKey: [],
  simpleKey: [],
  warnings: []
};

let totalMaps = 0;
let filesScanned = 0;

/**
 * Check if path should be ignored
 */
function shouldIgnore(path) {
  return IGNORE_DIRS.some(dir => path.includes(dir));
}

/**
 * Get all TypeScript/JavaScript files recursively
 */
function getFiles(dir, files = []) {
  if (shouldIgnore(dir)) return files;
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      
      if (shouldIgnore(fullPath)) continue;
      
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          getFiles(fullPath, files);
        } else if (/\.(tsx?|jsx?)$/.test(item)) {
          files.push(fullPath);
        }
      } catch (err) {
        // Skip files we can't access
      }
    }
  } catch (err) {
    // Skip directories we can't access
  }
  
  return files;
}

/**
 * Scan a file for key issues
 */
function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = relative(ROOT_DIR, filePath);
  
  filesScanned++;
  
  // Count total .map calls
  const maps = content.match(PATTERNS.allMaps);
  if (maps) {
    totalMaps += maps.length;
  }
  
  // Check for .map without keys
  const noKeyMatches = findIssues(content, PATTERNS.noKey);
  if (noKeyMatches.length > 0) {
    issues.noKey.push({ file: relativePath, count: noKeyMatches.length, matches: noKeyMatches });
  }
  
  // Check for index as key
  const indexMatches = findIssues(content, PATTERNS.indexKey);
  if (indexMatches.length > 0) {
    issues.indexKey.push({ file: relativePath, count: indexMatches.length, matches: indexMatches });
  }
  
  // Check for Math.random() keys
  const randomMatches = findIssues(content, PATTERNS.randomKey);
  if (randomMatches.length > 0) {
    issues.randomKey.push({ file: relativePath, count: randomMatches.length, matches: randomMatches });
  }
  
  // Check for simple keys (potential duplicates)
  const simpleMatches = findIssues(content, PATTERNS.simpleKey);
  if (simpleMatches.length > 0) {
    issues.simpleKey.push({ file: relativePath, count: simpleMatches.length, matches: simpleMatches });
  }
}

/**
 * Find all matches and their line numbers
 */
function findIssues(content, pattern) {
  const matches = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineNum) => {
    if (pattern.test(line)) {
      matches.push({
        line: lineNum + 1,
        code: line.trim().substring(0, 80) // First 80 chars
      });
    }
    pattern.lastIndex = 0; // Reset regex
  });
  
  return matches;
}

/**
 * Print results
 */
function printResults() {
  console.log('\n🔍 React Key Scanner Results\n');
  console.log('━'.repeat(60));
  console.log(`📁 Files scanned: ${filesScanned}`);
  console.log(`🗺️  Total .map() calls found: ${totalMaps}\n`);
  
  // Critical Issues
  console.log('🚨 CRITICAL ISSUES:\n');
  
  if (issues.noKey.length > 0) {
    console.log(`❌ Missing keys in .map(): ${issues.noKey.length} files`);
    issues.noKey.slice(0, 5).forEach(({ file, count }) => {
      console.log(`   ${file} (${count} occurrence${count > 1 ? 's' : ''})`);
    });
    if (issues.noKey.length > 5) {
      console.log(`   ... and ${issues.noKey.length - 5} more files`);
    }
    console.log('');
  }
  
  if (issues.randomKey.length > 0) {
    console.log(`❌ Math.random() keys: ${issues.randomKey.length} files`);
    issues.randomKey.forEach(({ file, matches }) => {
      console.log(`   ${file}`);
      matches.forEach(({ line, code }) => {
        console.log(`      Line ${line}: ${code}`);
      });
    });
    console.log('');
  }
  
  // Warnings
  console.log('⚠️  WARNINGS:\n');
  
  if (issues.indexKey.length > 0) {
    console.log(`⚠️  Index as key: ${issues.indexKey.length} files`);
    issues.indexKey.slice(0, 5).forEach(({ file, count }) => {
      console.log(`   ${file} (${count} occurrence${count > 1 ? 's' : ''})`);
    });
    if (issues.indexKey.length > 5) {
      console.log(`   ... and ${issues.indexKey.length - 5} more files`);
    }
    console.log('');
  }
  
  if (issues.simpleKey.length > 0) {
    console.log(`ℹ️  Simple keys (review for duplicates): ${issues.simpleKey.length} files`);
    console.log('   (This is informational - not necessarily a problem)\n');
  }
  
  // Summary
  console.log('━'.repeat(60));
  const totalIssues = issues.noKey.length + issues.randomKey.length;
  const totalWarnings = issues.indexKey.length;
  
  if (totalIssues === 0 && totalWarnings === 0) {
    console.log('✅ No critical issues found!\n');
  } else {
    console.log(`📊 Summary: ${totalIssues} critical issues, ${totalWarnings} warnings\n`);
    console.log('💡 See REACT_KEY_BEST_PRACTICES.md for solutions\n');
  }
}

/**
 * Main
 */
function main() {
  console.log('🚀 Starting React key scan...\n');
  
  const srcDir = join(ROOT_DIR, 'src');
  const files = getFiles(srcDir);
  
  console.log(`Found ${files.length} files to scan...`);
  
  files.forEach(scanFile);
  
  printResults();
}

main();

