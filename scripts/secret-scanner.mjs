#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const isStagedOnly = process.argv.includes('--staged');

const SECRET_PATTERNS = [
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: 'Gemini AQ Token', regex: /AQ\.[0-9a-zA-Z_-]{20,}/ },
  { name: 'Stripe Secret Key', regex: /sk_(?:live|test)_[0-9a-zA-Z]{16,}/ },
  { name: 'Resend API Key', regex: /re_[0-9a-zA-Z_]{16,}/ },
  { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Cloudflare API Key', regex: /cfk_[0-9a-zA-Z_-]{20,}/ },
  { name: 'GitHub Personal Token', regex: /gh[pousr]_[0-9a-zA-Z]{36,}/ },
  { name: 'Slack Bot Token', regex: /xoxb-[0-9]{11}-[0-9]{11}-[0-9a-zA-Z]{24}/ },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Firebase Service Account JSON', regex: /"private_key":\s*"-----BEGIN/ }
];

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.qodana',
  'security-framework',
]);

const IGNORE_FILES = new Set([
  'secret-scanner.mjs',
  'security-audit.mjs',
  'mergegate-check.mjs',
  'package-lock.json',
  'pnpm-lock.yaml',
  '.env.example',
]);

function getFilesToScan() {
  if (isStagedOnly) {
    try {
      const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
      return output.split('\n').map(s => s.trim()).filter(Boolean).map(f => path.resolve(ROOT, f));
    } catch {
      return [];
    }
  }

  const result = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        result.push(full);
      }
    }
  }
  walk(ROOT);
  return result;
}

console.log(`🔍 [VibeGuard] Scanning ${isStagedOnly ? 'staged files' : 'entire codebase'} for leaked credentials...`);

const files = getFilesToScan();
const leaks = [];

for (const file of files) {
  const baseName = path.basename(file);
  if (IGNORE_FILES.has(baseName)) continue;
  if (!/\.(js|jsx|ts|tsx|mjs|cjs|json|yml|yaml|env.*|sql|sh|ps1)$/.test(baseName)) continue;

  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pat of SECRET_PATTERNS) {
        if (pat.regex.test(line)) {
          // Ignore false positives or placeholders
          if (
            line.includes('YOUR_') ||
            line.includes('EXAMPLE') ||
            line.includes('dummy') ||
            line.includes('AIzaSyExample') ||
            baseName.includes('.example')
          ) {
            continue;
          }
          leaks.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            rule: pat.name,
            snippet: line.trim().substring(0, 80)
          });
        }
      }
    }
  } catch {}
}

if (leaks.length > 0) {
  console.error(`\n🚨 LEAKED SECRETS DETECTED (${leaks.length} issues found):`);
  for (const leak of leaks) {
    console.error(`  ❌ [${leak.rule}] ${leak.file}:${leak.line}`);
    console.error(`     Snippet: ${leak.snippet}`);
  }
  console.error('\n🛑 Remove or move hardcoded credentials to environment variables before committing!\n');
  process.exit(1);
} else {
  console.log(`✅ [VibeGuard] Passed! Zero secrets or leaked API keys detected across ${files.length} files.\n`);
  process.exit(0);
}
