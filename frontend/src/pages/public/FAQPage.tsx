const faqs = [
  {
    category: 'Getting Started',
    items: [
      {
        question: 'What age group is this app for?',
        answer: 'Happy Little Learners is designed for children aged 2-6 years, covering Playgroup (2-3), Nursery (3-4), LKG (4-5), and UKG (5-6).',
      },
      {
        question: 'How do I create an account?',
        answer: 'Click "Get Started" on the homepage, fill in your details, verify your email, and then add your child\'s profile.',
      },
      {
        question: 'Can I add multiple children?',
        answer: 'Yes! You can add multiple child profiles under one parent account. Each child gets their own learning path.',
      },
      {
        question: 'Is there a free trial?',
        answer: 'Yes, we offer a 14-day free trial with full access to all features. No credit card required.',
      },
    ],
  },
  {
    category: 'Curriculum & Learning',
    items: [
      {
        question: 'Is the content aligned with Indian curriculum?',
        answer: 'Yes, our curriculum follows the National Curriculum Framework for Foundational Stage (NCF-FS 2022) and NCERT guidelines.',
      },
      {
        question: 'What languages are supported?',
        answer: 'Currently English and Hindi. The platform is designed to support additional Indian languages in the future.',
      },
      {
        question: 'Does my child need to read to use the app?',
        answer: 'No! All activities include audio narration and visual cues. Pre-readers can navigate independently.',
      },
      {
        question: 'How is progress tracked?',
        answer: 'Parents get detailed dashboards showing lessons completed, time spent, strengths, and suggested activities.',
      },
      {
        question: 'Can my child repeat activities?',
        answer: 'Absolutely! Repetition is encouraged for mastery. Children can redo any activity as many times as they like.',
      },
    ],
  },
  {
    category: 'Safety & Privacy',
    items: [
      {
        question: 'Is my child\'s data safe?',
        answer: 'Absolutely. We follow strict privacy standards (DPDP Act), collect minimal data, and never show ads to children.',
      },
      {
        question: 'Do you show advertisements?',
        answer: 'Never. Happy Little Learners is completely ad-free. We believe children\'s learning should be distraction-free.',
      },
      {
        question: 'What data do you collect?',
        answer: 'We collect minimal data: parent name, email, phone; child name, age, learning preferences. No location tracking.',
      },
      {
        question: 'Can I delete my data?',
        answer: 'Yes, you can request account deletion at any time from your parent dashboard settings.',
      },
    ],
  },
  {
    category: 'Technical',
    items: [
      {
        question: 'What devices are supported?',
        answer: 'Works on any device with a modern browser: computers, tablets, and smartphones. No app installation needed.',
      },
      {
        question: 'Does it work offline?',
        answer: 'Some content can be cached for offline use. Full offline support is on our roadmap.',
      },
      {
        question: 'What browsers work best?',
        answer: 'Chrome, Firefox, Safari, and Edge (latest versions). We recommend keeping your browser updated.',
      },
      {
        question: 'Is there a mobile app?',
        answer: 'Currently web-only. Native mobile apps for iOS and Android are planned for future release.',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen py-20 bg-gray-50">
      <div className="container-main max-w-3xl">
        <h1 className="text-4xl font-display font-bold text-gray-900 text-center mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-gray-600 text-center mb-12">Quick answers to common questions about Happy Little Learners</p>

        <div className="space-y-8">
          {faqs.map((category, catIndex) => (
            <div key={catIndex} className="card overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-display font-bold text-gray-900">{category.category}</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {category.items.map((faq, itemIndex) => (
                  <details key={`${catIndex}-${itemIndex}`} className="group">
                    <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                      <span className="text-gray-900 font-medium pr-4">{faq.question}</span>
                      <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          ))}
        </div>

        <div className="mt-12 text-center card p-8">
          <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Still have questions?</h3>
          <p className="text-gray-600 mb-6">Can't find what you're looking for? We're here to help.</p>
          <a href="mailto:support@happylittlelearners.in" className="btn btn-primary">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}