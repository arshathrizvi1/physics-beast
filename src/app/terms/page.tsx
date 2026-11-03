import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Scale, FileText, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Terms & Conditions | Brilliant Academy',
  description: 'Terms of Service, acceptable use policy, educational disclaimers, and payment rules for Brilliant Academy.',
};

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-10">
        <div className="mb-8 border-b border-border pb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-primary hover:underline mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Terms and Conditions of Service</h1>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Effective Date: October 2026 &bull; Governing Law: Democratic Socialist Republic of Sri Lanka
          </p>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-base dark:prose-invert max-w-none text-card-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" /> 1. Acceptance of Terms & Eligibility
            </h2>
            <p>
              By accessing, browsing, registering for, or using the Brilliant Academy platform (including <code className="text-primary font-mono">brillliantacademy.site</code> and our official mobile applications), you agree to be bound by these Terms and Conditions, our <Link href="/privacy-policy" className="text-primary underline">Privacy Policy</Link>, and our <Link href="/cookie-policy" className="text-primary underline">Cookie Policy</Link>.
            </p>
            <p>
              <strong>Minor Consent (Students Under 18):</strong> Brilliant Academy provides educational support primarily for G.C.E. Advanced Level and secondary school students. If you are under the age of 18, you represent that you have obtained verifiable parental or legal guardian consent to register, make payments, and access our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Shield className="w-5 h-5 text-primary" /> 2. Account Security, DRM & Anti-Piracy Protection
            </h2>
            <p>
              Each account registered on Brilliant Academy is licensed strictly for <strong>single-student personal use</strong>. To protect the intellectual property and copyright of our teachers:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Single-Device Session Lock:</strong> Your account is bound to your primary authenticated device. Simultaneous logins across multiple devices or sharing credentials with third parties will automatically revoke access.</li>
              <li><strong>Zero-Tolerance Recording & Downloader Policy:</strong> Screen-recording software, capturing tools, download accelerators, browser rippers, and extensions such as Internet Download Manager (IDM) are strictly prohibited. Our platform implements hardware and browser-level DRM telemetry. Detection of downloader hooks will trigger immediate, automated session lockdown.</li>
              <li><strong>Forensic Watermarking:</strong> All video streams and lesson materials are dynamically embedded with steganographic forensic watermarks containing your student identity. Unauthorized leak or distribution of content constitutes a criminal violation under the Sri Lankan Intellectual Property Act No. 36 of 2003 and international copyright treaties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Scale className="w-5 h-5 text-primary" /> 3. Payments, Billing & Payable.lk Gateway Terms
            </h2>
            <p>
              Course enrollments, monthly class fees, and resource subscriptions are charged on a prepaid basis in Sri Lankan Rupees (LKR) or stated currencies.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Authorized Payment Processor:</strong> All card payments and bank transfers are processed securely by our regulated payment gateway partner, <strong>Payable.lk</strong> (Payable Private Limited). Brilliant Academy does not store or process raw credit/debit card numbers or CVV codes on our servers.</li>
              <li><strong>Payment Confirmation & Access:</strong> Digital access is granted automatically upon successful payment authorization by Payable.lk. In the event of payment delays caused by banking network reconciliation, access will be provisioned immediately upon clearance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> 4. Academic Disclaimer & Limitation of Warranty
            </h2>
            <div className="bg-muted/40 border border-border p-4 rounded-xl text-sm leading-relaxed">
              <p className="font-semibold text-foreground mb-1">
                IMPORTANT EDUCATIONAL & EXAMINATION DISCLAIMER:
              </p>
              <p>
                All lectures, revision notes, model papers, MCQ quizzes, and automated exam analytics provided by Brilliant Academy are strictly intended as supplementary academic revision aids. Brilliant Academy, its instructors, and developers make <strong>no guarantee, warranty, or representation</strong> regarding specific exam grades, island rankings, district ranks, or university admission Z-scores in the Department of Examinations Sri Lanka (G.C.E. A/L or O/L). Academic performance depends entirely upon individual student commitment, diligence, and official examination grading.
              </p>
              <p className="mt-2">
                All platform services, stream playback, and software features are provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, whether express or implied.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" /> 5. DMCA & Copyright Safe Harbor Procedure
            </h2>
            <p>
              Brilliant Academy respects copyright law. If you are a copyright owner or an authorized agent who believes that any material available on our platform infringes upon your copyright, please deliver a formal takedown notice to our designated Copyright Agent:
            </p>
            <div className="bg-card border border-border p-4 rounded-xl text-sm space-y-1">
              <div><strong>Designated Copyright Agent:</strong> Arshad Rizvi (Compliance Officer)</div>
              <div><strong>Email:</strong> <a href="mailto:arshathrizvi1010@gmail.com" className="text-primary hover:underline">arshathrizvi1010@gmail.com</a></div>
              <div><strong>Physical Address:</strong> Brilliant Academy, No: 19 VTG Karunarathna Mawatha, Rakwana, Sri Lanka</div>
              <div><strong>Subject Line:</strong> DMCA Copyright Takedown Notice &mdash; Brilliant Academy</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Your notice must include: identification of the copyrighted work, URL/location of the infringing material, your contact details, and a statement of good-faith belief under penalty of perjury.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Scale className="w-5 h-5 text-primary" /> 6. Dispute Resolution, Arbitration & Governing Law
            </h2>
            <p>
              These Terms of Service and any dispute arising out of or related to your use of Brilliant Academy shall be governed by and construed in accordance with the laws of the <strong>Democratic Socialist Republic of Sri Lanka</strong>, without regard to its conflict of law principles.
            </p>
            <p>
              Any controversy, claim, or dispute that cannot be resolved amicably through mutual discussion within thirty (30) days shall be submitted to binding arbitration in Colombo, Sri Lanka, in accordance with the Arbitration Act No. 11 of 1995.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" /> 7. Account Termination & Right to be Forgotten
            </h2>
            <p>
              You have the right to request deletion of your account and personal data at any time via your <Link href="/profile" className="text-primary underline">Account Settings</Link> or by contacting our Data Protection Officer. Brilliant Academy also reserves the right to suspend or terminate accounts that breach our DRM policies, terms, or conduct guidelines.
            </p>
          </section>

          <section className="border-t border-border pt-6 mt-8">
            <h2 className="text-xl font-bold text-foreground">8. Contact Information</h2>
            <p className="text-sm">
              If you have any questions regarding these Terms and Conditions, please contact us:
            </p>
            <div className="mt-2 text-sm space-y-1 text-muted-foreground">
              <p><strong className="text-foreground">Brilliant Academy</strong></p>
              <p>No: 19 VTG Karunarathna Mawatha, Rakwana, Sri Lanka</p>
              <p>Support Email: <a href="mailto:arshathrizvi1010@gmail.com" className="text-primary hover:underline">arshathrizvi1010@gmail.com</a></p>
              <p>Helpline: <a href="tel:0757391416" className="text-primary hover:underline">0757391416</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
