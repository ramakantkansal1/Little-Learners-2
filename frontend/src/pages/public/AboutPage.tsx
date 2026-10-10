import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="container-main max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-8">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-display font-bold text-gray-900 mb-8">About Happy Little Learners</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-gray-600 mb-6">
            Happy Little Learners is an Indian early learning web application designed for children aged 2-6 years.
            Our platform follows the National Curriculum Framework for Foundational Stage (NCF-FS 2022) and
            relevant NCERT guidance to provide developmentally appropriate digital learning experiences.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">Our Mission</h2>
          <p className="text-gray-600 mb-6">
            To make quality early childhood education accessible to every Indian child through engaging,
            culturally relevant, and safe digital learning experiences that complement traditional learning.
          </p>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">Our Approach</h2>
          <ul className="space-y-4 text-gray-600 mb-6">
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-primary-500 flex-shrink-0" />
              <span><strong>Play-based Learning:</strong> Children learn best through play, exploration, and discovery.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-primary-500 flex-shrink-0" />
              <span><strong>Developmentally Appropriate:</strong> Content tailored to each age group's cognitive abilities.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-primary-500 flex-shrink-0" />
              <span><strong>Bilingual Support:</strong> English and Hindi content with Indian cultural contexts.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-primary-500 flex-shrink-0" />
              <span><strong>Parent Partnership:</strong> Tools for parents to monitor progress and support learning.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-primary-500 flex-shrink-0" />
              <span><strong>Safety First:</strong> No ads, no tracking, privacy-compliant design.</span>
            </li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">Educational Stages</h2>
          <p className="text-gray-600 mb-6">
            Our four learning stages align with Indian early childhood education:
          </p>
          <ul className="space-y-3 text-gray-600 mb-6">
            <li><strong>Playgroup / Pre-Nursery (2-3 years):</strong> Sensory exploration, familiar objects, sounds, colors</li>
            <li><strong>Nursery (3-4 years):</strong> Colors, shapes, motor skills, vocabulary, rhymes</li>
            <li><strong>LKG (4-5 years):</strong> Pre-literacy, pre-numeracy, fine motor skills, creativity</li>
            <li><strong>UKG (5-6 years):</strong> Reading readiness, early writing, number sense, school preparation</li>
          </ul>

          <h2 className="text-2xl font-display font-bold text-gray-900 mt-10 mb-4">Privacy & Safety</h2>
          <p className="text-gray-600 mb-6">
            We take children's privacy seriously. Our platform is designed to comply with India's Digital Personal
            Data Protection Act (DPDP) and international standards like COPPA. We collect minimal data,
            require parental consent, and never show advertisements to children.
          </p>
        </div>
      </div>
    </div>
  );
}