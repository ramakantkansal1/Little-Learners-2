import { Link } from "react-router-dom";
import {
  BookOpen,
  Trophy,
  Target,
  Clock,
  CheckCircle,
  PlayCircle,
  Lock,
  Sparkles,
  Award,
  ChevronRight,
} from "lucide-react";
import { useStudent } from "@context/StudentContext";
import { useEffect, useState } from "react";
import { type LessonListItem } from "@services/api";

const categoryLabels: Record<string, string> = {
  english: "English",
  hindi: "हिंदी",
  mathematics: "Mathematics",
  numbers: "Numbers",
  operations: "Operations",
  shapes: "Shapes",
  shapes_patterns: "Shapes & Patterns",
  measurement: "Measurement",
  colors: "Colors",
  art: "Art",
  art_music: "Art & Music",
  arts_crafts: "Arts & Crafts",
  music_movement: "Music & Movement",
  creative: "Creative",
  environmental: "Environment",
  nature: "Nature",
  animals: "Animals",
  plants: "Plants",
  my_world: "My World",
  our_world: "Our World",
  community: "Community",
  motor_skills: "Motor Skills",
  fine_motor: "Fine Motor",
  gross_motor: "Gross Motor",
  writing_readiness: "Writing",
  sports_yoga: "Sports & Yoga",
  socio_emotional: "Social-Emotional",
  self_awareness: "Self Awareness",
  relationships: "Relationships",
  cooperation: "Cooperation",
  school_readiness: "School Ready",
  thinking_skills: "Thinking",
  cognitive: "Cognitive",
  physical: "Physical",
  language: "Language",
};

const categoryColors: Record<string, string> = {
  english: "from-blue-400 to-blue-500",
  hindi: "from-orange-400 to-orange-500",
  mathematics: "from-purple-400 to-purple-500",
  numbers: "from-purple-400 to-purple-500",
  operations: "from-purple-400 to-purple-500",
  shapes: "from-pink-400 to-pink-500",
  shapes_patterns: "from-pink-400 to-pink-500",
  measurement: "from-purple-400 to-purple-500",
  colors: "from-yellow-400 to-orange-400",
  art: "from-pink-400 to-pink-500",
  art_music: "from-pink-400 to-pink-500",
  arts_crafts: "from-pink-400 to-pink-500",
  music_movement: "from-yellow-400 to-orange-400",
  creative: "from-pink-400 to-pink-500",
  environmental: "from-green-400 to-green-500",
  nature: "from-green-400 to-green-500",
  animals: "from-green-400 to-green-500",
  plants: "from-green-400 to-green-500",
  my_world: "from-green-400 to-green-500",
  our_world: "from-green-400 to-green-500",
  community: "from-green-400 to-green-500",
  motor_skills: "from-blue-400 to-blue-500",
  fine_motor: "from-blue-400 to-blue-500",
  gross_motor: "from-blue-400 to-blue-500",
  writing_readiness: "from-blue-400 to-blue-500",
  sports_yoga: "from-blue-400 to-blue-500",
  socio_emotional: "from-pink-400 to-pink-500",
  self_awareness: "from-pink-400 to-pink-500",
  relationships: "from-pink-400 to-pink-500",
  cooperation: "from-pink-400 to-pink-500",
  school_readiness: "from-pink-400 to-pink-500",
  thinking_skills: "from-purple-400 to-purple-500",
  cognitive: "from-purple-400 to-purple-500",
  physical: "from-blue-400 to-blue-500",
  language: "from-blue-400 to-blue-500",
};

const categoryEmojis: Record<string, string> = {
  english: "📖",
  hindi: "📚",
  mathematics: "🔢",
  numbers: "🔢",
  operations: "➕",
  shapes: "🔷",
  shapes_patterns: "🔷",
  measurement: "📏",
  colors: "🎨",
  art: "🎨",
  art_music: "🎵",
  arts_crafts: "✂️",
  music_movement: "🎵",
  creative: "🎨",
  environmental: "🌿",
  nature: "🌳",
  animals: "🐘",
  plants: "🌱",
  my_world: "🏠",
  our_world: "🌍",
  community: "👥",
  motor_skills: "🤸",
  fine_motor: "✍️",
  gross_motor: "🏃",
  writing_readiness: "✏️",
  sports_yoga: "🧘",
  socio_emotional: "❤️",
  self_awareness: "😊",
  relationships: "👫",
  cooperation: "🤝",
  school_readiness: "🎒",
  thinking_skills: "🧩",
  cognitive: "🧠",
  physical: "🤸",
  language: "🗣️",
};

