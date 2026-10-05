import React from 'react';
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
      <h2>Contact Us</h2>
          <p>
            If you have any questions about our Return Policy, please contact us at:<br/>
            <strong>Brilliant Academy</strong><br/>
            No:19 VTG Karunarathna Mawatha, Rakwana<br/>
            Email: arshathrizvi1010@gmail.com<br/>
            Phone: 0757391416
          </p>
      </div>
    </div>
  );
}
