import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Music,
  Palette,
  Users,
  Target,
  Star,
} from "lucide-react";

interface StageData {
  name: string;
  age: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  focusAreas: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
  }>;
  sampleActivities: string[];
}

const stageData: Record<string, StageData> = {
  playgroup: {
    name: "Playgroup / Pre-Nursery",
    age: "2-3 years",
    description:
      "Play-based exploration with familiar objects, sounds, colors, movement, and social routines.",
    icon: "👶",
    color: "bg-pastel-pink",
    borderColor: "border-pink-200",
    focusAreas: [
      {
        icon: BookOpen,
        title: "Language & Sounds",
        desc: "Animal sounds, familiar words, simple rhymes",
      },
      {
        icon: Target,
        title: "Cognitive Play",
        desc: "Object permanence, cause-effect, matching games",
      },
      {
        icon: Users,
        title: "Motor Skills",
        desc: "Clapping, stomping, reaching, grasping",
      },
      {
        icon: Music,
        title: "Social Routines",
        desc: "Hello/goodbye, sharing, turn-taking",
      },
      {
        icon: Palette,
        title: "Sensory Exploration",
        desc: "Colors, textures, sounds, movement",
      },
      {
        icon: Star,
        title: "Environmental Awareness",
        desc: "Family, animals, nature, everyday objects",
      },
    ],
    sampleActivities: [
      "Which animal makes this sound?",
      "Match the color",
      "Big vs Small",
      "Peek-a-boo game",
      "Clap along to the rhythm",
    ],
  },
  nursery: {
    name: "Nursery",
    age: "3-4 years",
    description:
      "Colors, shapes, motor skills, vocabulary, listening, speaking, rhymes, and environmental awareness.",
    icon: "🧱",
    color: "bg-pastel-green",
    borderColor: "border-green-200",
    focusAreas: [
      {
        icon: BookOpen,
        title: "Language & Literacy",
        desc: "Vocabulary building, phonological awareness, storytelling",
      },
      {
        icon: Target,
        title: "Early Mathematics",
        desc: "Numbers 1-10, counting, shapes, patterns, sorting",
      },
      {
        icon: Users,
        title: "Physical Development",
        desc: "Fine motor (tracing, threading), gross motor (jumping, balancing)",
      },
      {
        icon: Music,
        title: "Socio-Emotional",
        desc: "Self-awareness, emotions, friendships, routines",
      },
      {
        icon: Palette,
        title: "Creative Arts",
        desc: "Drawing, coloring, music, movement, drama",
      },
      {
        icon: Star,
        title: "Understanding the World",
        desc: "Animals, plants, community helpers, transport, festivals",
      },
    ],
    sampleActivities: [
      "Count the apples (1-5)",
      "Find the circle",
      "Rhyming words game",
      "Trace the lines",
      "Community helper match",
    ],
  },
  lkg: {
    name: "Lower Kindergarten (LKG)",
    age: "4-5 years",
    description:
      "Pre-literacy, pre-numeracy, fine motor skills, creativity, observation, and language development.",
    icon: "🔤",
    color: "bg-pastel-blue",
    borderColor: "border-blue-200",
    focusAreas: [
      {
        icon: BookOpen,
        title: "Language & Literacy",
        desc: "Alphabet recognition A-Z, letter sounds, simple words",
      },
      {
        icon: Target,
        title: "Mathematics",
        desc: "Numbers 1-20, counting, more/less, basic addition concepts",
      },
      {
        icon: Users,
        title: "Physical Development",
        desc: "Writing readiness, hand-eye coordination, fine motor control",
      },
      {
        icon: Music,
        title: "Socio-Emotional",
        desc: "Cooperation, sharing, following rules, self-regulation",
      },
      {
        icon: Palette,
        title: "Creative Expression",
        desc: "Art techniques, music, dance, imaginative storytelling",
      },
      {
        icon: Star,
        title: "Environmental Studies",
        desc: "My body, family, food, water, seasons, plants, animals",
      },
    ],
    sampleActivities: [
      "Letter sound match (A-Z)",
      "Count objects 1-20",
      "Complete the pattern",
      "Trace standing lines",
      "My family tree",
    ],
  },
  ukg: {
    name: "Upper Kindergarten (UKG)",
    age: "5-6 years",
    description:
      "Reading readiness, early writing, number sense, basic mathematical reasoning, and school preparation.",
    icon: "📚",
    color: "bg-pastel-yellow",
    borderColor: "border-yellow-200",
    focusAreas: [
      {
        icon: BookOpen,
        title: "Language & Literacy",
        desc: "CVC words, sight words, simple sentences, comprehension",
      },
      {
        icon: Target,
        title: "Mathematics",
        desc: "Numbers 1-50, addition/subtraction, measurement, time concepts",
      },
      {
        icon: Users,
        title: "Physical Development",
        desc: "Refined motor skills, sports basics, yoga, health habits",
      },
      {
        icon: Music,
        title: "Socio-Emotional",
        desc: "Empathy, conflict resolution, responsibility, school readiness",
      },
      {
        icon: Palette,
        title: "Creative Arts",
        desc: "Advanced art, craft, music appreciation, dramatic play",
      },
      {
        icon: Star,
        title: "Environmental Studies",
        desc: "Community, festivals, transport, communication, safety",
      },
    ],
    sampleActivities: [
      "Read the simple sentence",
      "Add with pictures",
      "Short or long?",
      "Pack my school bag",
      "Festival matching game",
    ],
  },
};

