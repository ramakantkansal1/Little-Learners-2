import {
  BookOpen,
  Trophy,
  Clock,
  Calendar,
  ChevronDown,
  Star,
  Loader2,
  Link,
} from "lucide-react";
import { useState, useEffect } from "react";
import { studentApi, type HistoryItem } from "@services/api";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await studentApi.getHistory();
        setHistory(response.data);
      } catch (err) {
        console.error("Failed to load history:", err);
        setError("Failed to load history. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  // Calculate stats from history
  const stats = {
    totalDays: 30,
    activeDays: history.filter(
      (h) => h.time_spent_seconds && h.time_spent_seconds > 0,
    ).length,
    totalLessons: history.reduce((sum, h) => sum + (h.lesson_title ? 1 : 0), 0),
    totalTime: (() => {
      const totalSeconds = history.reduce(
        (sum, h) => sum + (h.time_spent_seconds || 0),
        0,
      );
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    })(),
    totalRewards: history.reduce((sum, h) => sum + (h.lesson_title ? 1 : 0), 0), // simplified
    longestStreak: 0,
    currentStreak: 0,
  };

  // Simple streak calculation
  const calculateStreak = (history: HistoryItem[]) => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const sortedHistory = [...history].sort(
      (a, b) =>
        new Date(a.completed_at || 0).getTime() -
        new Date(b.completed_at || 0).getTime(),
    );

    let lastDate: Date | null = null;

    for (const item of sortedHistory) {
      if (!item.completed_at) continue;
      const itemDate = new Date(item.completed_at);
      itemDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.floor(
          (itemDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays === 1) {
          tempStreak += 1;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = itemDate;
    }

    // Check current streak from today backwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    currentStreak = 0;
    const checkDate = new Date(today);

    const historyMap = new Map(
      history.map((h) => [h.completed_at?.split("T")[0], h]),
    );

    while (historyMap.has(checkDate.toISOString().split("T")[0])) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return { currentStreak, longestStreak };
  };

  const { currentStreak, longestStreak } = calculateStreak(history);

  const updatedStats = {
    ...stats,
    currentStreak,
    longestStreak,
    totalRewards: history.filter((h) => h.lesson_title).length,
    totalLessons: history.filter((h) => h.lesson_title).length,
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <p className="text-gray-600">Loading your learning journey...</p>
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
            Unable to load history
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            Learning Journey
          </h1>
          <p className="text-gray-600 mt-1">
            Track your daily learning adventures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as "calendar" | "list")}
            className="input w-auto"
          >
            <option value="calendar">Calendar View</option>
            <option value="list">List View</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Days</p>
              <p className="text-2xl font-display font-bold text-gray-900">
                {updatedStats.activeDays}/{updatedStats.totalDays}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Lessons Completed</p>
              <p className="text-2xl font-display font-bold text-gray-900">
                {updatedStats.totalLessons}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-green flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Learning Time</p>
              <p className="text-2xl font-display font-bold text-gray-900">
                {updatedStats.totalTime}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-pink flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rewards Earned</p>
              <p className="text-2xl font-display font-bold text-gray-900">
                {updatedStats.totalRewards}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-yellow flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="card p-6 bg-gradient-to-br from-pastel-pink to-pastel-peach">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Current Streak</p>
            <p className="text-4xl font-display font-bold text-white">
              {updatedStats.currentStreak} days 🔥
            </p>
            <p className="text-white/70 mt-1">
              Longest streak: {updatedStats.longestStreak} days
            </p>
          </div>
          <div className="w-20 h-20 rounded-2xl bg-white/30 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-gray-900">
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronDown className="w-5 h-5 -rotate-90" />
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for first week */}
              {Array.from({
                length: new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  1,
                ).getDay(),
              }).map((_, i) => (
                <div key={i} className="aspect-square" />
              ))}

              {/* Days of month */}
              {Array.from({
                length: new Date(
                  month.getFullYear(),
                  month.getMonth() + 1,
                  0,
                ).getDate(),
              }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayData = history.find((h) =>
                  h.completed_at?.startsWith(dateStr),
                );
                const isToday =
                  dateStr === new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={day}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-colors ${
                      isToday
                        ? "bg-primary-100 text-primary-700"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <span>{day}</span>
                    {dayData && dayData.lesson_title && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      </div>
                    )}
                    {dayData && dayData.lesson_title && (
                      <Star className="absolute top-1 right-1 w-3 h-3 text-yellow-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {history
              .slice()
              .reverse()
              .map((item, index) => (
                <div key={index} className="p-5 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          item.lesson_title ? "bg-pastel-blue" : "bg-gray-100"
                        }`}
                      >
                        {item.lesson_title ? (
                          <BookOpen className="w-6 h-6 text-primary-500" />
                        ) : (
                          <Clock className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {new Date(item.completed_at || "").toLocaleDateString(
                            "en-US",
                            { weekday: "long", month: "short", day: "numeric" },
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.lesson_title
                            ? `${item.lesson_title} • ${formatTime(item.time_spent_seconds)}`
                            : "No learning activity"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        {formatTime(item.time_spent_seconds)}
                      </span>
                    </div>
                  </div>

                  {item.lesson_title && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="badge badge-primary">
                        {item.lesson_title}
                      </span>
                    </div>
                  )}

                  {item.score !== null && item.score !== undefined && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`badge ${item.score >= 70 ? "badge-success" : "badge-warning"}`}
                      >
                        Score: {item.score}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Legend</h3>
        <div className="flex flex-wrap gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary-100" /> Learning
            Day
          </span>
          <span className="flex items-center gap-2">
            <Star className="w-3 h-3 text-yellow-500" /> Reward Earned
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-100" /> Streak Day
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-100" /> No Activity
          </span>
        </div>
      </div>

      {history.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-pastel-blue flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-primary-400" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
            No learning history yet
          </h3>
          <p className="text-gray-600 mb-6">
            Complete your first lesson to start your learning journey!
          </p>
          <Link to="/student/dashboard" className="btn btn-primary">
            Start Learning
          </Link>
        </div>
      )}
    </div>
  );
}
