import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Star, Shield, Users, BookOpen, Music, Palette, Globe, Heart } from 'lucide-react';

const stages = [
  {
    code: 'playgroup',
    name: 'Playgroup / Pre-Nursery',
    age: '2-3 years',
    description: 'Play-based exploration with familiar objects, sounds, colors, and movement.',
    icon: '👶',
    color: 'bg-pastel-pink',
    features: ['Sensory play', 'Animal sounds', 'Color exploration', 'Simple routines'],
  },
  {
    code: 'nursery',
    name: 'Nursery',
    age: '3-4 years',
    description: 'Colors, shapes, motor skills, vocabulary, rhymes, and environmental awareness.',
    icon: '🧱',
    color: 'bg-pastel-green',
    features: ['Shape matching', 'Counting 1-10', 'Nursery rhymes', 'Community helpers'],
  },
  {
    code: 'lkg',
    name: 'Lower Kindergarten (LKG)',
    age: '4-5 years',
    description: 'Pre-literacy, pre-numeracy, fine motor skills, creativity, and language development.',
    icon: '🔤',
    color: 'bg-pastel-blue',
    features: ['Alphabet recognition', 'Letter sounds', 'Number 1-20', 'Writing readiness'],
  },
  {
    code: 'ukg',
    name: 'Upper Kindergarten (UKG)',
    age: '5-6 years',
    description: 'Reading readiness, early writing, number sense, and school preparation.',
    icon: '📚',
    color: 'bg-pastel-yellow',
    features: ['Simple words', 'Addition/Subtraction', 'Sentence building', 'School routines'],
  },
];

const features = [
  {
    icon: BookOpen,
    title: 'NCF-FS 2022 Aligned',
    description: 'Curriculum designed following India\'s National Curriculum Framework for Foundational Stage.',
  },
  {
    icon: Globe,
    title: 'Bilingual Learning',
    description: 'Content available in English and Hindi with support for more Indian languages.',
  },
  {
    icon: Music,
    title: 'Audio Narration',
    description: 'Every lesson and activity includes optional audio narration for young learners.',
  },
  {
    icon: Palette,
    title: 'Creative Activities',
    description: 'Art, music, storytelling, and imaginative play integrated into learning.',
  },
  {
    icon: Heart,
    title: 'Socio-Emotional Growth',
    description: 'Activities designed to build empathy, sharing, and self-awareness.',
  },
  {
    icon: Shield,
    title: 'Safe & Private',
    description: 'No ads, no tracking, COPPA/DPDP compliant. Parent-controlled environment.',
  },
];

const benefits = [
  {
    icon: Users,
    title: 'Multiple Children',
    description: 'Manage profiles for all your children under one parent account.',
  },
  {
    icon: Star,
    title: 'Progress Tracking',
    description: 'Detailed reports on lessons completed, strengths, and areas for practice.',
  },
  {
    icon: Shield,
    title: 'Adaptive Learning',
    description: 'Content adjusts to your child\'s pace and learning stage.',
  },
  {
    icon: BookOpen,
    title: 'Weekly Summaries',
    description: 'Get email summaries of your child\'s learning journey every week.',
  },
];

