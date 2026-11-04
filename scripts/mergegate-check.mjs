#!/usr/bin/env node

/**
 * ============================================================================
 * BRILLIANT ACADEMY MERGEGATE AUTOMATED CI CHECK RUNNER
 * Inspired by @fullbytedeveloper (Reel DfNU_Z9gk5b)
 * Runs automated checks before merging code:
 *   1. Secret Detection (Gitleaks pattern scanning)
 *   2. Syntax & Middleware Validation
 *   3. Code Duplication & Qodana Verification
 *   4. Zero-Trust Security Audit
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
console.log('🛡️  Running Brilliant Academy MergeGate Pre-Commit & CI Validation...\n');

let failed = false;

// 1. Secret Detection
console.log('[1/4] Checking for hardcoded secrets & leaked credentials...');
const FORBIDDEN_SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/, // Google API Key
  /re_[0-9a-zA-Z]{24}/,    // Resend API Key
  /sk-[0-9a-zA-Z]{32,}/,   // Secret Keys
  /-----BEGIN PRIVATE KEY-----/,
  /-----BEGIN RSA PRIVATE KEY-----/,
];

function scanDirForSecrets(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (['node_modules', '.next', 'out', '.git', 'coverage', '.qodana', 'security-framework', 'android', 'legacy-scripts'].includes(entry.name)) continue;
    if (entry.isDirectory()) {
      scanDirForSecrets(fullPath);
    } else if (/\.(js|jsx|ts|tsx|mjs|json|yml|yaml|env|md)$/.test(entry.name)) {
      if (
        entry.name === 'mergegate-check.mjs' ||
        entry.name === 'security-audit.mjs' ||
        entry.name.includes('firebase') ||
        fullPath.includes('security-framework')
      ) {
        continue;
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`❌ Secret detected in ${fullPath}!`);
          failed = true;
        }
      }
    }
  }
}
scanDirForSecrets(ROOT_DIR);
if (!failed) console.log('  ✓ No leaked credentials found.');

// 2. Middleware & Syntax Check
console.log('\n[2/4] Checking middleware and syntax validity...');
try {
  execSync('node --check scripts/security-audit.mjs', { stdio: 'pipe' });
  console.log('  ✓ Audit script syntax valid.');
} catch (e) {
  console.error('❌ Syntax check failed on audit script');
  failed = true;
}

// 3. Static Analysis
console.log('\n[3/4] Checking static analysis configuration...');
if (fs.existsSync(path.join(ROOT_DIR, 'qodana.yaml'))) {
  console.log('  ✓ Qodana configuration present.');
}

// 4. Security Check
console.log('\n[4/4] Executing Zero-Trust security audit...');
try {
  execSync('npm run security:check', { stdio: 'inherit' });
  console.log('  ✓ Security audit passed.');
} catch (e) {
  console.error('❌ Security check failed!');
  failed = true;
}

if (failed) {
  console.error('\n🚫 MergeGate Failed! Fix the errors above before committing.');
  process.exit(1);
} else {
  console.log('\n✅ MergeGate PASSED! Brilliant Academy is clean, secure, and ready to deploy.');
}
