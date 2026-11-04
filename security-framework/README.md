# Devnivo Universal Vibe-Coding Security & Architecture Framework

This folder contains the complete, battle-tested security, legal, and architectural framework built for **Devnivo**. You can drop these documents and prompts into **any new or existing project** (using Claude Code, Cursor, Copilot, Antigravity, or ChatGPT) to automatically instruct your AI coding agent to enforce bank-grade security, prevent vibe-coding mistakes, and comply with all legal requirements.

---

## 📁 What's Inside

1. **[`MASTER_AI_AGENT_PROMPT.md`](./MASTER_AI_AGENT_PROMPT.md)**  
   *The Ultimate Universal Agent Prompt.* Copy and paste this prompt into Claude Code, Cursor rules (`.cursorrules`), or Antigravity to guarantee the agent builds zero-trust security, parameterized SQL, database pricing authority, honeypots, rate limiting, and 100% test coverage.

2. **[`20_POINT_SECURITY_UNSLOP_GUIDE.md`](./20_POINT_SECURITY_UNSLOP_GUIDE.md)**  
   The complete 20-point checklist by `@techwithprateek` and `@byarnieverma`. Detailed explanations, attack vectors, and exact production code patterns to eliminate SQLi, prompt injection, RLS bypasses, IDOR, open redirects, weak hashing, and client-side price tampering.

3. **[`LEGAL_AND_TRACKING_PIXEL_COMPLIANCE.md`](./LEGAL_AND_TRACKING_PIXEL_COMPLIANCE.md)**  
   Protects against the lawsuits warned by `@millee.md` (Michael Quoc Ly) and `@dr.erinjacques` (Dr. Erin Jacques). Covers tracking pixel wiretapping liabilities (VPPA, CIPA, HIPAA, GDPR), strict opt-in cookie banners, limitation of liability clauses, IP warranties, and 50% milestone refund terms.

4. **[`MERGEGATE_PRECOMMIT_SETUP.md`](./MERGEGATE_PRECOMMIT_SETUP.md)**  
   The 5-stage automated gatekeeper from `@fullbytedeveloper` (Kamil Kamili). Step-by-step setup for `gitleaks` (secret scanning), `knip` (dead code), `jscpd` (code duplication), `osv-scanner` (vulnerability audit), and `lefthook` pre-commit hooks.

5. **[`CLAUDE.md`](./CLAUDE.md)**  
   A plug-and-play project memory file to place in the root of any repository. Anthropic and leading AI builders recommend `CLAUDE.md` to ensure your AI agent follows strict build/test rules, architectural conventions, and absolute file path safety.

6. **[`APP_LAUNCH_POLISH_CHECKLIST.md`](./APP_LAUNCH_POLISH_CHECKLIST.md)**  
   Based on `@lincolndevine`'s 25+ app rejection guide. Covers account deletion (Apple 5.1.1(v) & GDPR), loading skeletons, empty states, transactional email receipts, and mobile-responsive layout hygiene.

7. **[`TRANSACTIONAL_EMAIL_ARCHITECTURE.md`](./TRANSACTIONAL_EMAIL_ARCHITECTURE.md)**  
   The master email deliverability guide (referencing Instagram Reel `DfNU_Z9gk5b`). Covers avoiding the Resend Sandbox Domain Trap, DNS records (SPF, DKIM, DMARC), the 6 indispensable email triggers (OTPs, Receipts, Scope Confirmations, Inquiries, Onboarding), multipart plain-text fallback, and Zero-Trust secret isolation.

8. **[`SECURE_IMAGE_UPLOAD_ARCHITECTURE.md`](./SECURE_IMAGE_UPLOAD_ARCHITECTURE.md)**  
   The 10-pillar zero-trust media and file upload architecture. Covers binary magic-byte inspection (PNG, JPEG, WebP, GIF, PDF), SVG script execution rejection, EXIF GPS stripping, path traversal blocking, 5MB ceilings, and content-disposition sandboxing.

---

## 🚀 How to Use in a New Project

1. Copy the `security-framework/` folder into your new project.
2. Copy `security-framework/CLAUDE.md` to your project root as `CLAUDE.md` (or `.cursorrules`).
3. Whenever starting a new coding session with an AI agent, instruct it:
   > *"Read `security-framework/MASTER_AI_AGENT_PROMPT.md` and follow all instructions strictly before writing any code."*
