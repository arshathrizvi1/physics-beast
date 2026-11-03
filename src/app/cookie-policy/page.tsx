import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Cookie, Shield, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Cookie Policy | Brilliant Academy',
  description: 'Understand how Brilliant Academy uses cookies and local storage to secure your learning sessions, video streams, and educational progress.',
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-card rounded-2xl shadow-sm border border-border p-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Cookie className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cookie & Tracking Policy</h1>
              <p className="text-muted-foreground text-sm mt-1">Last updated: November 2026</p>
            </div>
          </div>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none text-card-foreground">
          <h2>1. What Are Cookies?</h2>
          <p>
            Cookies are small text files placed on your device (computer, tablet, or smartphone) when you visit our website. They allow the Brilliant Academy platform to recognize your device, maintain your active student login session, remember your preferences, and protect your account from unauthorized hijacking.
          </p>

          <h2>2. How We Use Cookies & Local Storage</h2>
          <p>
            Brilliant Academy believes in strict privacy. We categorize our cookies and client storage mechanisms as follows:
          </p>

          <div className="my-4 space-y-4 not-prose">
            <div className="p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span>1. Strictly Necessary & Security Cookies (Mandatory)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Essential for the core platform to function. These include cryptographic session tokens (<code>ba_admin_session</code>), Firebase Authentication tokens, anti-CSRF request nonces, and Cloudflare Edge DDoS mitigation tokens. Without these, you cannot log in, take exams, or view your enrolled courses.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>2. Functional & Academic Continuity Storage</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Used to remember your selected dark/light theme, playback volume, study progress (video timestamp resumption), and cookie consent preferences (<code>ba_cookie_consent</code>).
              </p>
            </div>
          </div>

          <h2>3. Third-Party Cookies & Embedded Players</h2>
          <p>
            Some educational resources on our platform may use embedded components from verified partners to deliver live classes and educational videos:
          </p>
          <ul>
            <li><strong>Cloudflare & Bunny Stream:</strong> Used for zero-egress, high-definition HLS video streaming and DDoS defense.</li>
            <li><strong>Google Firebase:</strong> Used for encrypted authentication, real-time doubt clearing, and database sync.</li>
            <li><strong>Payable.lk:</strong> Used for secure payment processing (PCI-DSS Level 1 compliant).</li>
            <li><strong>Zoom Video Communications:</strong> Used when attending interactive live broadcast lectures.</li>
          </ul>

          <h2>4. Managing and Disabling Cookies</h2>
          <p>
            You have the right to decide whether to accept or reject non-essential cookies. You can update your preferences anytime via our Cookie Consent banner or adjust your web browser settings to block or delete cookies. Please note that if you choose to reject strictly necessary cookies, key platform features (such as course video playback, exam submissions, and secure student login) will not function.
          </p>

          <h2>5. Contact & Data Privacy Requests</h2>
          <p>
            If you have questions about our use of cookies or wish to request data erasure under privacy laws, please contact our data protection team:
          </p>
          <div className="not-prose p-4 rounded-xl border border-border bg-card mt-3">
            <p className="text-sm font-semibold text-foreground">Brilliant Academy</p>
            <p className="text-xs text-muted-foreground mt-1">
              No: 19 VTG Karunarathna Mawatha, Rakwana, Sri Lanka<br />
              Email: <a href="mailto:arshathrizvi1010@gmail.com" className="text-primary hover:underline">arshathrizvi1010@gmail.com</a><br />
              Phone: 0757391416
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
