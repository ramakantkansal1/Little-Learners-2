import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="container-main max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-display font-bold text-gray-900 mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-gray-600 mb-6">
            <strong>Last updated:</strong> October 2024
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">
            1. Introduction
          </h2>
          <p className="text-gray-600 mb-6">
            Happy Little Learners ("we," "our," or "us") is committed to
            protecting the privacy of children and their families. This Privacy
            Policy explains how we collect, use, and safeguard information when
            you use our early learning web application.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">
            2. Information We Collect
          </h2>
          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
            From Parents/Guardians:
          </h3>
          <ul className="space-y-2 text-gray-600 mb-6 list-disc list-inside">
            <li>Name, email address, phone number</li>
            <li>Account credentials (hashed password)</li>
            <li>Communication preferences</li>
          </ul>
          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
            From Children (Minimal):
          </h3>
          <ul className="space-y-2 text-gray-600 mb-6 list-disc list-inside">
            <li>Display name (first name only)</li>
            <li>Date of birth (optional, for age-appropriate content)</li>
            <li>Learning progress and activity data</li>
            <li>Preferred language and accessibility settings</li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">
            3. How We Use Information
          </h2>
          <ul className="space-y-2 text-gray-600 mb-6 list-disc list-inside">
            <li>Provide personalized learning experiences</li>
            <li>Track and report learning progress to parents</li>
            <li>Send account-related communications</li>
            <li>Improve our platform and content</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">
            4. Children's Privacy (DPDP Act & COPPA)
          </h2>
          <p className="text-gray-600 mb-6">
            We comply with India's Digital Personal Data Protection Act (DPDP)
            and the US Children's Online Privacy Protection Act (COPPA). We:
          </p>
          <ul className="space-y-2 text-gray-600 mb-6 list-disc list-inside">
            <li>
              Require verifiable parental consent before collecting children's
              data
            </li>
            <li>
              Collect only the minimum data necessary for educational purposes
            </li>
            <li>Do not use children's data for advertising or profiling</li>
            <li>
              Allow parents to review, modify, or delete their child's data
            </li>
            <li>Implement age-appropriate security measures</li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">
            5. Data Sharing
          </h2>
          <p className="text-gray-600 mb-6">
            We do not sell personal information. We may share data only with:
          </p>
          <ul className="space-y-2 text-gray-600 mb-6 list-disc list-inside">
            <li>
              Service providers who help operate our platform (under strict
              contracts)
            </li>
            <li>Legal authorities when required by law</li>
            <li>With your explicit consent for specific purposes</li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">
            6. Data Security
          </h2>
          <p className="text-gray-600 mb-6">
            We implement appropriate technical and organizational measures to
            protect personal data, including encryption in transit and at rest,
            access controls, and regular security assessments.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">
            7. Your Rights
          </h2>
          <p className="text-gray-600 mb-6">
            Under DPDP Act and applicable laws, you have the right to:
          </p>
          <ul className="space-y-2 text-gray-600 mb-6 list-disc list-inside">
            <li>Access your and your child's personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of data</li>
            <li>Withdraw consent at any time</li>
            <li>Data portability</li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">
            8. Data Retention
          </h2>
          <p className="text-gray-600 mb-6">
            We retain personal data only as long as necessary for the purposes
            described in this policy, or as required by law. Account deletion
            requests are processed within 30 days.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">
            9. Contact Us
          </h2>
          <p className="text-gray-600 mb-6">
            For privacy-related questions or to exercise your rights, contact us
            at:
            <br />
            <strong>Email:</strong> privacy@happylittlelearners.in
            <br />
            <strong>Address:</strong> Happy Little Learners Pvt. Ltd.,
            Bangalore, India
          </p>
        </div>
      </div>
    </div>
  );
}
