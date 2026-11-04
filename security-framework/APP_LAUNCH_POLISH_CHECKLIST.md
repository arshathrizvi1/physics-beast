# App Launch Polish & App Store Rejection Prevention Guide
*Based on @lincolndevine's 25+ App Launch Guide (Reel DfPZBbABzET)*

Avoid the top reasons vibe-coded applications get rejected from the Apple App Store, Google Play Store, or criticized by early users:

---

## 🚫 Top Rejection Causes & Fixes

### 1. Mandatory In-App Account Deletion (Apple Guideline 5.1.1(v) & GDPR Art. 17)
- **Rule**: If an app allows account creation, it **MUST** allow users to initiate account deletion from within the app.
- **Fix**: Provide a dedicated "Delete My Account & Personal Data" button in the user profile/dashboard. When triggered, purge user records from database tables and revoke active sessions.

### 2. Functional Support Contact & Legal Accessibility
- **Rule**: Apps must provide an active support email or contact method and clear links to Privacy Policy and Terms of Service.
- **Fix**: Accessible in header, footer, modal drawers, and dashboard.

### 3. Polish & Anti-Slop UI Hygiene
- **Empty States**: Never show a blank white page when a user has no orders or data. Always render helpful, styled empty-state placeholders with clear calls to action.
- **Loading Skeletons**: Use animated pulse skeleton placeholders rather than jarring content jumps.
- **Formatted Values**: Never display raw ISO strings (`2026-11-03T14:30:00.000Z`) or unrounded floating numbers (`$299.00000`). Format currencies and dates according to locale.
- **Mobile Responsive Layouts**: Ensure no elements exceed screen width (`overflow-x: hidden`), and touch targets have at least 44x44px clickable areas.
- **Accessibility & Contrast**: All buttons must have descriptive `aria-label` tags, and text contrast must meet WCAG AA standards.
