# Legal, Privacy & Tracking Pixel Compliance Guide
*Protecting Vibe-Coded Applications from Class-Action Lawsuits and Regulatory Fines*

---

## ⚠️ The Tracking Pixel Threat (@dr.erinjacques)
In video `De-pHkzxiuX`, Dr. Erin Jacques highlights how a single tracking pixel mistake can trigger massive class-action lawsuits.

### Key Legal Risks:
1. **Video Privacy Protection Act (VPPA)**:
   - Federal law prohibiting the disclosure of consumers' video-viewing history without separate, standalone written consent.
   - If Meta Pixel or Google Analytics fires on pages with embedded videos and passes the URL or video title alongside an `fbp` user cookie, statutory damages are **$2,500 per violation**.
2. **California Invasion of Privacy Act (CIPA) & State Wiretapping Laws**:
   - Plaintiffs' attorneys file lawsuits claiming third-party session replays (Hotjar, FullStory) or pixels recording form keystrokes constitute illegal wiretapping without mutual consent.
3. **GDPR & ePrivacy Directive (EU/UK)**:
   - Prohibits firing any non-essential analytics or marketing cookies/pixels without **prior, explicit, unbundled opt-in consent**.
4. **Health & Sensitive Data (HIPAA / FTC Health Breach Rule)**:
   - Transmitting form inputs regarding health, fitness, medical symptoms, or personal identities to ad networks is illegal without BAA agreements.

---

## 🛡️ The Implementation Blueprint in Devnivo

### 1. Zero Tracking Prior to Consent
No tracking pixels or analytics tags should ever be hardcoded into `<head>` with automatic loading.
Instead, guard all scripts behind a consent check:

```javascript
// lib/trackingGuard.js
export function hasConsentForTracking() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('devnivo_cookie_consent') === 'accepted';
  } catch {
    return false;
  }
}
```

### 2. Form Input Masking & PII Redaction
Ensure all input fields are marked to prevent session replay recording:
```html
<input
  type="password"
  data-private="true"
  autocomplete="off"
  placeholder="Password"
/>
```

### 3. Clear Choice Cookie Banner
Provide clear options:
- **Essential Only**: Enables only security cookies and session management. Blocks all external analytics and tracking pixels.
- **Accept All**: Enables performance metrics.

---

## ⚖️ Essential Contractual Terms (@millee.md)

1. **Limitation of Liability & Damage Cap**:
   - Cap total damages to the actual amounts paid by the client in the 3 months preceding the claim.
   - Disclaim indirect, consequential, punitive, or loss-of-data damages.
2. **AI Output Disclaimer**:
   - Clarify that AI-assisted outputs, design recommendations, and code snippets are provided "as-is" and must be verified by the client prior to commercial deployment.
3. **50% Kickoff Deposit & Milestone Policy**:
   - 50% advance deposit required prior to development kickoff.
   - Non-refundable once engineering sprints begin, except within a 24-hour grace period if zero engineering work has commenced.
   - Client is responsible for non-refundable third-party API and gateway fees.
4. **Client Asset IP Warranty**:
   - The client warrants that all logos, imagery, and text provided do not infringe third-party trademarks or copyrights.
