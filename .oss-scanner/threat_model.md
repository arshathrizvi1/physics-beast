# Brilliant Academy - Zero-Trust Threat Model & Security Boundaries
**Framework**: Anthropic OSS Scanner Standard (`anthropics/oss-scanner`)
**Platform**: Next.js 15 (App Router) + Cloudflare Edge Worker + Firebase Admin SDK + Cloudflare R2 / Bunny Stream

---

## 1. System Overview & Architecture
Brilliant Academy is an enterprise educational and streaming platform designed for physics education. It handles user authentication, live broadcast streaming, course purchases, video DRM, and administrative course authoring.

```
+-----------------------------------------------------------------------------------+
| ZONE 0: UNTRUSTED INTERNET (Browsers, Mobile Apps, Search Bots, Malicious Scanners)|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| ZONE 1: CLOUDFLARE EDGE SHIELD (worker.js)                                        |
| - Layer-7 DDoS Mitigation & Sliding-Window Rate Limiting (Burst: 120 / 5s)        |
| - Scanner IP Auto-Quarantine (sqlmap, nikto, nuclei, hydra)                       |
| - Active Deception Canary Traps (/.env, /.git, /wp-admin, /api/internal/debug)    |
| - Reverse Proxy for Auth (__/auth/*) & Strict CORS/CSP Headers                    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| ZONE 2: ZERO-TRUST APPLICATION GATE (src/security/zero-trust-gate.ts)             |
| - Dual-Verification Layer (Timing-Safe Session Tokens, Anti-Replay Nonce, CSRF)   |
| - Zod Input Schema Validation & Cross-Site Scripting (XSS) Sanitization           |
| - Role Scopes: 'authenticated' | 'teacher_or_admin' | 'admin'                     |
+-----------------------------------------------------------------------------------+
       |                                   |                              |
       v                                   v                              v
+---------------+                 +--------------------+        +--------------------+
| ZONE 3: USERS |                 | ZONE 4: TEACHERS   |        | ZONE 5: ADMINS     |
| Student data  |                 | Course content     |        | Full configuration |
| Exam results  |                 | Live broadcasts    |        | Payment ledger     |
+---------------+                 +--------------------+        +--------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| ZONE 6: TRUSTED INFRASTRUCTURE & ENCLAVES                                         |
| - Firebase Admin SDK (Privileged Bypassing Security Rules)                        |
| - Cloudflare R2 Zero-Egress Storage & Bunny Stream CDN                            |
| - Cloudflare D1 Parameterized Tamper-Proof Audit Ledger                           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Threat Actors & Adversary Profiles
1. **Automated Exploit Scanners & Bots**:
   - Capabilities: Crawling for `.env`, `/wp-admin`, probing SSRF proxies, submitting fuzz payloads to API endpoints.
   - Expected Mitigation: Layer-1 Cloudflare Worker canary traps, 403 tarpit response, and immediate 30-minute IP blacklisting.
2. **Unauthenticated External Adversaries**:
   - Capabilities: Attempting to abuse WebAuthn/Passkey registration endpoints, spamming expensive transcode APIs, or forging payment callbacks.
   - Expected Mitigation: Layer-2 zero-trust gates requiring valid Firebase ID tokens, CSRF origin verification, and timing-safe webhook HMAC verification.
3. **Malicious or Compromised Students**:
   - Capabilities: Attempting privilege escalation (setting `role: admin`), attempting to stream courses without purchasing, or ripping DRM protected videos with IDM/DevTools.
   - Expected Mitigation: Firestore rules anti-privilege-escalation diff locks, server-side authoritative payment validation (`resolveAuthoritativeCoursePrice`), dynamic AES-128 HLS key tokens, and DOM trap proxies.
4. **Compromised Instructors/Staff**:
   - Capabilities: Trying to read platform-level secrets (Zoom Client Secret, Gemini keys).
   - Expected Mitigation: Firestore rules denying client reads on `/settings/{docId}`; secrets confined to server-side `env.ts`.

---

## 3. High-Value Assets & Security Invariants
* **Asset 1: User Accounts & Authentication**:
  - *Invariant*: Passkey registration (`/api/passkey/*`) MUST strictly require an existing authenticated session matching the target `uid`.
* **Asset 2: DRM Video Streaming & Course Content**:
  - *Invariant*: HLS AES-128 encryption keys and Bunny Stream playback tokens must never be issued to unauthenticated or unauthorized clients.
* **Asset 3: Financial & Payment Integrity**:
  - *Invariant*: Course prices are computed strictly on the server from the authoritative course database. Client-submitted prices are discarded.
* **Asset 4: Network Isolation & SSRF Prevention**:
  - *Invariant*: Server-side proxies (`/api/pdf-proxy`) must enforce strict hostname whitelisting (R2, Firebase Storage) and completely disallow internal IP addresses (`127.0.0.1`, `169.254.169.254`).