const faqs = [
  {
    question: 'What age group is this app for?',
    answer: 'Happy Little Learners is designed for children aged 2-6 years, covering Playgroup (2-3), Nursery (3-4), LKG (4-5), and UKG (5-6).',
  },
  {
    question: 'Is the content aligned with Indian curriculum?',
    answer: 'Yes, our curriculum follows the National Curriculum Framework for Foundational Stage (NCF-FS 2022) and NCERT guidelines.',
  },
  {
    question: 'What languages are supported?',
    answer: 'Currently English and Hindi. The platform is designed to support additional Indian languages in the future.',
  },
  {
    question: 'Is my child\'s data safe?',
    answer: 'Absolutely. We follow strict privacy standards (DPDP Act), collect minimal data, and never show ads to children.',
  },
  {
    question: 'Can I track my child\'s progress?',
    answer: 'Yes! Parents get detailed dashboards showing lessons completed, time spent, strengths, and suggested activities.',
  },
  {
    question: 'Does my child need to read to use the app?',
    answer: 'No! All activities include audio narration and visual cues. Pre-readers can navigate independently.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pastel-blue via-pastel-green to-pastel-yellow py-20 lg:py-32">
        <div className="container-main">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm text-sm font-medium text-gray-700 mb-6 animate-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              New: UKG content now available!
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-gray-900 leading-tight mb-6 animate-in">
              Little Steps,{' '}
              <span className="gradient-text">Big Discoveries!</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-10 animate-in">
              Playful learning for children aged 2-6, following India\'s NCF-FS 2022 curriculum.
              Engaging activities, bilingual content, and progress tracking for parents.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in">
              <Link to="/auth/parent/register" className="btn btn-primary btn-lg w-full sm:w-auto">
                Start Learning Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/stages/playgroup" className="btn btn-outline btn-lg w-full sm:w-auto">
                Explore Stages
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 animate-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>No ads ever</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>COPPA & DPDP compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Works offline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary-100/50 blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-pink-100/50 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-20 w-24 h-24 rounded-full bg-green-100/50 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-display font-bold text-primary-500">10,000+</div>
              <div className="text-sm text-gray-600 mt-1">Happy Learners</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-display font-bold text-primary-500">500+</div>
              <div className="text-sm text-gray-600 mt-1">Learning Activities</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-display font-bold text-primary-500">4</div>
              <div className="text-sm text-gray-600 mt-1">Learning Stages</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-display font-bold text-primary-500">2</div>
              <div className="text-sm text-gray-600 mt-1">Languages</div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Stages */}
      <section className="section bg-gray-50">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="section-title">Choose Your Learning Stage</h2>
            <p className="section-subtitle">Each stage is designed for specific developmental milestones. Children can start at any stage based on their readiness.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stages.map((stage, index) => (
              <Link
                key={stage.code}
                to={`/stages/${stage.code}`}
                className="card-hover group p-6"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-16 h-16 rounded-2xl ${stage.color} flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform`}>
                  {stage.icon}
                </div>
                <h3 className="text-xl font-display font-bold text-gray-900 mb-1">{stage.name}</h3>
                <p className="text-primary-500 font-medium mb-3">{stage.age}</p>
                <p className="text-gray-600 text-sm mb-4">{stage.description}</p>
                <ul className="space-y-2 mb-6">
                  {stage.features.map(feature => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm font-medium text-primary-500">Explore Stage</span>
                  <ArrowRight className="w-5 h-5 text-primary-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="section bg-white">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Simple steps to start your child\'s learning journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Parent Account', description: 'Sign up with email and phone. Verify your account and set up your profile.' },
              { step: '02', title: 'Add Child Profile', description: 'Create a profile for your child with name, age, and preferred learning stage.' },
              { step: '03', title: 'Start Learning', description: 'Your child logs in with a simple PIN and begins their personalized learning journey.' },
            ].map((item, index) => (
              <div key={item.step} className="relative text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-display font-bold text-primary-500">{item.step}</span>
                </div>
                <h3 className="text-xl font-display font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
                {index < 2 && (
                  <div className="absolute top-8 right-0 w-8 h-8 lg:w-16 lg:left-full lg:top-8 transform translate-x-1/2">
                    <svg className="w-full h-full text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section bg-gray-50">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="section-title">Why Parents Love Us</h2>
            <p className="section-subtitle">Everything you need to support your child\'s early learning journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={feature.title} className="card p-6" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="text-lg font-display font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parent Benefits */}
      <section className="section bg-white">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="section-title">For Parents</h2>
            <p className="section-subtitle">Tools to support and monitor your child\'s growth</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={benefit.title} className="text-center p-6" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="w-16 h-16 rounded-2xl bg-pastel-green flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-lg font-display font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-gray-50">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">Everything you need to know about Happy Little Learners</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="card group">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-lg font-semibold text-gray-900">{faq.question}</span>
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-gray-600 animate-in">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-gradient-to-br from-primary-500 to-primary-600">
        <div className="container-main text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Ready to Start Your Child\'s Learning Journey?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of parents who trust Happy Little Learners for their child\'s early education.
          </p>
          <Link
            to="/auth/parent/register"
            className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg px-10 py-4"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}