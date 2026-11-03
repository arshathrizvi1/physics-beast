import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Phone } from 'lucide-react';

export const metadata = {
  title: 'Return & Refund Policy | Brilliant Academy',
  description: 'Official return and refund policy for Brilliant Academy digital courses, subscriptions, and learning materials.',
};

export default function ReturnPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-10">
        <div className="mb-8 border-b border-border pb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-primary hover:underline mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Return &amp; Refund Policy</h1>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Last Updated: October 2026 &bull; Brilliant Academy E-Learning Platform
          </p>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-base dark:prose-invert max-w-none text-card-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <AlertCircle className="w-5 h-5 text-amber-500" /> 1. Digital Products &amp; Course Enrollment (Non-Refundable)
            </h2>
            <p>
              Brilliant Academy delivers proprietary, copyright-protected digital educational services, including live interactive online lectures, encrypted video archives, exam simulations, and downloadable revision resources.
            </p>
            <div className="bg-muted/40 border border-border p-4 rounded-xl text-sm leading-relaxed">
              <p className="font-semibold text-foreground mb-1">
                Policy on Instant Digital Delivery:
              </p>
              <p>
                In accordance with global digital commerce standards and consumer protection frameworks for electronic goods, <strong>all course fees, batch enrollments, and monthly subscription purchases are final and non-refundable</strong> once account access has been provisioned, login credentials issued, or streaming commenced.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> 2. Eligible Refund Exceptions &amp; Technical Errors
            </h2>
            <p>
              We are committed to fairness and transparent billing. A full or partial refund will be approved strictly under the following verifiable conditions:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                <strong>Duplicate Transaction Charges:</strong> If an unintended technical glitch in our payment gateway (Payable.lk) or your bank results in multiple identical deductions for the same billing period, the excess charge will be refunded to your original payment method.
              </li>
              <li>
                <strong>Total Platform Outage:</strong> If persistent server failure prevents access to paid live sessions or learning materials for more than 7 consecutive business days, and our engineering team is unable to provide catch-up recordings or remedy the failure.
              </li>
              <li>
                <strong>Course Cancellation by Brilliant Academy:</strong> If a scheduled batch or live revision module is cancelled in its entirety prior to commencement without a replacement schedule.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <RefreshCw className="w-5 h-5 text-primary" /> 3. Subscription Cancellations
            </h2>
            <p>
              Students enrolled on a recurring monthly billing plan may cancel their subscription at any time prior to the next billing date. Cancellation takes effect at the end of the current paid billing cycle. You will retain full access to active lessons until the end of your billing period, after which no further charges will be incurred.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Phone className="w-5 h-5 text-primary" /> 4. Refund Claim Procedure
            </h2>
            <p>
              To initiate a refund request under the eligible criteria above, please submit a written claim within <strong>7 days</strong> of the transaction date. Your request must include:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>Registered student email and phone number.</li>
              <li>Payment receipt reference from Payable.lk or bank confirmation SMS/email.</li>
              <li>A concise description and proof of the duplicate charge or technical defect.</li>
            </ol>
            <p className="text-sm mt-3">
              Approved refunds will be processed through the original payment channel (Payable.lk / issuing bank) within 5 to 10 business days.
            </p>
          </section>

          <section className="border-t border-border pt-6 mt-8">
            <h2 className="text-xl font-bold text-foreground">5. Official Billing &amp; Support Contact</h2>
            <p className="text-sm text-muted-foreground">
              For billing inquiries, reconciliation assistance, or refund claims, our administrative desk is available:
            </p>
            <div className="mt-3 bg-card border border-border p-4 rounded-xl text-sm space-y-1">
              <div><strong className="text-foreground">Brilliant Academy</strong></div>
              <div>Address: No: 19 VTG Karunarathna Mawatha, Rakwana, Sri Lanka</div>
              <div>Direct Phone / WhatsApp: <a href="tel:0757391416" className="text-primary hover:underline font-semibold">0757391416</a></div>
              <div>Official Billing Email: <a href="mailto:arshathrizvi1010@gmail.com" className="text-primary hover:underline font-semibold">arshathrizvi1010@gmail.com</a></div>
              <div>Support Hours: Monday &ndash; Saturday, 8:00 AM &ndash; 7:00 PM (IST)</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
