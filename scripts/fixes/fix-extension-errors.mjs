#!/usr/bin/env node

/**
 * 🔧 FIX EXTENSION CONTEXT INVALIDATION ERRORS
 * ============================================
 *
 * This script applies fixes to all browser automation scripts
 * to prevent "Extension context invalidated" errors.
 *
 * Run: node fix-extension-errors.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const EXTENSION_ARGS = [
  '--disable-extensions',
  '--disable-plugins',
  '--disable-default-apps',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding'
];

const CONSOLE_SUPPRESSION = `
// Suppress extension context errors
page.on('console', msg => {
  const text = msg.text();
  if (msg.type() === 'error' &&
      (text.includes('Extension context invalidated') ||
       text.includes('chrome-extension://') ||
       text.includes('moz-extension://'))) {
    // Silently ignore extension-related errors
    return;
  }
  if (msg.type() === 'error') {
    console.warn('Browser error:', text.substring(0, 100));
  }
});`;

function fixPuppeteerScript(content, filename) {
  let updated = content;

  // Fix puppeteer.launch args
  if (content.includes('puppeteer.launch({')) {
    updated = updated.replace(
      /browser\s*=\s*await\s*puppeteer\.launch\(\{[\s\S]*?args:\s*\[([^\]]*)\]/,
      (match, args) => {
        const existingArgs = args.trim();
        const newArgs = existingArgs ?
          existingArgs.replace(/\]$/, '') + ', ' + EXTENSION_ARGS.map(arg => `'${arg}'`).join(', ') + ']' :
          EXTENSION_ARGS.map(arg => `'${arg}'`).join(', ');
        return match.replace(args, newArgs);
      }
    );

    // Add ignoreDefaultArgs if not present
    if (!updated.includes('ignoreDefaultArgs')) {
      updated = updated.replace(
        /(browser\s*=\s*await\s*puppeteer\.launch\(\{[\s\S]*?)\}(\s*;)/,
        '$1,\n      ignoreDefaultArgs: [\'--enable-automation\']\n    }$2'
      );
    }
  }

  // Add console suppression
  if (content.includes('page = await browser.newPage();') && !content.includes('page.on(\'console\'')) {
    updated = updated.replace(
      /(page\s*=\s*await\s*browser\.newPage\(\)\s*;)/,
      '$1\n    ' + CONSOLE_SUPPRESSION.replace(/\n/g, '\n    ')
    );
  }

  return updated !== content ? updated : null;
}

function fixPlaywrightScript(content, filename) {
  let updated = content;

  // Fix chromium.launch args
  if (content.includes('chromium.launch({')) {
    updated = updated.replace(
      /(const browser\s*=\s*await\s*chromium\.launch\(\{[\s\S]*?)\}(\s*;)/,
      (match, before) => {
        if (!before.includes('args:')) {
          return before + '\n    args: [\n      ' + EXTENSION_ARGS.map(arg => `'${arg}'`).join(',\n      ') + '\n    ]\n  }$2';
        }
        return match;
      }
    );
  }

  // Add console suppression for Playwright
  if (content.includes('context.newPage()') && !content.includes('page.on(\'console\'')) {
    updated = updated.replace(
      /(const page\s*=\s*await\s*context\.newPage\(\)\s*;)/,
      '$1\n  ' + CONSOLE_SUPPRESSION.replace(/\n/g, '\n  ')
    );
  }

  return updated !== content ? updated : null;
}

function processFile(filepath) {
  try {
    const content = readFileSync(filepath, 'utf8');
    let updated = null;

    if (content.includes('import puppeteer from \'puppeteer\'')) {
      updated = fixPuppeteerScript(content, filepath);
    } else if (content.includes('import { chromium } from \'playwright\'')) {
      updated = fixPlaywrightScript(content, filepath);
    }

    if (updated) {
      writeFileSync(filepath, updated);
      console.log(`✅ Fixed: ${filepath}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filepath}:`, error.message);
  }
  return false;
}

function main() {
  console.log('🔧 Fixing extension context invalidation errors...\n');

  const scripts = readdirSync('.')
    .filter(file => file.endsWith('.mjs') && (
      file.includes('auto-') ||
      file.includes('test-') ||
      file.includes('create-')
    ));

  let fixed = 0;
  for (const script of scripts) {
    if (processFile(script)) {
      fixed++;
    }
  }

  console.log(`\n🎉 Fixed ${fixed} automation scripts!`);
  console.log('\n📋 Summary of changes:');
  console.log('   • Disabled browser extensions during automation');
  console.log('   • Added console error suppression for extension-related messages');
  console.log('   • Improved browser launch arguments for cleaner automation');
}

main();
