import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, Shield, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Accessibility Statement | Brilliant Academy',
  description: 'Our commitment to digital accessibility, WCAG 2.1 AA conformance, and inclusive education for all students.',
};

export default function AccessibilityPolicy() {
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
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Accessibility Statement</h1>
              <p className="text-muted-foreground text-sm mt-1">Last updated: November 2026 • WCAG 2.1 Level AA & ADA Title III</p>
            </div>
          </div>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none text-card-foreground">
          <h2>1. Inclusive Education Commitment</h2>
          <p>
            Brilliant Academy is dedicated to making quality physics education and academic materials accessible to every student, including learners with visual, auditory, cognitive, or physical disabilities. We aim to conform to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>.
          </p>

          <h2>2. Technical Accessibility Features</h2>
          <div className="my-4 space-y-4 not-prose">
            <div className="p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Screen Reader & Assistive Technology</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Semantic HTML landmarks, ARIA live regions for quiz timers, descriptive alternative text for educational diagrams, and explicit form input labels across all student flows.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span>Keyboard Navigation & Focus Management</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Full keyboard accessibility for lecture players, exam submission modals, and profile navigation without requiring a mouse. High-visibility focus indicators help track navigation.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <Eye className="w-4 h-4 text-primary" />
                <span>High Contrast & Adaptive Display</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Built-in high-contrast dark and light modes, scalable vector typography, and full compatibility with OS-level zoom controls up to 200% without loss of content.
              </p>
            </div>
          </div>

          <h2>3. Feedback & Accommodation Requests</h2>
          <p>
            If you encounter any difficulty accessing educational materials or need accommodations, contact our accessibility coordinator:
          </p>
          <p>
            Email: <a href="mailto:arshathrizvi1010@gmail.com" className="text-primary underline">arshathrizvi1010@gmail.com</a><br />
            Phone / WhatsApp: 075 739 1416 • Rakwana, Sri Lanka
          </p>
        </div>
      </div>
    </div>
  );
}
