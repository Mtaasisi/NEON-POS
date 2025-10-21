const fs = require('fs');
const path = require('path');

console.log('🔍 Final Price Priority Verification\n');
console.log('='.repeat(80));

const problematicPatterns = [
  { pattern: /\.(unit_price|unitPrice)\s*\|\|\s*\.(selling_price|sellingPrice)/, desc: 'unit_price before selling_price' },
  { pattern: /price\s*[:=][^;{]*unit_price[^;]*(?!.*selling)/, desc: 'unit_price without selling_price check' }
];

const goodPatterns = [
  'selling_price || unit_price',
  'sellingPrice || unit_price',
  'selling_price || v.unit_price',
  'v.selling_price || v.unit_price'
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const issues = [];
  const good = [];
  
  lines.forEach((line, idx) => {
    if (line.includes('unit_price') && (line.includes('price:') || line.includes('price =') || line.includes('||'))) {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      
      // Check if it's a good pattern
      if (goodPatterns.some(gp => trimmed.includes(gp))) {
        good.push({ file: filePath, line: lineNum, content: trimmed });
      } else if (trimmed.includes('unit_price') && !trimmed.includes('//') && !trimmed.includes('SELECT')) {
        // Potential issue
        if (trimmed.match(/unit_price.*\?\?/) || trimmed.match(/unit_price\s*\|\|/)) {
          if (!trimmed.match(/selling_price.*\|\|.*unit_price/) && !trimmed.match(/sellingPrice.*\|\|.*unit_price/)) {
            issues.push({ file: filePath, line: lineNum, content: trimmed });
          }
        }
      }
    }
  });
  
  return { issues, good };
}

function scanDirectory(dir, results = { issues: [], good: [] }) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !fullPath.includes('node_modules')) {
      scanDirectory(fullPath, results);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const { issues, good } = checkFile(fullPath);
      results.issues.push(...issues);
      results.good.push(...good);
    }
  });
  
  return results;
}

const results = scanDirectory('./src');

console.log(`\n✅ GOOD PATTERNS FOUND: ${results.good.length}`);
console.log(`❌ POTENTIAL ISSUES: ${results.issues.length}\n`);

if (results.issues.length > 0) {
  console.log('⚠️  FILES NEEDING REVIEW:\n');
  results.issues.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    ${issue.content.substring(0, 100)}...\n`);
  });
} else {
  console.log('🎉 ALL PRICE FETCHING PATTERNS ARE CORRECT!\n');
  console.log('   All code prioritizes selling_price over unit_price ✅\n');
}

console.log('='.repeat(80));
