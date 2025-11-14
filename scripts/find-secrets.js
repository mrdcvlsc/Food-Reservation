#!/usr/bin/env node
/**
 * Secret Scanner - Finds potential secrets and sensitive data in codebase
 * Scans for environment variables, API keys, tokens, passwords, etc.
 */

const fs = require('fs');
const path = require('path');

// Patterns to detect potential secrets
const SECRET_PATTERNS = [
  // Environment variables (should be in .env, not hardcoded)
  { pattern: /process\.env\.[A-Z_]+/g, type: 'ENV_VAR', severity: 'INFO' },
  
  // API keys and tokens
  { pattern: /['"]?[aA][pP][iI][-_]?[kK][eE][yY]['"]?\s*[:=]\s*['"][^'"]+['"]/g, type: 'API_KEY', severity: 'HIGH' },
  { pattern: /['"]?[tT][oO][kK][eE][nN]['"]?\s*[:=]\s*['"][^'"]{20,}['"]/g, type: 'TOKEN', severity: 'HIGH' },
  { pattern: /['"]?[sS][eE][cC][rR][eE][tT]['"]?\s*[:=]\s*['"][^'"]+['"]/g, type: 'SECRET', severity: 'HIGH' },
  { pattern: /['"]?[aA][cC][cC][eE][sS][sS][-_]?[kK][eE][yY]['"]?\s*[:=]\s*['"][^'"]+['"]/g, type: 'ACCESS_KEY', severity: 'HIGH' },
  
  // Passwords (hardcoded)
  { pattern: /['"]?[pP][aA][sS][sS][wW][oO][rR][dD]['"]?\s*[:=]\s*['"][^'"]+['"]/g, type: 'PASSWORD', severity: 'CRITICAL' },
  { pattern: /['"]?[pP][wW][dD]['"]?\s*[:=]\s*['"][^'"]+['"]/g, type: 'PASSWORD', severity: 'CRITICAL' },
  
  // Database connection strings
  { pattern: /mongodb(\+srv)?:\/\/[^\s'"]+/g, type: 'DB_CONNECTION', severity: 'CRITICAL' },
  { pattern: /mysql:\/\/[^\s'"]+/g, type: 'DB_CONNECTION', severity: 'CRITICAL' },
  { pattern: /postgres:\/\/[^\s'"]+/g, type: 'DB_CONNECTION', severity: 'CRITICAL' },
  
  // AWS keys
  { pattern: /AKIA[0-9A-Z]{16}/g, type: 'AWS_ACCESS_KEY', severity: 'CRITICAL' },
  { pattern: /aws[-_]?secret[-_]?access[-_]?key/gi, type: 'AWS_SECRET', severity: 'CRITICAL' },
  
  // Private keys
  { pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g, type: 'PRIVATE_KEY', severity: 'CRITICAL' },
  
  // JWT secrets
  { pattern: /['"]?[jJ][wW][tT][-_]?[sS][eE][cC][rR][eE][tT]['"]?\s*[:=]\s*['"][^'"]+['"]/g, type: 'JWT_SECRET', severity: 'CRITICAL' },
  
  // Email credentials
  { pattern: /['"]?[eE][mM][aA][iI][lL][-_]?[pP][aA][sS][sS][wW][oO][rR][dD]['"]?\s*[:=]\s*['"][^'"]+['"]/g, type: 'EMAIL_PASSWORD', severity: 'HIGH' },
  
  // Generic credentials
  { pattern: /['"]?[cC][rR][eE][dD][eE][nN][tT][iI][aA][lL][sS]?['"]?\s*[:=]\s*['"][^'"]+['"]/g, type: 'CREDENTIALS', severity: 'HIGH' },
];

// Directories to scan
const SCAN_DIRS = ['frontend/src', 'backend/src', 'scripts'];

// Files to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.test\./,
  /\.spec\./,
  /find-secrets\.js$/, // Don't scan this file
];

// Results storage
const results = {
  CRITICAL: [],
  HIGH: [],
  MEDIUM: [],
  INFO: [],
};

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip certain patterns
    if (SKIP_PATTERNS.some(pattern => pattern.test(fullPath))) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && /\.(js|jsx|ts|tsx|json|env|txt|md)$/i.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

/**
 * Scan a single file for secrets
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    SECRET_PATTERNS.forEach(({ pattern, type, severity }) => {
      lines.forEach((line, lineNumber) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Filter out false positives
            if (isFalsePositive(match, type, line)) {
              return;
            }

            results[severity].push({
              file: filePath,
              line: lineNumber + 1,
              type,
              match: match.substring(0, 100), // Truncate for safety
              context: line.trim().substring(0, 150),
            });
          });
        }
      });
    });
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
  }
}

/**
 * Filter out known false positives
 */
function isFalsePositive(match, type, line) {
  // Skip if it's in a comment
  if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
    return true;
  }

  // Skip if it's a placeholder or example
  if (/your[-_]?api[-_]?key|example|placeholder|xxx|yyy|zzz|123456|test/i.test(match)) {
    return true;
  }

  // Skip if it's process.env usage (INFO level) but appears to be legitimate usage
  if (type === 'ENV_VAR' && /process\.env\.[A-Z_]+/.test(match)) {
    // These are typically fine - just documenting env var usage
    return false;
  }

  // Skip empty values
  if (/['"]\s*['"]/.test(match)) {
    return true;
  }

  return false;
}

/**
 * Print results
 */
function printResults() {
  console.log('\n🔍 SECRET SCANNER RESULTS\n');
  console.log('=' .repeat(60));

  let totalFindings = 0;

  ['CRITICAL', 'HIGH', 'MEDIUM', 'INFO'].forEach(severity => {
    const findings = results[severity];
    if (findings.length === 0) return;

    totalFindings += findings.length;

    const emoji = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '⚠️' : severity === 'MEDIUM' ? '⚡' : 'ℹ️';
    console.log(`\n${emoji} ${severity} (${findings.length} finding${findings.length > 1 ? 's' : ''})`);
    console.log('-'.repeat(60));

    findings.forEach(({ file, line, type, match, context }) => {
      console.log(`\n📁 ${file}:${line}`);
      console.log(`   Type: ${type}`);
      console.log(`   Match: ${match}`);
      if (context) {
        console.log(`   Context: ${context}`);
      }
    });
  });

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 SUMMARY: ${totalFindings} potential secret(s) found`);

  if (results.CRITICAL.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND!');
    console.log('   Hardcoded credentials detected. Remove immediately!');
  }

  if (results.HIGH.length > 0) {
    console.log('\n⚠️  HIGH PRIORITY ISSUES');
    console.log('   Potential secrets found. Review and move to environment variables.');
  }

  if (results.INFO.length > 0) {
    console.log(`\nℹ️  INFO: ${results.INFO.length} environment variable reference(s)`);
    console.log('   Ensure these are documented in .env.example');
  }

  console.log('\n✅ RECOMMENDATIONS:');
  console.log('   1. Move all secrets to .env files');
  console.log('   2. Add .env to .gitignore');
  console.log('   3. Create .env.example with placeholder values');
  console.log('   4. Use environment variables: process.env.VARIABLE_NAME');
  console.log('   5. Never commit real credentials to version control');
  console.log('');

  // Return exit code
  if (results.CRITICAL.length > 0 || results.HIGH.length > 0) {
    process.exit(1);
  }
}

// Run the scanner
console.log('🔍 Scanning for secrets and sensitive data...\n');
SCAN_DIRS.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Scanning: ${dir}`);
    scanDirectory(dir);
  }
});

printResults();
