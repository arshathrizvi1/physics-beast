#!/usr/bin/env node
/**
 * HLS AES-128 Encryption Key Generator for Brilliant Academy
 * Generates an encrypted key token and FFmpeg keyinfo file.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateHlsKey(keyOutPath = '/tmp/hls_enc.key', keyInfoOutPath = '/tmp/hls_keyinfo.txt') {
  const secret = process.env.RTMP_CALLBACK_SECRET || 'ba_secure_hls_stream_key_2026';
  const websiteUrl = (process.env.WEBSITE_URL || 'https://brillliantacademy.site').replace(/\/$/, '');

  // 1. Generate 16-byte random AES-128 encryption key
  const rawKey = crypto.randomBytes(16);
  // 2. Generate 16-byte random IV
  const ivHex = crypto.randomBytes(16).toString('hex');

  // 3. Encrypt the raw key with server secret to produce a tamper-proof stateless token
  const cipherKey = crypto.createHash('sha256').update(secret).digest();
  const cipherIv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, cipherIv);
  const enc = Buffer.concat([cipher.update(rawKey), cipher.final()]);
  const token = cipherIv.toString('hex') + ':' + enc.toString('hex');

  const keyUri = `${websiteUrl}/api/stream/hls-key?token=${encodeURIComponent(token)}`;

  // 4. Write binary key file
  fs.writeFileSync(keyOutPath, rawKey);

  // 5. Write FFmpeg keyinfo file:
  // Line 1: Key URI (requested by player)
  // Line 2: Path to key file on disk
  // Line 3: IV (optional in hex)
  const keyInfoContent = `${keyUri}\n${keyOutPath}\n${ivHex}\n`;
  fs.writeFileSync(keyInfoOutPath, keyInfoContent, 'utf8');

  console.log(`[HLS Encrypt] Generated AES-128 key at: ${keyOutPath}`);
  console.log(`[HLS Encrypt] Key URI: ${keyUri}`);
  console.log(`[HLS Encrypt] KeyInfo file written to: ${keyInfoOutPath}`);

  return { keyUri, token, keyInfoPath: keyInfoOutPath };
}

if (require.main === module) {
  const keyPath = process.argv[2] || '/tmp/hls_enc.key';
  const infoPath = process.argv[3] || '/tmp/hls_keyinfo.txt';
  generateHlsKey(keyPath, infoPath);
}

module.exports = { generateHlsKey };
