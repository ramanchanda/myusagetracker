#!/usr/bin/env node

/**
 * Syntax Validation Script
 *
 * Validates all JavaScript files for syntax errors before deployment.
 * Prevents production crashes from syntax issues.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n' + '='.repeat(70));
console.log('🔍 Syntax Validation - Checking all JavaScript files');
console.log('='.repeat(70) + '\n');

/**
 * Find all JS files recursively
 */
function findJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip node_modules and client build directories
    if (file === 'node_modules' || file === 'build' || file === '.git') {
      return;
    }

    if (stat.isDirectory()) {
      findJSFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Validate a single file
 */
function validateFile(filePath) {
  try {
    execSync(`node --check "${filePath}"`, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, file: filePath };
  } catch (error) {
    return {
      success: false,
      file: filePath,
      error: error.stderr || error.message
    };
  }
}

/**
 * Main validation
 */
function main() {
  const serverDir = path.join(__dirname, '../server');
  const jsFiles = findJSFiles(serverDir);

  console.log(`Found ${jsFiles.length} JavaScript files to validate\n`);

  const results = {
    passed: [],
    failed: []
  };

  // Validate each file
  jsFiles.forEach(file => {
    const relativePath = path.relative(process.cwd(), file);
    process.stdout.write(`Checking ${relativePath}... `);

    const result = validateFile(file);

    if (result.success) {
      console.log(`${GREEN}✓${RESET}`);
      results.passed.push(file);
    } else {
      console.log(`${RED}✗${RESET}`);
      results.failed.push(result);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('Summary');
  console.log('='.repeat(70) + '\n');

  console.log(`${GREEN}Passed:${RESET} ${results.passed.length}`);
  console.log(`${RED}Failed:${RESET} ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log(`\n${RED}Syntax errors found:${RESET}\n`);

    results.failed.forEach(failure => {
      const relativePath = path.relative(process.cwd(), failure.file);
      console.log(`${RED}✗ ${relativePath}${RESET}`);
      console.log(`  ${failure.error}\n`);
    });

    console.log(`${RED}Validation failed. Please fix syntax errors before deploying.${RESET}\n`);
    process.exit(1);
  }

  console.log(`\n${GREEN}✓ All files passed syntax validation!${RESET}\n`);
  process.exit(0);
}

// Run validation
main();
