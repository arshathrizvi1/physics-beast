import React from 'react';
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
      <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:<br/>
            <strong>Brilliant Academy</strong><br/>
            No:19 VTG Karunarathna Mawatha, Rakwana<br/>
            Email: arshathrizvi1010@gmail.com<br/>
            Phone: 0757391416
          </p>
        </div>
      </div>
    </div>
  );
}
