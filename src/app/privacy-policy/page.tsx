import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Brilliant Academy',
  description: 'Learn how Brilliant Academy protects your personal and academic data in full compliance with data privacy regulations.',
};

export default function PrivacyPolicy() {
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
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
              <p className="text-muted-foreground text-sm mt-1">Last updated: November 2026</p>
            </div>
          </div>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none text-card-foreground">
          <h2>1. Introduction</h2>
          <p>
            Brilliant Academy ("we", "our", or "us"), located at No: 19 VTG Karunarathna Mawatha, Rakwana, Sri Lanka, respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, process, store, and safeguard your information when you access our platform, enroll in courses, attend live classes, and use our mobile applications.
          </p>

          <h2>2. The Data We Collect</h2>
          <p>We collect and process the following categories of information to provide educational services:</p>
          <ul>
            <li><strong>Identity Data:</strong> Full name, student profile picture, date of birth, grade/batch, and National Identity Card (NIC) number (used strictly for student verification and admission).</li>
            <li><strong>Contact Data:</strong> Student email address, student phone number, and parent/guardian phone number (used for emergency notices and academic report delivery).</li>
            <li><strong>Academic & Engagement Data:</strong> Video watch history, study minutes tracking, mock examination submissions, quiz scores, doubt forum discussions, and live class attendance.</li>
            <li><strong>Security & Technical Data:</strong> IP address, device fingerprints, login timestamps, and anti-tamper telemetry used to enforce single-device session integrity and prevent course video piracy.</li>
            <li><strong>Billing & Transaction Data:</strong> Course payment records, transaction reference IDs, and payment dates. <em>Note:</em> We do not store raw credit/debit card numbers on our servers; all payments are processed through our PCI-DSS compliant payment gateway partner (Payable.lk).</li>
          </ul>

          <h2>3. How We Use Your Data & Legal Basis</h2>
          <p>We process your data strictly under the following lawful bases:</p>
          <ul>
            <li><strong>Contractual Performance:</strong> To create your student account, grant course access, deliver live lectures, and issue educational certificates.</li>
            <li><strong>Legitimate Educational Interests:</strong> To generate performance leaderboards, monitor academic improvement, and provide personalized teacher guidance.</li>
            <li><strong>Security & Legal Obligations:</strong> To protect digital intellectual property against illicit reproduction, detect account sharing, prevent fraud, and comply with applicable laws.</li>
          </ul>

          <h2>4. Data Sharing & Subprocessors</h2>
          <p>
            We do not sell, rent, or monetize your personal data. We only share data with verified technical infrastructure providers bound by strict confidentiality:
          </p>
          <ul>
            <li><strong>Cloudflare Inc.:</strong> WAF security, edge caching, and zero-egress media storage (R2).</li>
            <li><strong>Google Cloud & Firebase:</strong> Encrypted identity authentication, database management, and real-time messaging.</li>
            <li><strong>BunnyWay d.o.o. (Bunny Stream):</strong> High-definition video transcoding and DRM media distribution.</li>
            <li><strong>Payable (Pvt) Ltd:</strong> Authorized payment processing and verification gateway.</li>
            <li><strong>Zoom Video Communications:</strong> Encrypted interactive live video broadcast delivery.</li>
          </ul>

          <h2>5. Student Minors & Parental Consent</h2>
          <p>
            Brilliant Academy provides educational services to secondary and advanced level students. Students under the age of 18 enroll with the express consent and supervision of a parent or legal guardian. Parents have the right to review their child's academic progress and request corrections to student records.
          </p>

          <h2>6. Data Retention & Erasure</h2>
          <p>
            We retain student data for the duration of active enrollment plus standard regulatory academic record-keeping periods. You have the right to request the permanent deletion of your account and personal data at any time through your Profile settings or by contacting our data protection team.
          </p>

          <h2>7. Data Breach Notification</h2>
          <p>
            In the event of a confirmed security incident affecting personal data, Brilliant Academy is committed to notifying affected users and relevant authorities within 72 hours of verification in accordance with international data privacy standards.
          </p>

          <h2>8. Contact Our Data Protection Team</h2>
          <p>
            For questions, data access requests, or privacy inquiries:
          </p>
          <div className="not-prose p-5 rounded-2xl border border-border bg-secondary/10 mt-3">
            <h4 className="font-bold text-foreground">Brilliant Academy</h4>
            <p className="text-sm text-muted-foreground mt-1">
              No: 19 VTG Karunarathna Mawatha, Rakwana, Sri Lanka<br />
              Official Email: <a href="mailto:arshathrizvi1010@gmail.com" className="text-primary hover:underline font-medium">arshathrizvi1010@gmail.com</a><br />
              Direct Phone: <a href="tel:0757391416" className="text-primary hover:underline font-medium">0757391416</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
