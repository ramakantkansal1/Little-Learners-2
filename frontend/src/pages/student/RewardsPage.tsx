import { Star, Award, Medal, Sparkles, Lock } from 'lucide-react';
import { useState } from 'react';

const allRewards = [
  { id: 1, name: 'First Star', description: 'Earned your first star!', type: 'star', earned: true, earnedAt: '2024-01-15', points: 1 },
  { id: 2, name: 'Five Stars', description: 'Collected 5 stars!', type: 'star', earned: true, earnedAt: '2024-01-20', points: 5 },
  { id: 3, name: 'Ten Stars', description: 'Collected 10 stars!', type: 'star', earned: false, earnedAt: null, points: 10 },
  { id: 4, name: 'First Lesson', description: 'Completed your first lesson!', type: 'badge', earned: true, earnedAt: '2024-01-10', points: 10 },
  { id: 5, name: 'Five Lessons', description: 'Completed 5 lessons!', type: 'badge', earned: true, earnedAt: '2024-01-18', points: 25 },
  { id: 6, name: 'Perfect Score', description: 'Got 100% on an activity!', type: 'sticker', earned: true, earnedAt: '2024-01-16', points: 5 },
  { id: 7, name: 'Week Streak', description: 'Learned 7 days in a row!', type: 'badge', earned: false, earnedAt: null, points: 50 },
  { id: 8, name: 'Animal Friend', description: 'Met all the animal friends!', type: 'sticker', earned: false, earnedAt: null, points: 15 },
  { id: 9, name: 'Color Master', description: 'Learned all the colors!', type: 'badge', earned: false, earnedAt: null, points: 20 },
  { id: 10, name: 'Shape Explorer', description: 'Found all the shapes!', type: 'badge', earned: false, earnedAt: null, points: 20 },
];

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  badge: Award,
  sticker: Medal,
  certificate: Sparkles,
};

const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
  const Icon = typeIcons[type];
  return Icon ? <Icon className={className} /> : null;
};

export default function RewardsPage() {
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  const filteredRewards = allRewards.filter(r => {
    if (filter === 'earned') return r.earned;
    if (filter === 'locked') return !r.earned;
    return true;
  });

  const earnedCount = allRewards.filter(r => r.earned).length;
  const totalPoints = allRewards.filter(r => r.earned).reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">My Rewards</h1>
        <p className="text-gray-600 mt-1">Celebrate your learning achievements!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-yellow flex items-center justify-center mx-auto mb-3">
            <Star className="w-7 h-7 text-yellow-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">{earnedCount}</p>
          <p className="text-sm text-gray-500">Rewards Earned</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-pink flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">{totalPoints}</p>
          <p className="text-sm text-gray-500">Total Points</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-blue flex items-center justify-center mx-auto mb-3">
            <Award className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">{allRewards.filter(r => r.type === 'badge' && r.earned).length}</p>
          <p className="text-sm text-gray-500">Badges</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-green flex items-center justify-center mx-auto mb-3">
            <Medal className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">{allRewards.filter(r => r.type === 'sticker' && r.earned).length}</p>
          <p className="text-sm text-gray-500">Stickers</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'earned', 'locked'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as 'all' | 'earned' | 'locked')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({allRewards.filter(r => filter === 'all' || r.earned === (f === 'earned')).length})
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredRewards.map(reward => (
          <div
            key={reward.id}
            className={`card p-5 text-center relative overflow-hidden ${
              reward.earned ? '' : 'opacity-60 grayscale'
            }`}
          >
            {!reward.earned && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
            )}
            <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              reward.earned
                ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                : 'bg-gray-200'
            }`}>
              <TypeIcon type={reward.type} className={`w-10 h-10 ${reward.earned ? 'text-white' : 'text-gray-400'}`} />
              {!reward.earned && (
                <Lock className="absolute top-2 right-2 w-4 h-4 text-gray-400" />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{reward.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{reward.description}</p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <TypeIcon type={reward.type} className={`w-4 h-4 ${reward.earned ? 'text-yellow-500' : 'text-gray-400'}`} />
              <span className={`font-medium ${reward.earned ? 'text-yellow-600' : 'text-gray-400'}`}>
                {reward.points} pts
              </span>
            </div>
            {reward.earned && reward.earnedAt && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Earned {new Date(reward.earnedAt).toLocaleDateString()}</p>
              </div>
            )}
            {!reward.earned && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Keep learning to unlock!</p>
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
            {filter === 'earned' ? 'No rewards earned yet' : 'All rewards unlocked!'}
          </h3>
          <p className="text-gray-600">
            {filter === 'earned'
              ? 'Complete activities and lessons to earn your first reward!'
              : 'You\'ve earned all available rewards. Amazing!'}
          </p>
        </div>
      )}
    </div>
  );
}