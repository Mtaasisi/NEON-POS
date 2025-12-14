#!/usr/bin/env node

/**
 * Modal Update Helper Script
 * 
 * This script helps identify modals that need updating and provides
 * guidance on how to convert them to use ResponsiveModal.
 * 
 * Usage:
 *   node scripts/update-modal-to-responsive.js [file-path]
 * 
 * Examples:
 *   node scripts/update-modal-to-responsive.js src/components/QuickExpenseModal.tsx
 *   node scripts/update-modal-to-responsive.js --scan-all
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function analyzeModal(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const analysis = {
      file: filePath,
      hasResponsiveModal: content.includes('ResponsiveModal'),
      hasOldModal: content.includes('from \'../features/shared/components/ui/Modal\'') || 
                   content.includes('from \'../../features/shared/components/ui/Modal\''),
      hasFixedBackdrop: content.includes('fixed') && content.includes('inset-0'),
      hasBackdropClick: content.includes('onClick') && content.includes('onClose'),
      hasFlexCol: content.includes('flex-col'),
      hasOverflow: content.includes('overflow-y-auto') || content.includes('overflow-auto'),
      hasResponsivePadding: content.includes('p-2 sm:p-4') || content.includes('p-4 sm:p-6'),
      hasResponsiveMaxW: content.includes('max-w-[95vw]'),
      needsUpdate: false,
      suggestions: []
    };

    // Determine if modal needs update
    if (!analysis.hasResponsiveModal) {
      analysis.needsUpdate = true;
      analysis.suggestions.push('Convert to use ResponsiveModal component');
    }

    if (!analysis.hasResponsiveMaxW) {
      analysis.needsUpdate = true;
      analysis.suggestions.push('Add responsive max-width classes');
    }

    if (!analysis.hasFlexCol) {
      analysis.needsUpdate = true;
      analysis.suggestions.push('Use flex-col structure for proper scrolling');
    }

    if (!analysis.hasResponsivePadding) {
      analysis.suggestions.push('Add responsive padding (p-2 sm:p-4)');
    }

    return analysis;
  } catch (error) {
    console.error(`${colors.red}Error analyzing ${filePath}:${colors.reset}`, error.message);
    return null;
  }
}

function printAnalysis(analysis) {
  console.log(`\n${colors.bright}${colors.cyan}📄 ${analysis.file}${colors.reset}`);
  
  if (analysis.hasResponsiveModal) {
    console.log(`${colors.green}✓ Already using ResponsiveModal${colors.reset}`);
    return;
  }

  if (analysis.needsUpdate) {
    console.log(`${colors.yellow}⚠️  Needs update${colors.reset}`);
    
    if (analysis.suggestions.length > 0) {
      console.log(`\n${colors.bright}Suggestions:${colors.reset}`);
      analysis.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    console.log(`\n${colors.blue}Quick conversion steps:${colors.reset}`);
    console.log(`  1. Import ResponsiveModal:`);
    console.log(`     import ResponsiveModal from '../../components/ui/ResponsiveModal';`);
    console.log(`  2. Replace modal wrapper with:`);
    console.log(`     <ResponsiveModal`);
    console.log(`       isOpen={isOpen}`);
    console.log(`       onClose={onClose}`);
    console.log(`       title="Your Title"`);
    console.log(`       size="lg"`);
    console.log(`       footer={<YourFooterButtons />}`);
    console.log(`     >`);
    console.log(`       {/* Your content */}`);
    console.log(`     </ResponsiveModal>`);
  } else {
    console.log(`${colors.green}✓ Already optimized${colors.reset}`);
  }
}

function scanAllModals() {
  console.log(`${colors.bright}${colors.cyan}🔍 Scanning all modals...${colors.reset}\n`);
  
  const modalFiles = glob.sync('src/**/*Modal*.tsx', {
    ignore: ['**/node_modules/**', '**/dist/**']
  });

  console.log(`Found ${colors.bright}${modalFiles.length}${colors.reset} modal files\n`);

  let needsUpdate = 0;
  let alreadyOptimized = 0;

  modalFiles.forEach(file => {
    const analysis = analyzeModal(file);
    if (analysis) {
      if (analysis.hasResponsiveModal) {
        alreadyOptimized++;
      } else if (analysis.needsUpdate) {
        needsUpdate++;
        printAnalysis(analysis);
      }
    }
  });

  console.log(`\n${colors.bright}${colors.cyan}📊 Summary:${colors.reset}`);
  console.log(`${colors.green}✓ Optimized: ${alreadyOptimized}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Needs Update: ${needsUpdate}${colors.reset}`);
  console.log(`${colors.blue}Total: ${modalFiles.length}${colors.reset}`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`${colors.bright}Modal Update Helper${colors.reset}
  
Usage:
  node scripts/update-modal-to-responsive.js [file-path]
  node scripts/update-modal-to-responsive.js --scan-all
  
Examples:
  node scripts/update-modal-to-responsive.js src/components/QuickExpenseModal.tsx
  node scripts/update-modal-to-responsive.js --scan-all
  
For detailed guide, see: MODAL_STANDARDIZATION_GUIDE.md
  `);
  process.exit(0);
}

if (args[0] === '--scan-all') {
  scanAllModals();
} else {
  const filePath = args[0];
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}Error: File not found: ${filePath}${colors.reset}`);
    process.exit(1);
  }
  
  const analysis = analyzeModal(filePath);
  if (analysis) {
    printAnalysis(analysis);
  }
}

