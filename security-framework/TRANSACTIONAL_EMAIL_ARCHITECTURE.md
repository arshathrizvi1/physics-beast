# Transactional Email & Deliverability Architecture
*Master Guide for Vibe-Coded Web Applications, SaaS & E-Commerce Platforms.*
*Reference: Instagram Reel DfNU_Z9gk5b & Modern Developer Best Practices.*

---

## 1. The Core Dilemma in AI Vibe Coding & Email

When vibe coding an application with AI assistants (Claude Code, Cursor, Copilot, Antigravity), adding email is usually where most apps break in production:
1. **The Sandbox Domain Trap**: Resend and modern transactional email services reject or silently drop emails sent to third-party recipients if your custom domain is not yet verified via DNS records (SPF, DKIM, DMARC).
2. **The Spam Folder Penalty**: Sending HTML-only emails without a multipart plain-text fallback triggers spam filters (Google Workspace, Microsoft Outlook, SpamAssassin) and lands critical receipts in the Junk/Spam folder.
3. **Secret Leaks in Client Code**: Vibe-coders often put `NEXT_PUBLIC_RESEND_API_KEY` in frontend `.env` files, letting malicious visitors steal the API key to blast spam campaigns.
4. **Open Mail Relay Abuse**: Unprotected `/api/send-email` endpoints get abused by bots to send phishing emails from your domain.

---

## 2. The 6 Mandatory Transactional Email Types

Every production-grade web application requires these 6 transactional email types:

| Email Type | Purpose | TTL / Expiry | Critical Elements |
|---|---|---|---|
| `verification` | Email verification & badge activation | 5 Minutes (Strict) | 6-digit numeric OTP, countdown notice, single-use |
| `reset_password` | Account recovery & password reset | 5 Minutes (Strict) | 6-digit OTP, security warning, zero link leakage |
| `payment_receipt` | Verified payment receipt & tax record | Permanent | Transaction ref, order ID, amount paid, remaining balance, method |
| `order_confirmed` | Project scope / order placed | Permanent | Package name, review timeline, founder kickoff link |
| `contact_lead` | Instant inquiry auto-responder | Immediate | Booking ref, 24-hr SLA, direct WhatsApp/phone link |
| `welcome` | Client onboarding & portal activation | Permanent | Portal URL, credential summary, getting started steps |

---

## 3. Resend DNS Configuration (SPF, DKIM, DMARC)

To bypass the sandbox and deliver 100% of emails directly to the user's **Primary Inbox**, configure these three DNS records in your domain registrar (Cloudflare DNS, Namecheap, GoDaddy):

### 1. DKIM (DomainKeys Identified Mail)
* **Type:** `TXT`
* **Name / Host:** `resend._domainkey` (or your subdomain key provided by Resend)
* **Value:** `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...`

### 2. SPF (Sender Policy Framework)
* **Type:** `TXT`
* **Name / Host:** `@` (or `bounces.yourdomain.com`)
* **Value:** `v=spf1 include:amazonses.com ~all`

### 3. DMARC (Domain-based Message Authentication)
* **Type:** `TXT`
* **Name / Host:** `_dmarc`
* **Value:** `v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com; pct=100; sp=none; aspf=r;`

---

## 4. The Sandbox Domain Auto-Fallback Pattern

If you are launching a prototype or your custom domain is still pending DNS propagation, use this automatic edge fallback pattern:

```javascript
let fromAddress = 'Your Brand Security <noreply@yourdomain.com>';

let resendRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: fromAddress,
    reply_to: 'contact@yourdomain.com',
    to: [to],
    subject,
    html,
    text, // Always include plain-text!
    headers: {
      'List-Unsubscribe': '<mailto:unsubscribe@yourdomain.com?subject=unsubscribe>',
    },
  }),
});

let resendData = await resendRes.json();

// Automatic Fallback to Sandbox Domain if DNS is not yet verified
if (!resendRes.ok && resendData?.message?.includes('domain is not verified')) {
  fromAddress = 'Your Brand Security <onboarding@resend.dev>';
  resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      reply_to: 'contact@yourdomain.com',
      to: [to],
      subject,
      html,
      text,
    }),
  });
}
```

---

## 5. Multipart MIME: Why Plain-Text Fallback is Non-Negotiable

Every HTML email **must** accompany a clean plain-text alternative.
- **Spam Score Reduction**: SpamAssassin deducts points when an email lacks a `text/plain` section.
- **Accessibility & Wearables**: Apple Watches and screen readers prioritize the plain-text body.
- **Low-Bandwidth Reliability**: Renders immediately even if external CSS or images fail to download.

```javascript
export function generateOtpEmailPlainText({ type, name, code, link, meta }) {
  const safeName = name || 'Valued Client';
  const safeLink = link || 'https://yourdomain.com/dashboard';

  if (type === 'payment_receipt') {
    return `Official Payment Receipt\n\nThank you, ${safeName}!\nTransaction Ref: ${meta.txnId}\nAmount Paid: ${meta.amountPaid}\nView: ${safeLink}`;
  }
  // Fallback OTP
  return `Your Verification Code\n\nHi ${safeName},\nYour 6-digit OTP code is: ${code}\nValid for 5 minutes.`;
}
```

---

## 6. Zero-Trust Security Checklist for Email

- [x] **No Frontend Keys**: `RESEND_API_KEY` is saved only in Cloudflare Worker Secrets (`wrangler secret put RESEND_API_KEY`) or serverless backend environment variables.
- [x] **Strict Input Validation**: Recipient email is validated with regex (`sanitizeEmail`).
- [x] **Honeypot Protection**: Secret honeypot fields (`isAdmin`, `website`, `url`) instantly flag and blacklist spam bots.
- [x] **Rate Limiting**: IP and fingerprint rate limits prevent open relay abuse.
- [x] **HTML Entity Sanitization**: All user variables (`name`, `packageName`, `orderId`) are escaped with `escapeHtml` to prevent email HTML injection (CSS phishing / tag hijacking).
- [x] **Unsubscribe Compliance**: `List-Unsubscribe` header and physical address included in footer for CAN-SPAM and GDPR Art. 13 compliance.
