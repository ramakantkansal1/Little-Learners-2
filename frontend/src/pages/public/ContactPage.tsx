import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thank you for your message! We'll get back to you soon.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container-main max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-gray-600">
            We'd love to hear from you. Send us a message and we'll respond as
            soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 card">
                <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Email Us</h3>
                  <p className="text-gray-600 mt-1">
                    support@happylittlelearners.in
                  </p>
                  <p className="text-gray-600">
                    admissions@happylittlelearners.in
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 card">
                <div className="w-12 h-12 rounded-xl bg-pastel-green flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Call Us</h3>
                  <p className="text-gray-600 mt-1">+91 1800 123 4567</p>
                  <p className="text-gray-600">Mon-Fri, 9 AM - 6 PM IST</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 card">
                <div className="w-12 h-12 rounded-xl bg-pastel-pink flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Visit Us</h3>
                  <p className="text-gray-600 mt-1">
                    Happy Little Learners Pvt. Ltd.
                  </p>
                  <p className="text-gray-600">Bangalore, Karnataka, India</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="card p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="label">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="label">
                  Subject
                </label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="input"
                  required
                >
                  <option value="">Select a topic</option>
                  <option value="general">General Inquiry</option>
                  <option value="technical">Technical Support</option>
                  <option value="billing">Billing & Subscription</option>
                  <option value="content">Content Feedback</option>
                  <option value="privacy">Privacy & Data</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="message" className="label">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="input resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full md:w-auto"
              >
                <Send className="w-5 h-5" />
                Send Message
              </button>
            </form>
          </div>
        </div>

        <div className="card p-8 text-center">
          <h3 className="text-xl font-display font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h3>
          <p className="text-gray-600 mb-6">
            Quick answers to common questions
          </p>
          <Link to="/faq" className="btn btn-outline">
            View FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
