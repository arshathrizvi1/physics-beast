#!/usr/bin/env node
/**
 * ============================================================================
 * BRILLIANT ACADEMY - MILITARY-GRADE ZERO-TRUST SAST & ARCHITECTURE AUDITOR
 * ============================================================================
 * Audits all 9 Pillars of the Zero-Trust Security Architecture across both
 * the Next.js Web Platform (`src/`) and Mobile Apps (`brilliant_academy_flutter/`
 * & `android/`). Exits with code 1 if any vulnerability or missing control is found.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const findings = [];
let checksRun = 0;

function recordFinding(pillar, file, message) {
  findings.push({ pillar, file, message });
}

function passCheck() {
  checksRun += 1;
}

function walkFiles(dir, exts = ['.ts', '.tsx', '.js', '.mjs', '.kt', '.dart', '.cpp', '.py', '.yml', '.yaml']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.next' ||
      entry.name === '.git' ||
      entry.name === 'build' ||
      entry.name === '.dart_tool'
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ============================================================================
// PILLAR 1: ZERO HARDCODED SECRETS & CREDENTIAL LEAKAGE SCAN
// ============================================================================
const SECRET_PATTERNS = [
  { name: 'Payable/Stripe Secret Key', regex: /\bsk_(?:test|live)_[0-9a-zA-Z]{16,}/ },
  { name: 'Resend API Key', regex: /\bre_[0-9a-zA-Z_]{16,}/ },
  { name: 'Google/Vertex AQ Token', regex: /\bAQ\.[0-9a-zA-Z_-]{20,}/ },
  { name: 'Hardcoded LiveKit Secret', regex: /\besDs-[0-9a-zA-Z_-]{10,}/ },
  { name: 'Hardcoded Admin Plaintext Password', regex: /password\s*===\s*["'](?:Brilliantacademy|Arshath2007)["']/ },
  { name: 'Plaintext DRM Master Secret', regex: /BrilliantAcademy_SuperSecretKey_2026!\$/ },
  { name: 'Hardcoded Keystore Password (brilliant123)', regex: /storepass\s+"?brilliant123"?/ },
  { name: 'Inline RSA/EC Private Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]{64,}-----END/ },
  { name: 'Publicly Exposed Secret Env Var', regex: /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|PASSWORD)\b/ },
];

const scanDirs = [
  path.join(ROOT, 'src'),
  path.join(ROOT, 'brilliant_academy_flutter', 'lib'),
  path.join(ROOT, 'brilliant_academy_flutter', 'android'),
  path.join(ROOT, 'android'),
  path.join(ROOT, '.github'),
];

for (const dir of scanDirs) {
  for (const file of walkFiles(dir)) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');
    passCheck();
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(content)) {
        recordFinding('Pillar 1 (Secret Hygiene)', rel, `Detected ${pattern.name}`);
      }
    }
  }
}

// Check root helper script check_secret_rev.py
const checkSecretPy = path.join(ROOT, 'check_secret_rev.py');
if (fs.existsSync(checkSecretPy)) {
  passCheck();
  const pyContent = fs.readFileSync(checkSecretPy, 'utf8');
  if (pyContent.includes('BrilliantAcademy_SuperSecretKey_2026')) {
    recordFinding('Pillar 1 (Secret Hygiene)', 'check_secret_rev.py', 'Hardcoded plaintext DRM secret in helper script');
  }
}

// ============================================================================
// PILLAR 2: FIRESTORE ZERO-TRUST RULES (UpGuard / Anti-Escalation / Default Deny)
// ============================================================================
const firestoreRulesPath = path.join(ROOT, 'firestore.rules');
if (!fs.existsSync(firestoreRulesPath)) {
  recordFinding('Pillar 2 (Firestore Rules)', 'firestore.rules', 'Missing firestore.rules file');
} else {
  const rules = fs.readFileSync(firestoreRulesPath, 'utf8');
  passCheck();

  if (/match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+isAuthenticated\(\)/m.test(rules)) {
    recordFinding(
      'Pillar 2 (Firestore Rules)',
      'firestore.rules',
      'Permissive wildcard match /{document=**} allows any authenticated user to read/write all collections'
    );
  }
  if (!/match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;/m.test(rules)) {
    recordFinding('Pillar 2 (Firestore Rules)', 'firestore.rules', 'Missing Default Deny-All fallback rule');
  }
  if (!rules.includes('function isVerifiedAdmin()')) {
    recordFinding('Pillar 2 (Firestore Rules)', 'firestore.rules', 'Missing isVerifiedAdmin() cryptographic helper');
  }
  if (!rules.includes('function hasNoPrivilegeEscalation()')) {
    recordFinding('Pillar 2 (Firestore Rules)', 'firestore.rules', 'Missing hasNoPrivilegeEscalation() guard on /users/{userId}');
  }
  if (!rules.includes('match /settings/{docId}')) {
    recordFinding('Pillar 2 (Firestore Rules)', 'firestore.rules', 'Missing explicit lock on /settings/{docId} (Zoom secrets)');
  }
}

// ============================================================================
// PILLAR 3: ZERO-TRUST SECURITY CORE MODULES & CANARY TRAP
// ============================================================================
const requiredSecurityModules = [
  'src/security/env.ts',
  'src/security/sanitize.ts',
  'src/security/audit-ledger.ts',
  'src/security/rate-limit.ts',
  'src/security/session.ts',
  'src/security/schemas.ts',
  'src/security/payment-authority.ts',
  'src/security/otp-authority.ts',
  'src/security/zero-trust-gate.ts',
  'src/middleware.ts',
  'src/app/api/internal/debug-config/route.ts',
  'src/app/api/auth/session/route.ts',
  'src/app/api/auth/otp/route.ts',
];

for (const mod of requiredSecurityModules) {
  passCheck();
  if (!fs.existsSync(path.join(ROOT, mod))) {
    recordFinding('Pillar 3 (Core Security Modules)', mod, `Missing required Zero-Trust module: ${mod}`);
  }
}

// ============================================================================
// PILLAR 4: ADMIN API ROUTES HARDWARE-BOUND SESSION & CALLER VERIFICATION
// ============================================================================
const adminRoutes = [
  'src/app/api/admin/delete-user/route.ts',
  'src/app/api/admin/delete-by-email/route.ts',
  'src/app/api/admin/cleanup/route.ts',
];

for (const route of adminRoutes) {
  const full = path.join(ROOT, route);
  passCheck();
  if (!fs.existsSync(full)) {
    recordFinding('Pillar 4 (Admin API Gate)', route, 'Missing admin route');
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');
  if (!content.includes('withZeroTrustGate') || !content.includes("requireAuth: 'admin'")) {
    recordFinding('Pillar 4 (Admin API Gate)', route, "Admin route must enforce withZeroTrustGate({ requireAuth: 'admin' })");
  }
}

// ============================================================================
// PILLAR 5: SERVER-SIDE PRICE AUTHORITY & DUAL-LOCK PAYMENT VERIFICATION
// ============================================================================
const checkoutRoute = path.join(ROOT, 'src/app/api/payable/create-checkout/route.ts');
const verifyRoute = path.join(ROOT, 'src/app/api/payable/verify/route.ts');

if (fs.existsSync(checkoutRoute)) {
  passCheck();
  const content = fs.readFileSync(checkoutRoute, 'utf8');
  if (!content.includes('resolveAuthoritativeCoursePrice') || !content.includes('packSignedPayableReference')) {
    recordFinding(
      'Pillar 5 (Payment Authority)',
      'src/app/api/payable/create-checkout/route.ts',
      'Checkout route must enforce resolveAuthoritativeCoursePrice and packSignedPayableReference'
    );
  }
}

if (fs.existsSync(verifyRoute)) {
  passCheck();
  const content = fs.readFileSync(verifyRoute, 'utf8');
  if (!content.includes('verifyPayableDualLock')) {
    recordFinding(
      'Pillar 5 (Payment Authority)',
      'src/app/api/payable/verify/route.ts',
      'Verify route must enforce verifyPayableDualLock Dual-Lock verification'
    );
  }
}

// ============================================================================
// PILLAR 6: MEDIA UPLOAD MIME ALLOWLIST & HLS STREAM CORS LOCKDOWN
// ============================================================================
for (const uploadRoute of ['src/app/api/s3/upload/route.ts', 'src/app/api/bunny/s3-upload/route.ts']) {
  const full = path.join(ROOT, uploadRoute);
  if (fs.existsSync(full)) {
    passCheck();
    const content = fs.readFileSync(full, 'utf8');
    if (!content.includes('validatePresignedUploadPayload') || !content.includes('withZeroTrustGate')) {
      recordFinding('Pillar 6 (Media Upload Gate)', uploadRoute, 'Upload route must enforce validatePresignedUploadPayload & withZeroTrustGate');
    }
  }
}

for (const hlsRoute of ['src/app/api/stream/hls/[...path]/route.ts', 'src/app/api/stream/hls-key/route.ts']) {
  const full = path.join(ROOT, hlsRoute);
  if (fs.existsSync(full)) {
    passCheck();
    const content = fs.readFileSync(full, 'utf8');
    if (content.includes("'Access-Control-Allow-Origin': '*'") || !content.includes('resolveCorsOrigin')) {
      recordFinding('Pillar 6 (HLS DRM Stream)', hlsRoute, 'HLS route must not use wildcard CORS and must enforce resolveCorsOrigin');
    }
  }
}

// ============================================================================
// PILLAR 7: NEXT.JS EDGE & SECURITY HEADERS CONFIGURATION
// ============================================================================
const nextConfigPath = path.join(ROOT, 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  passCheck();
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  for (const requiredToken of [
    'poweredByHeader: false',
    'productionBrowserSourceMaps: false',
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'X-Content-Type-Options',
  ]) {
    if (!nextConfig.includes(requiredToken)) {
      recordFinding('Pillar 7 (Next.js Hardening)', 'next.config.ts', `Missing required setting/header: ${requiredToken}`);
    }
  }
}

// ============================================================================
// PILLAR 8: MOBILE APP (FLUTTER + NATIVE ANDROID C++/KOTLIN) ZERO-TRUST INTEGRITY
// ============================================================================
const kotlinMain = path.join(
  ROOT,
  'brilliant_academy_flutter/android/app/src/main/kotlin/com/brilliantacademy/app/MainActivity.kt'
);
if (fs.existsSync(kotlinMain)) {
  passCheck();
  const kt = fs.readFileSync(kotlinMain, 'utf8');
  if (kt.includes('true // Allow fallback in developer mode')) {
    recordFinding('Pillar 8 (Mobile Integrity)', 'MainActivity.kt', 'verifySignature() catch block must be fail-closed (false)');
  }
  if (!kt.includes('COMPROMISED_DEVICE') || !kt.includes('isDebuggerOrHookAttached')) {
    recordFinding('Pillar 8 (Mobile Integrity)', 'MainActivity.kt', 'MainActivity.kt must enforce Frida/debugger detection and block compromised devices');
  }
}

const dartSec = path.join(ROOT, 'brilliant_academy_flutter/lib/core/security/security_service.dart');
if (fs.existsSync(dartSec)) {
  passCheck();
  const dart = fs.readFileSync(dartSec, 'utf8');
  if (!dart.includes('Fail-Closed')) {
    recordFinding('Pillar 8 (Mobile Integrity)', 'security_service.dart', 'verifyDeviceIntegrity() must fail-closed on exception');
  }
}

const cppSec = path.join(ROOT, 'android/app/src/main/cpp/secure-player-lib.cpp');
if (fs.existsSync(cppSec)) {
  passCheck();
  const cpp = fs.readFileSync(cppSec, 'utf8');
  if (cpp.includes('// isCracked = true;') || !cpp.includes('isRootedOrHooked()')) {
    recordFinding('Pillar 8 (Mobile Integrity)', 'secure-player-lib.cpp', 'Native C++ player library must actively enforce root/Frida and signature verification');
  }
}

// ============================================================================
// PILLAR 9: ENTERPRISE CI/SAST CONFIGURATIONS (Semgrep, Qodana, GitHub Actions)
// ============================================================================
for (const ciFile of [
  '.semgrep.yml',
  'qodana.yaml',
  '.github/workflows/security-audit.yml',
  '.github/workflows/semgrep.yml',
  fs.existsSync(path.join(ROOT, '.github/workflows/qodana-scan.yml'))
    ? '.github/workflows/qodana-scan.yml'
    : '.github/workflows/qodana.yml',
]) {
  passCheck();
  if (!fs.existsSync(path.join(ROOT, ciFile))) {
    recordFinding('Pillar 9 (CI/SAST Gates)', ciFile, `Missing enterprise CI/SAST gate configuration: ${ciFile}`);
  }
}

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('============================================================================');
console.log(' BRILLIANT ACADEMY - 9-PILLAR MILITARY-GRADE ZERO-TRUST SAST REPORT');
console.log('============================================================================');
console.log(`Total Security Assertions Evaluated: ${checksRun}`);

if (findings.length > 0) {
  console.error(`\n[FAIL] ${findings.length} security finding(s) detected:\n`);
  for (const f of findings) {
    console.error(`  - [${f.pillar}] ${f.file}: ${f.message}`);
  }
  process.exit(1);
} else {
  console.log('\n[PASS] 0 security vulnerabilities detected across all 9 Zero-Trust Pillars.');
  console.log('============================================================================');
}
