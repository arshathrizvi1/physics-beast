// ============================================================================
// TAMPER-EVIDENT SHA-256 HASH-CHAINED SECURITY AUDIT LEDGER
// Enforces:
//   - Cryptographic hash chaining: entryHash = SHA-256(prevHash|timestamp|eventType|ip|payloadHash)
//   - Immutable append-only memory + JSONL ledger with integrity verification
// ============================================================================

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export type SecurityEventType =
  | 'UNAUTHORIZED_ADMIN_ATTEMPT'
  | 'PARAMETER_TAMPERING_DETECTED'
  | 'CANARY_TRAP_TRIGGERED'
  | 'SESSION_FINGERPRINT_MISMATCH'
  | 'REPLAY_ATTACK_BLOCKED'
  | 'CSRF_ORIGIN_BLOCKED'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAILURE'
  | 'ADMIN_MUTATION'
  | 'CHECKOUT_PRICE_TAMPERING'
  | 'FORGED_PAYMENT_WEBHOOK'
  | 'PAYMENT_AMOUNT_MISMATCH_FRAUD'
  | 'INTERNAL_ROUTE_ERROR';

export interface AuditLedgerEntry {
  index: number;
  timestamp: string;
  traceId: string;
  severity: 'INFO' | 'WARN' | 'HIGH' | 'CRITICAL';
  eventType: SecurityEventType;
  ip: string;
  fingerprint: string;
  path: string;
  method: string;
  payloadHash: string;
  prevHash: string;
  entryHash: string;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const LEDGER_DIR = path.join(process.cwd(), 'data');
const LEDGER_FILE = path.join(LEDGER_DIR, 'security-audit-ledger.jsonl');

const memoryLedger: AuditLedgerEntry[] = [];
let lastChainHash = GENESIS_HASH;
let ledgerIndex = 0;

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

export function computeLedgerEntryHash(params: {
  prevHash: string;
  timestamp: string;
  eventType: string;
  ip: string;
  payloadHash: string;
}): string {
  const canonical = `${params.prevHash}|${params.timestamp}|${params.eventType}|${params.ip}|${params.payloadHash}`;
  return sha256Hex(canonical);
}

export async function appendAuditLog(input: {
  traceId?: string;
  severity?: 'INFO' | 'WARN' | 'HIGH' | 'CRITICAL';
  eventType: SecurityEventType;
  ip: string;
  fingerprint?: string;
  path: string;
  method?: string;
  details?: unknown;
}): Promise<AuditLedgerEntry> {
  const timestamp = new Date().toISOString();
  const traceId = input.traceId || crypto.randomUUID();
  const serializedDetails =
    typeof input.details === 'string'
      ? input.details
      : JSON.stringify(input.details ?? {});
  const payloadHash = sha256Hex(serializedDetails);
  const prevHash = lastChainHash;

  const entryHash = computeLedgerEntryHash({
    prevHash,
    timestamp,
    eventType: input.eventType,
    ip: input.ip,
    payloadHash,
  });

  ledgerIndex += 1;
  lastChainHash = entryHash;

  const entry: AuditLedgerEntry = {
    index: ledgerIndex,
    timestamp,
    traceId,
    severity: input.severity || 'WARN',
    eventType: input.eventType,
    ip: input.ip,
    fingerprint: input.fingerprint || '',
    path: input.path,
    method: input.method || 'POST',
    payloadHash,
    prevHash,
    entryHash,
  };

  memoryLedger.push(entry);
  if (memoryLedger.length > 1000) {
    memoryLedger.shift();
  }

  try {
    await fs.mkdir(LEDGER_DIR, { recursive: true });
    await fs.appendFile(LEDGER_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch {
    // Non-fatal in read-only serverless environments
  }

  return entry;
}

export const appendAuditLedgerEntry = appendAuditLog;

export function verifyAuditLedgerIntegrity(
  entries: readonly AuditLedgerEntry[] = memoryLedger
): {
  valid: boolean;
  brokenAtIndex?: number;
} {
  let expectedPrev = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    if (!current) continue;

    if (i > 0 && current.prevHash !== expectedPrev) {
      return { valid: false, brokenAtIndex: current.index };
    }

    const recomputed = computeLedgerEntryHash({
      prevHash: current.prevHash,
      timestamp: current.timestamp,
      eventType: current.eventType,
      ip: current.ip,
      payloadHash: current.payloadHash,
    });

    if (recomputed !== current.entryHash) {
      return { valid: false, brokenAtIndex: current.index };
    }

    expectedPrev = current.entryHash;
  }

  return { valid: true };
}
