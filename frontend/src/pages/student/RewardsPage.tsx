import { Star, Award, Medal, Sparkles, Lock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { studentApi, type Reward } from "@services/api";

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  badge: Award,
  sticker: Medal,
  certificate: Sparkles,
};

const TypeIcon = ({
  type,
  className,
}: {
  type: string;
  className?: string;
}) => {
  const Icon = typeIcons[type];
  return Icon ? <Icon className={className} /> : null;
};

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  useEffect(() => {
    const loadRewards = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await studentApi.getRewards();
        setRewards(response.data);
      } catch (err) {
        console.error("Failed to load rewards:", err);
        setError("Failed to load rewards. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    loadRewards();
  }, []);

  const filteredRewards = rewards.filter((r) => {
    if (filter === "earned") return r.earned;
    if (filter === "locked") return !r.earned;
    return true;
  });

  const earnedCount = rewards.filter((r) => r.earned).length;
  const totalPoints = rewards
    .filter((r) => r.earned)
    .reduce((sum, r) => sum + (r.points_value || 0), 0);
  const earnedBadges = rewards.filter(
    (r) => r.earned && r.reward_type === "badge",
  ).length;
  const earnedStickers = rewards.filter(
    (r) => r.earned && r.reward_type === "sticker",
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <p className="text-gray-600">Loading your rewards...</p>
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
            Unable to load rewards
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
          My Rewards
        </h1>
        <p className="text-gray-600 mt-1">
          Celebrate your learning achievements!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-yellow flex items-center justify-center mx-auto mb-3">
            <Star className="w-7 h-7 text-yellow-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">
            {earnedCount}
          </p>
          <p className="text-sm text-gray-500">Rewards Earned</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-pink flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">
            {totalPoints}
          </p>
          <p className="text-sm text-gray-500">Total Points</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-blue flex items-center justify-center mx-auto mb-3">
            <Award className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">
            {earnedBadges}
          </p>
          <p className="text-sm text-gray-500">Badges</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-green flex items-center justify-center mx-auto mb-3">
            <Medal className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">
            {earnedStickers}
          </p>
          <p className="text-sm text-gray-500">Stickers</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["all", "earned", "locked"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as "all" | "earned" | "locked")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({filteredRewards.length})
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredRewards.map((reward) => (
          <div
            key={reward.id}
            className={`card p-5 text-center relative overflow-hidden ${
              reward.earned ? "" : "opacity-60 grayscale"
            }`}
          >
            {!reward.earned && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
            )}
            <div
              className={`relative w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                reward.earned
                  ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                  : "bg-gray-200"
              }`}
            >
              <TypeIcon
                type={reward.reward_type}
                className={`w-10 h-10 ${reward.earned ? "text-white" : "text-gray-400"}`}
              />
              {!reward.earned && (
                <Lock className="absolute top-2 right-2 w-4 h-4 text-gray-400" />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{reward.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{reward.description}</p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <TypeIcon
                type={reward.reward_type}
                className={`w-4 h-4 ${reward.earned ? "text-yellow-500" : "text-gray-400"}`}
              />
              <span
                className={`font-medium ${reward.earned ? "text-yellow-600" : "text-gray-400"}`}
              >
                {reward.points_value || 0} pts
              </span>
            </div>
            {reward.earned && reward.earned_at && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Earned {new Date(reward.earned_at).toLocaleDateString()}
                </p>
              </div>
            )}
            {!reward.earned && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Keep learning to unlock!
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRewards.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-pastel-yellow flex items-center justify-center mx-auto mb-4">
            <Star className="w-10 h-10 text-yellow-400" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
            {filter === "earned"
              ? "No rewards earned yet"
              : "All rewards unlocked!"}
          </h3>
          <p className="text-gray-600">
            {filter === "earned"
              ? "Complete activities and lessons to earn your first reward!"
              : "You've earned all available rewards. Amazing!"}
          </p>
        </div>
      )}
    </div>
  );
}
