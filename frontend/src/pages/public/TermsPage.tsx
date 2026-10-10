import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="container-main max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-8">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-display font-bold text-gray-900 mb-8">Terms of Service</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-gray-600 mb-6">
            <strong>Last updated:</strong> October 2024
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600 mb-6">
            By accessing and using Happy Little Learners ("the Service"), you agree to be bound by these
            Terms of Service ("Terms"). If you disagree with any part of these Terms, you may not use the Service.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">2. Description of Service</h2>
          <p className="text-gray-600 mb-6">
            Happy Little Learners is an early learning web application for children aged 2-6 years,
            providing curriculum-aligned educational content, interactive activities, and progress tracking
            for parents, following India's NCF-FS 2022 framework.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">3. Account Registration</h2>
          <ul className="space-y-2 text-gray-600 mb-6 list-disc list-inside">
            <li>You must be at least 18 years old to create a parent account</li>
            <li>You must provide accurate and complete information</li>
            <li>You are responsible for maintaining account confidentiality</li>
            <li>You must notify us immediately of any unauthorized use</li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">4. Children's Accounts</h2>
          <ul className="space-y-2 text-gray-600 mb-6 list-disc list-inside">
            <li>Child profiles are created and managed by verified parents/guardians</li>
            <li>Children use a parent-approved PIN for login</li>
            <li>Parents have full visibility and control over child accounts</li>
            <li>We collect minimal data from children (see Privacy Policy)</li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">5. Subscription & Billing</h2>
          <p className="text-gray-600 mb-6">
            [Pricing details to be added upon launch. Currently in free beta period.]
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">6. Acceptable Use</h2>
          <p className="text-gray-600 mb-6">You agree not to:</p>
          <ul className="space-y-2 text-gray-600 mb-6 list-disc list-inside">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to systems or data</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Upload malicious code or content</li>
            <li>Violate any intellectual property rights</li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">7. Intellectual Property</h2>
          <p className="text-gray-600 mb-6">
            All content, features, and functionality of the Service (excluding user-generated content)
            are owned by Happy Little Learners and are protected by international copyright laws.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">8. Disclaimer of Warranties</h2>
          <p className="text-gray-600 mb-6">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED. WE DO NOT GUARANTEE SPECIFIC EDUCATIONAL OUTCOMES.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">9. Limitation of Liability</h2>
          <p className="text-gray-600 mb-6">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, HAPPY LITTLE LEARNERS SHALL NOT BE LIABLE
            FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">10. Termination</h2>
          <p className="text-gray-600 mb-6">
            We may terminate or suspend your account at our discretion, including for violation of these Terms.
            You may terminate your account at any time through the settings page.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">11. Governing Law</h2>
          <p className="text-gray-600 mb-6">
            These Terms shall be governed by the laws of India. Any disputes shall be subject to the
            exclusive jurisdiction of courts in Bangalore, Karnataka.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">12. Changes to Terms</h2>
          <p className="text-gray-600 mb-6">
            We may update these Terms from time to time. We will notify you of any material changes
            by email or through the Service. Continued use constitutes acceptance of new Terms.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">13. Contact Us</h2>
          <p className="text-gray-600 mb-6">
            For questions about these Terms, contact us at:
            <br />
            <strong>Email:</strong> legal@happylittlelearners.in
          </p>
        </div>
      </div>
    </div>
  );
}