export default function StageIntroPage() {
  const { stageCode } = useParams<{ stageCode: string }>();
  const stage = stageData[stageCode || ""] || stageData.playgroup;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className={`relative overflow-hidden ${stage.color} py-20 lg:py-32`}
      >
        <div className="container-main">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-primary-500 mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>

          <div className="max-w-3xl mx-auto text-center">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${stage.color} border-4 ${stage.borderColor} mb-6 text-5xl`}
            >
              {stage.icon}
            </div>

            <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-4">
              {stage.name}
            </h1>
            <p className="text-primary-600 font-semibold text-lg mb-6">
              {stage.age}
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              {stage.description}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth/parent/register"
                className="btn btn-primary btn-lg"
              >
                Start Learning
              </Link>
              <Link
                to="/auth/parent/login"
                className="btn btn-outline btn-lg border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Parent Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Focus Areas */}
      <section className="section bg-white">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="section-title">What Children Learn</h2>
            <p className="section-subtitle">
              Six key developmental areas aligned with NCF-FS 2022
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stage.focusAreas.map((area, index) => (
              <div key={index} className="card p-6 group">
                <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <area.icon className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="text-lg font-display font-bold text-gray-900 mb-2">
                  {area.title}
                </h3>
                <p className="text-gray-600">{area.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Activities */}
      <section className="section bg-gray-50">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="section-title">Sample Activities</h2>
            <p className="section-subtitle">
              A glimpse of what your child will enjoy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {stage.sampleActivities.map((activity, index) => (
              <div
                key={index}
                className="card p-6 text-center group hover:shadow-soft transition-shadow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 rounded-xl bg-pastel-blue flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-primary-500" />
                </div>
                <p className="text-gray-700 font-medium">{activity}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section bg-white">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6 card">
              <div className="w-16 h-16 rounded-2xl bg-pastel-green flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
                Audio Narration
              </h3>
              <p className="text-gray-600">
                Every lesson includes optional audio in English and Hindi for
                pre-readers.
              </p>
            </div>
            <div className="text-center p-6 card">
              <div className="w-16 h-16 rounded-2xl bg-pastel-pink flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
                Rewards & Progress
              </h3>
              <p className="text-gray-600">
                Stars, stickers, and badges celebrate every milestone without
                pressure.
              </p>
            </div>
            <div className="text-center p-6 card">
              <div className="w-16 h-16 rounded-2xl bg-pastel-blue flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
                Parent Dashboard
              </h3>
              <p className="text-gray-600">
                Track progress, see strengths, and get personalized
                recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-gradient-to-br from-primary-500 to-primary-600">
        <div className="container-main text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Ready for {stage.name}?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Create a free account and start your child's learning journey today.
          </p>
          <Link
            to="/auth/parent/register"
            className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg px-10 py-4"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}
