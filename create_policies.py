import os

return_policy = """import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ReturnPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-card rounded-2xl shadow-sm border border-border p-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-primary hover:underline mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Return & Refund Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: October 2026</p>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none text-card-foreground">
          <h2>1. Digital Products and Subscriptions</h2>
          <p>
            Brilliant Academy provides digital educational content, live online classes, and recorded materials. Due to the digital nature of our services, all sales are considered final once access to the course content has been granted.
          </p>
          <p>
            We do not offer refunds or returns for monthly class fees, digital course enrollments, or subscription fees after the student has accessed the platform, viewed materials, or attended live sessions.
          </p>

          <h2>2. Exceptions and Technical Issues</h2>
          <p>
            We may, at our sole discretion, issue a refund or credit under the following exceptional circumstances:
          </p>
          <ul>
            <li>If you are incorrectly charged multiple times for the same transaction due to a technical error on our platform or our payment gateway.</li>
            <li>If you are unable to access the course content entirely due to a prolonged, unresolvable technical fault on our servers, and our support team cannot provide a solution within a reasonable timeframe.</li>
          </ul>

          <h2>3. Cancellation Policy</h2>
          <p>
            You may cancel your monthly subscription at any time to prevent future billing. However, cancellation does not entitle you to a refund for the current billing cycle or any past cycles. Upon cancellation, you will retain access to the course materials until the end of your currently paid period.
          </p>

          <h2>4. Physical Materials (If Applicable)</h2>
          <p>
            If your course enrollment includes the shipment of physical study materials (e.g., printed tutes or books), returns are only accepted if the items are damaged upon arrival. You must notify us within 7 days of delivery with photographic evidence of the damage to arrange a replacement.
          </p>

          <h2>5. Contact Us</h2>
          <p>
            If you believe you are entitled to a refund based on the criteria above, or if you have any questions regarding this policy, please contact our support team at:
          </p>
          <p>
            <strong>Email:</strong> support@brilliantacademy.com<br />
            <strong>Phone:</strong> (Your Contact Number)<br />
            <strong>Address:</strong> Brilliant Academy, Sri Lanka
          </p>
        </div>
      </div>
    </div>
  );
}
"""

privacy_policy = """import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-card rounded-2xl shadow-sm border border-border p-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-primary hover:underline mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: October 2026</p>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none text-card-foreground">
          <h2>1. Introduction</h2>
          <p>
            Brilliant Academy ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our platform and tell you about your privacy rights.
          </p>

          <h2>2. The Data We Collect About You</h2>
          <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
          <ul>
            <li><strong>Identity Data:</strong> includes first name, last name, username, title, date of birth, gender, and National Identity Card (NIC) details (where required for specific batches).</li>
            <li><strong>Contact Data:</strong> includes billing address, email address, and telephone numbers.</li>
            <li><strong>Technical & Usage Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting, operating system, and information about how you use our website, courses, and video player (including study time tracking).</li>
            <li><strong>Transaction Data:</strong> includes details about payments to and from you and other details of products and services you have purchased from us. Note: We do not store your credit card details directly; these are handled securely by our payment gateway (PayHere).</li>
          </ul>

          <h2>3. How We Use Your Personal Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul>
            <li>To register you as a new student and create your account.</li>
            <li>To process and deliver your course content, including managing payments, fees, and charges.</li>
            <li>To monitor your academic progress and track your study minutes for leaderboards and gamification.</li>
            <li>To manage our relationship with you, including notifying you about changes to our terms or privacy policy.</li>
            <li>To administer and protect our business and this website (including troubleshooting, data analysis, testing, system maintenance, support, reporting, and hosting of data).</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. We limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.
          </p>

          <h2>5. Your Legal Rights</h2>
          <p>
            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, or to object to processing.
          </p>

          <h2>6. Contact Details</h2>
          <p>
            If you have any questions about this privacy policy or our privacy practices, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> support@brilliantacademy.com<br />
          </p>
        </div>
      </div>
    </div>
  );
}
"""

terms_policy = """import React from 'react';
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
"""

with open(r"C:\Projects\Brilliant Academy\physics-beast\src\app\return-policy\page.tsx", "w", encoding="utf-8") as f:
    f.write(return_policy)

with open(r"C:\Projects\Brilliant Academy\physics-beast\src\app\privacy-policy\page.tsx", "w", encoding="utf-8") as f:
    f.write(privacy_policy)

with open(r"C:\Projects\Brilliant Academy\physics-beast\src\app\terms\page.tsx", "w", encoding="utf-8") as f:
    f.write(terms_policy)

print("Policy pages created successfully!")
