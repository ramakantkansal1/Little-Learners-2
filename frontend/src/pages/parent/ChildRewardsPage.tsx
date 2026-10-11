import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Award, Medal, Sparkles, Lock, Trophy } from 'lucide-react';
import { parentApi, type Child } from '@services';

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

interface Reward {
  id: number;
  code: string;
  name: string;
  description: string | null;
  reward_type: string;
  image_url: string | null;
  points_value: number;
  earned: boolean;
  earned_at: string | null;
}

export default function ChildRewardsPage() {
  const { childId } = useParams<{ childId: string }>();
  const [child, setChild] = useState<Child | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  // Fetch child details and rewards
  useEffect(() => {
    if (childId) {
      Promise.all([
        parentApi.getChild(parseInt(childId)),
        parentApi.getChildRewards(parseInt(childId)),
      ])
        .then(([childResponse, rewardsResponse]) => {
          setChild(childResponse.data);
          setRewards(rewardsResponse.data.rewards);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [childId]);

  const filteredRewards = rewards.filter(r => {
    if (filter === 'earned') return r.earned;
    if (filter === 'locked') return !r.earned;
    return true;
  });

  const earnedCount = rewards.filter(r => r.earned).length;
  const totalPoints = rewards.filter(r => r.earned).reduce((sum, r) => sum + r.points_value, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <Trophy className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <p className="text-gray-600">Loading rewards...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">Child not found</p>
          <Link to="/parent/children" className="btn btn-primary">
            <ArrowLeft className="w-5 h-5" />
            Back to Children
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link to={`/parent/children/${childId}`} className="btn btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            {child.display_name}'s Rewards & Achievements
          </h1>
          <p className="text-gray-600 mt-1">Celebrate {child.display_name}'s learning achievements!</p>
        </div>
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
          <p className="text-2xl font-display font-bold text-gray-900">{rewards.filter(r => r.reward_type === 'badge' && r.earned).length}</p>
          <p className="text-sm text-gray-500">Badges</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-green flex items-center justify-center mx-auto mb-3">
            <Medal className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">{rewards.filter(r => r.reward_type === 'sticker' && r.earned).length}</p>
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
            {f.charAt(0).toUpperCase() + f.slice(1)} ({rewards.filter(r => filter === 'all' || r.earned === (f === 'earned')).length})
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
              <TypeIcon type={reward.reward_type} className={`w-10 h-10 ${reward.earned ? 'text-white' : 'text-gray-400'}`} />
              {!reward.earned && (
                <Lock className="absolute top-2 right-2 w-4 h-4 text-gray-400" />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{reward.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{reward.description}</p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <TypeIcon type={reward.reward_type} className={`w-4 h-4 ${reward.earned ? 'text-yellow-500' : 'text-gray-400'}`} />
              <span className={`font-medium ${reward.earned ? 'text-yellow-600' : 'text-gray-400'}`}>
                {reward.points_value} pts
              </span>
            </div>
            {reward.earned && reward.earned_at && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Earned {new Date(reward.earned_at).toLocaleDateString()}</p>
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

      {/* Context Note */}
      <div className="card p-4 bg-primary-50 border border-primary-100">
        <p className="text-sm text-primary-700 text-center">
          <Trophy className="w-4 h-4 inline-block mr-1" />
          This is the parent view of {child.display_name}'s rewards. 
          {child.display_name} sees a kid-friendly version in their own learning dashboard.
        </p>
      </div>
    </div>
  );
}