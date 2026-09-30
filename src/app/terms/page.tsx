import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-card rounded-2xl shadow-sm border border-border p-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-primary hover:underline mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Business Terms & Conditions</h1>
          <p className="text-muted-foreground mt-2">Last updated: October 2026</p>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none text-card-foreground">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using the Brilliant Academy platform (website and mobile applications), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2>2. Account Security and Anti-Piracy</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. 
          </p>
          <p>
            <strong>Strict DRM and Account Sharing Rules:</strong> Sharing account credentials, downloading, recording, capturing screenshots, or redistributing course videos and materials is strictly prohibited. Our platform employs advanced Digital Rights Management (DRM) and forensic tracking. Any violation of these terms will result in immediate permanent suspension of your account without a refund, and may lead to legal action.
          </p>

          <h2>3. Payments and Subscriptions</h2>
          <p>
            All fees are clearly stated on our platform. By selecting a course or subscription, you agree to pay Brilliant Academy the monthly or one-time subscription fees indicated. Payments will be charged on a pre-pay basis and are processed securely via our authorized payment gateway partners (e.g., PayHere).
          </p>

          <h2>4. Intellectual Property</h2>
          <p>
            All content on this platform, including but not limited to videos, text, graphics, logos, and software, is the property of Brilliant Academy and is protected by international copyright laws. You are granted a limited, non-exclusive, non-transferable license to access and view the content for your personal, non-commercial educational purposes.
          </p>

          <h2>5. User Conduct</h2>
          <p>
            You agree not to use the platform in any way that causes, or may cause, damage to the platform or impairment of the availability or accessibility of the platform. Harassment, abusive language, or inappropriate behavior towards teachers or other students during live classes or in forums will not be tolerated.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            Brilliant Academy provides educational resources on an "as is" basis. While we strive for excellence, we make no guarantees regarding examination results or academic performance. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the platform.
          </p>

          <h2>7. Modifications to Terms</h2>
          <p>
            Brilliant Academy reserves the right to revise these terms at any time without notice. By using this website, you are agreeing to be bound by the then-current version of these Terms and Conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
