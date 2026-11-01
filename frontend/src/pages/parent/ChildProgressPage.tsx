import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Trophy,
  TrendingUp,
  Clock,
  Target,
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { parentApi, type ChildProgress } from "@services";

interface ChildProgressData extends ChildProgress {
  child_id: number;
  child_name: string;
  stage_code: string;
  stage_name: string;
  total_lessons: number;
  completed_lessons: number;
  in_progress_lessons: number;
  total_activities: number;
  completed_activities: number;
  total_time_spent_minutes: number;
  average_score: number | null;
  rewards_earned: number;
  recent_activity: Array<{
    lesson: string;
    activity: string;
    completed_at: string | null;
    score: number | null;
    time_spent: number;
  }>;
}

interface SubjectProgress {
  name: string;
  progress: number;
  lessonsDone: number;
  totalLessons: number;
  color: string;
}

interface RecentLesson {
  name: string;
  subject: string;
  completed: string;
  score: number;
  time: string;
}

interface WeeklyProgressItem {
  day: string;
  lessons: number;
  time: number;
}

export default function ChildProgressPage() {
  const { childId } = useParams<{ childId: string }>();
  const [progress, setProgress] = useState<ChildProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (childId) {
      parentApi
        .getChildProgress(parseInt(childId))
        .then((response) => {
          setProgress(response.data);
          setLoading(false);
        })
        .catch((err) => {
          setError("Failed to load progress data");
          setLoading(false);
          console.error("Progress load error:", err);
        });
    }
  }, [childId]);

  // Helper to format time
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Helper to format recent activity time
  const formatRecentTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} sec`;
    const mins = Math.floor(seconds / 60);
    return mins < 60
      ? `${mins} min`
      : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  // Derive subject progress from recent activity (since we don't have subject-level API yet)
  const getSubjectProgress = (): SubjectProgress[] => {
    if (!progress) return [];

    // For now, return a placeholder structure that matches the UI
    // In a real implementation, this would come from a subject-level progress API
    return [
      {
        name: "English",
        progress: 0,
        lessonsDone: 0,
        totalLessons: 0,
        color: "bg-red-500",
      },
      {
        name: "Hindi",
        progress: 0,
        lessonsDone: 0,
        totalLessons: 0,
        color: "bg-orange-500",
      },
      {
        name: "Mathematics",
        progress: 0,
        lessonsDone: 0,
        totalLessons: 0,
        color: "bg-blue-500",
      },
      {
        name: "EVS",
        progress: 0,
        lessonsDone: 0,
        totalLessons: 0,
        color: "bg-green-500",
      },
      {
        name: "Art & Music",
        progress: 0,
        lessonsDone: 0,
        totalLessons: 0,
        color: "bg-purple-500",
      },
    ];
  };

  // Derive recent lessons from recent activity
  const getRecentLessons = (): RecentLesson[] => {
    if (!progress?.recent_activity) return [];
    return progress.recent_activity.slice(0, 5).map((activity) => ({
      name: activity.lesson,
      subject: "General", // Would need subject mapping
      completed: activity.completed_at
        ? new Date(activity.completed_at).toLocaleDateString()
        : "Unknown",
      score: activity.score || 0,
      time: formatRecentTime(activity.time_spent),
    }));
  };

  // Derive strengths and practice areas from recent activity scores
  const getStrengths = (): string[] => {
    if (!progress?.recent_activity) return [];
    const highScores = progress.recent_activity
      .filter((a) => a.score !== null && a.score >= 90)
      .map((a) => a.lesson)
      .slice(0, 4);
    return highScores.length > 0
      ? highScores
      : [
          "Consistent effort",
          "Regular practice",
          "Good participation",
          "Following instructions",
        ];
  };

  const getNeedsPractice = (): string[] => {
    if (!progress?.recent_activity) return [];
    const lowScores = progress.recent_activity
      .filter((a) => a.score !== null && a.score < 70)
      .map((a) => a.lesson)
      .slice(0, 4);
    return lowScores.length > 0
      ? lowScores
      : ["Areas for improvement will appear here"];
  };

  // Weekly progress from recent activity
  const getWeeklyProgress = (): WeeklyProgressItem[] => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    if (!progress?.recent_activity) {
      return days.map((day) => ({ day, lessons: 0, time: 0 }));
    }

    // Group recent activity by day of week
    const dayMap = new Map<string, { lessons: number; time: number }>();
    days.forEach((day) => dayMap.set(day, { lessons: 0, time: 0 }));

    progress.recent_activity.forEach((activity) => {
      if (activity.completed_at) {
        const date = new Date(activity.completed_at);
        const day = days[date.getDay()];
        const current = dayMap.get(day) || { lessons: 0, time: 0 };
        current.lessons += 1;
        current.time += Math.floor((activity.time_spent || 0) / 60);
        dayMap.set(day, current);
      }
    });

    return days.map((day) => ({ day, ...dayMap.get(day)! }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <p className="text-gray-600">Loading progress...</p>
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error || "Progress data not found"}
          </p>
          <Link to="/parent/children" className="btn btn-primary">
            <ArrowLeft className="w-5 h-5" />
            Back to Children
          </Link>
        </div>
      </div>
    );
  }

  const completionRate =
    progress.total_lessons > 0
      ? Math.round((progress.completed_lessons / progress.total_lessons) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/parent/children" className="btn btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {progress.child_name}'s Progress
          </h1>
          <p className="text-gray-600">
            {progress.stage_name} • Overall: {completionRate}% complete
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Lessons Completed</p>
              <p className="text-3xl font-display font-bold text-gray-900">
                {progress.completed_lessons} / {progress.total_lessons}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Time This Week</p>
              <p className="text-3xl font-display font-bold text-gray-900">
                {formatTime(progress.total_time_spent_minutes)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-green flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Streak</p>
              <p className="text-3xl font-display font-bold text-gray-900">
                -- days
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-pink flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rewards Earned</p>
              <p className="text-3xl font-display font-bold text-gray-900">
                {progress.rewards_earned}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-yellow flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Subject Progress */}
      <div className="card p-6">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-6">
          Subject Progress
        </h2>
        <div className="space-y-4">
          {getSubjectProgress().map((subject) => (
            <div key={subject.name} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl ${subject.color} flex items-center justify-center`}
                  >
                    <span className="text-white font-bold text-sm">
                      {subject.name.charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {subject.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    {subject.lessonsDone}/{subject.totalLessons} lessons
                  </span>
                  <span className="font-semibold text-gray-900">
                    {subject.progress}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${subject.color}`}
                  style={{ width: `${subject.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-6">
            Weekly Activity
          </h2>
          <div className="flex items-end justify-between h-48 gap-2">
            {getWeeklyProgress().map((day, index) => (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div
                  className="w-full bg-pastel-blue rounded-t transition-all duration-300 hover:bg-primary-500"
                  style={{
                    height: `${Math.max(day.time / 50, 5)}%`,
                    minHeight: "4px",
                  }}
                />
                <span className="text-xs text-gray-500">{day.day}</span>
                <span className="text-xs text-gray-400">
                  {day.lessons} lessons
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            This week: {getWeeklyProgress().reduce((a, b) => a + b.lessons, 0)}{" "}
            lessons • {getWeeklyProgress().reduce((a, b) => a + b.time, 0)}{" "}
            minutes
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-6">
            Recent Lessons
          </h2>
          <div className="space-y-3">
            {getRecentLessons().map((lesson, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl group hover:bg-gray-100"
              >
                <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {lesson.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {lesson.subject} • {lesson.completed}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    {lesson.score}%
                  </span>
                  <span className="text-gray-500">{lesson.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strengths & Areas for Practice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Strengths
          </h2>
          <ul className="space-y-3">
            {getStrengths().map((strength, index) => (
              <li
                key={index}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-xl"
              >
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-orange-500" />
            Areas for Practice
          </h2>
          <ul className="space-y-3">
            {getNeedsPractice().map((area, index) => (
              <li
                key={index}
                className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl"
              >
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <span className="text-gray-700">{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Next Steps */}
      <div className="card p-6 bg-gradient-to-br from-pastel-blue to-pastel-green">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-primary-500" />
          Recommended Next Steps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/student/learn/lesson-1"
            className="p-4 bg-white/30 rounded-xl backdrop-blur-sm hover:bg-white/50 transition-colors"
          >
            <p className="font-semibold text-gray-900">
              Practice Hindi Letters
            </p>
            <p className="text-sm text-gray-600 mt-1">Focus on स्वर अ-इ</p>
          </Link>
          <Link
            to="/student/learn/lesson-2"
            className="p-4 bg-white/30 rounded-xl backdrop-blur-sm hover:bg-white/50 transition-colors"
          >
            <p className="font-semibold text-gray-900">Counting Backwards</p>
            <p className="text-sm text-gray-600 mt-1">Numbers 20-1</p>
          </Link>
          <Link
            to="/student/learn/lesson-3"
            className="p-4 bg-white/30 rounded-xl backdrop-blur-sm hover:bg-white/50 transition-colors"
          >
            <p className="font-semibold text-gray-900">Letter Sound Blending</p>
            <p className="text-sm text-gray-600 mt-1">CVC word building</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