function getSubjectColor(code: string) {
  return categoryColors[code] || "from-gray-400 to-gray-500";
}

function getSubjectEmoji(code: string) {
  return categoryEmojis[code] || "📚";
}

function getSubjectLabel(code: string) {
  return categoryLabels[code] || code;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatTimeSpent(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function DashboardPage() {
  const {
    profile,
    dashboard,
    lessons,
    subjects,
    loading,
    error,
    refreshDashboard,
    refreshLessons,
  } = useStudent();
  const [showSubjects, setShowSubjects] = useState(false);

  useEffect(() => {
    if (!loading && !error) {
      refreshDashboard();
      refreshLessons();
    }
  }, [loading, error, refreshDashboard, refreshLessons]);

  const continueLearning = dashboard?.continue_learning || [];
  const nextLessons = dashboard?.next_lessons || [];
  const rewardsPreview = dashboard?.rewards_preview || [];
  const stats = dashboard?.stats || {
    lessons_completed: 0,
    rewards_earned: 0,
    time_this_week: "0m",
    current_streak: 0,
  };

  const inProgressLessons = lessons.filter(
    (l: LessonListItem) =>
      l.progress?.completion_percentage &&
      l.progress.completion_percentage > 0 &&
      l.progress.completion_percentage < 100,
  );
  const notStartedLessons = lessons.filter(
    (l: LessonListItem) =>
      !l.progress || l.progress.completion_percentage === 0,
  );

  // Filter subjects that have lessons available
  const availableSubjects = subjects.filter((s) =>
    lessons.some((l) => l.subject_code === s.code),
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <svg
              className="w-8 h-8 text-primary-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-gray-600">Loading your learning space...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 mb-2">
            Unable to load dashboard
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center text-4xl">
          👦
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Hello, {profile?.display_name || "Little Learner"}!
          </h1>
          <p className="text-gray-600 mt-1">Ready for today's adventure?</p>
        </div>
      </div>

      {/* Learning Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-gray-900">
            Learning Categories
          </h2>
          <button
            onClick={() => setShowSubjects(!showSubjects)}
            className="btn btn-ghost btn-sm"
          >
            {showSubjects ? "Show Less" : "Show All"} Categories
            <ChevronRight
              className={`w-4 h-4 ${showSubjects ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Subject Category Cards */}
        <div
          className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 ${!showSubjects ? "max-h-[200px] overflow-hidden" : ""}`}
        >
          {availableSubjects.slice(showSubjects ? 0 : 8).map((subject) => (
            <Link
              key={subject.id}
              to={`/student/lessons?subject=${subject.code}`}
              className="group card p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3 bg-gradient-to-br ${getSubjectColor(subject.code)}`}
              >
                {getSubjectEmoji(subject.code)}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {getSubjectLabel(subject.code)}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {lessons.filter((l) => l.subject_code === subject.code).length}{" "}
                lessons
              </p>
            </Link>
          ))}
        </div>
        {!showSubjects && availableSubjects.length > 8 && (
          <div className="text-center mt-3">
            <button
              onClick={() => setShowSubjects(true)}
              className="text-primary-500 hover:underline text-sm"
            >
              Show {availableSubjects.length - 8} more categories
            </button>
          </div>
        )}
      </div>

      {/* Continue Learning */}
      {continueLearning.length > 0 && (
        <div>
          <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-primary-500" />
            Continue Learning
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {continueLearning.map((item) => (
              <Link
                key={item.lesson_id}
                to={`/student/learn/${item.lesson_id}`}
                className="card p-5 group hover:shadow-soft transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-pastel-blue flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-7 h-7 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      Last activity: {formatTimeAgo(item.last_activity)}
                    </p>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full"
                        style={{ width: `${item.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Next Lessons */}
      {(nextLessons.length > 0 || notStartedLessons.length > 0) && (
        <div>
          <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-500" />
            Up Next
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nextLessons.slice(0, 6).map((lesson) => (
              <Link
                key={lesson.lesson_id}
                to={`/student/learn/${lesson.lesson_id}`}
                className={`card p-5 ${lesson.locked ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${lesson.locked ? "bg-gray-200" : "bg-pastel-green"}`}
                  >
                    {lesson.locked ? (
                      <Lock className="w-7 h-7 text-gray-400" />
                    ) : (
                      <PlayCircle className="w-7 h-7 text-primary-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold text-gray-900 ${lesson.locked ? "text-gray-500" : ""}`}
                    >
                      {lesson.title}
                    </p>
                    <p className="text-sm text-gray-500">New lesson</p>
                    {lesson.locked && (
                      <p className="text-xs text-orange-500 mt-1">
                        Complete previous lessons to unlock
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {notStartedLessons
              .slice(0, Math.max(0, 6 - nextLessons.length))
              .map((lesson) => (
                <Link
                  key={lesson.id}
                  to={`/student/learn/${lesson.id}`}
                  className="card p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-pastel-green flex items-center justify-center flex-shrink-0">
                      <PlayCircle className="w-7 h-7 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">
                        {lesson.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {lesson.subject_name || lesson.subject_code} •{" "}
                        {lesson.estimated_duration_minutes || 10} min
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-blue flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">
            {stats.lessons_completed ||
              inProgressLessons.filter(
                (l: LessonListItem) =>
                  l.progress?.completion_percentage === 100,
              ).length}
          </p>
          <p className="text-sm text-gray-500">Lessons Done</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-green flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">
            {stats.rewards_earned ||
              rewardsPreview.filter((r) => r.earned).length}
          </p>
          <p className="text-sm text-gray-500">Rewards</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-pink flex items-center justify-center mx-auto mb-3">
            <Clock className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">
            {stats.time_this_week || formatTimeSpent(0)}
          </p>
          <p className="text-sm text-gray-500">This Week</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-yellow flex items-center justify-center mx-auto mb-3">
            <Target className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">
            {stats.current_streak || 0}
          </p>
          <p className="text-sm text-gray-500">Day Streak</p>
        </div>
      </div>

      {/* My Rewards Preview */}
      {rewardsPreview.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold text-gray-900">
              My Rewards
            </h2>
            <Link
              to="/student/rewards"
              className="text-sm text-primary-500 hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {rewardsPreview.slice(0, 6).map((reward) => (
              <div
                key={reward.id}
                className={`flex-shrink-0 w-20 flex flex-col items-center p-4 rounded-xl ${
                  reward.earned
                    ? "bg-gradient-to-br from-pastel-yellow to-pastel-orange"
                    : "bg-gray-100 opacity-60"
                }`}
              >
                <div
                  className={`relative w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                    reward.earned
                      ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                      : "bg-gray-200"
                  }`}
                >
                  <Award
                    className={`w-8 h-8 ${reward.earned ? "text-white" : "text-gray-400"}`}
                  />
                  {!reward.earned && (
                    <Lock className="absolute top-2 right-2 w-4 h-4 text-gray-400" />
                  )}
                </div>
                <p className="text-xs font-medium text-center">{reward.name}</p>
                {reward.earned && (
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Path */}
      {(continueLearning.length > 0 || nextLessons.length > 0) && (
        <div className="card p-6 bg-gradient-to-br from-pastel-blue to-pastel-green">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-primary-500" />
            Your Learning Path
          </h2>
          <p className="text-gray-700 mb-4">
            You're doing great! Here's what's next:
          </p>
          <div className="flex flex-col gap-3">
            {continueLearning.slice(0, 1).map((item) => (
              <Link
                key={item.lesson_id}
                to={`/student/learn/${item.lesson_id}`}
                className="flex items-center gap-4 p-4 bg-white/30 rounded-xl backdrop-blur-sm hover:bg-white/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center">
                  <PlayCircle className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600">
                    {item.progress || 0}% complete
                  </p>
                </div>
              </Link>
            ))}
            {nextLessons.slice(0, 2).map((lesson) => (
              <Link
                key={lesson.lesson_id}
                to={`/student/learn/${lesson.lesson_id}`}
                className={`flex items-center gap-4 p-4 rounded-xl backdrop-blur-sm ${lesson.locked ? "bg-white/20 opacity-60" : "bg-white/30 hover:bg-white/50 transition-colors"}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center">
                  {lesson.locked ? (
                    <Lock className="w-5 h-5 text-gray-400" />
                  ) : (
                    <PlayCircle className="w-5 h-5 text-primary-500" />
                  )}
                </div>
                <div>
                  <p
                    className={`font-semibold text-gray-900 ${lesson.locked ? "text-gray-500" : ""}`}
                  >
                    {lesson.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {lesson.locked ? "Locked" : "New lesson"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
