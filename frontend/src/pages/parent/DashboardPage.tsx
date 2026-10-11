import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Trophy, TrendingUp, Star, Clock, Target, Loader2 } from 'lucide-react';
import { parentApi, type Child, type ChildProgress } from '@services';
import { useAuth } from '@hooks/useAuth';

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-500';
  if (score >= 90) return 'bg-green-100 text-green-700';
  if (score >= 70) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [progressData, setProgressData] = useState<Record<number, ChildProgress & { rewards_earned: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const profile = await parentApi.getMyProfile();
        setChildren(profile.data.children);
        
        // Load progress for each child
        for (const child of profile.data.children) {
          try {
            const progress = await parentApi.getChildProgress(child.id);
            setProgressData(prev => ({ ...prev, [child.id]: progress.data }));
          } catch (err) {
            console.error(`Failed to load progress for child ${child.id}:`, err);
          }
        }
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  const parentName = user?.role === 'parent' ? 'Priya' : 'Parent'; // TODO: get from profile

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const recentActivity = Object.entries(progressData).flatMap(([childId, progress]) => 
    progress.recent_activity.slice(0, 3).map((activity: { lesson: string; activity: string; completed_at: string | null; score: number | null }) => ({
      ...activity,
      child: children.find(c => c.id === parseInt(childId))?.display_name || 'Child',
    }))
  ).sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())
  .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            Welcome back, {parentName}!
          </h1>
          <p className="text-gray-600 mt-1">Here's how your little learners are doing</p>
        </div>
        <Link to="/parent/children" className="btn btn-primary">
          <Users className="w-5 h-5" />
          Add Child
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Children</p>
              <p className="text-3xl font-display font-bold text-gray-900">{children.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Lessons This Week</p>
              <p className="text-3xl font-display font-bold text-gray-900">
                {Object.values(progressData).reduce((sum, p) => sum + p.completed_lessons, 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-green flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Time Learning</p>
              <p className="text-3xl font-display font-bold text-gray-900">
                {Object.values(progressData).reduce((sum, p) => sum + p.total_time_spent_minutes, 0)} min
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-pink flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rewards Earned</p>
              <p className="text-3xl font-display font-bold text-gray-900">
                {Object.values(progressData).reduce((sum, p) => sum + (p.rewards_earned || 0), 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-yellow flex items-center justify-center">
              <Star className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Children Cards */}
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Your Children</h2>
        {children.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-pastel-blue flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-primary-500" />
            </div>
            <h3 className="text-xl font-display font-bold text-gray-900 mb-2">No children added yet</h3>
            <p className="text-gray-600 mb-6">Add your first child to start their learning journey</p>
            <Link to="/parent/children" className="btn btn-primary">
              <Users className="w-5 h-5" />
              Add Child
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children.map(child => {
              const progress = progressData[child.id];
              const progressPercent = progress?.completion_rate ?? 0;
              const stageName = progress?.stage_name || 'Unknown Stage';
              
              return (
                <Link
                  key={child.id}
                  to={`/parent/children/${child.id}`}
                  className="card p-6 group hover:shadow-soft transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {child.avatar_type === 'elephant' ? '🐘' : 
                       child.avatar_type === 'owl' ? '🦉' :
                       child.avatar_type === 'rabbit' ? '🐰' :
                       child.avatar_type === 'tiger' ? '🐯' :
                       child.avatar_type === 'girl' ? '👧' : '👦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-display font-bold text-gray-900">{child.display_name}</h3>
                        <span className="badge badge-primary">{stageName}</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        {child.date_of_birth ? `Age ${new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()}` : 'Age unknown'} 
                        • Last active: {formatLastActive(child.last_activity_at)}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Overall Progress</span>
                          <span className="font-semibold text-gray-900">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {children[0] && (
            <Link to={`/parent/children/${children[0].id}`} className="card p-6 text-center group">
              <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Continue Learning</h3>
              <p className="text-sm text-gray-600">{children[0].display_name}'s next lesson</p>
            </Link>
          )}
          {children[0] && (
            <Link to={`/parent/children/${children[0].id}/progress`} className="card p-6 text-center group">
              <div className="w-12 h-12 rounded-xl bg-pastel-green flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">View Progress</h3>
              <p className="text-sm text-gray-600">Detailed reports</p>
            </Link>
          )}
          <Link to="/parent/children" className="card p-6 text-center group">
            <div className="w-12 h-12 rounded-xl bg-pastel-pink flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Rewards</h3>
            <p className="text-sm text-gray-600">View children's achievements</p>
          </Link>
          <Link to="/parent/settings" className="card p-6 text-center group">
            <div className="w-12 h-12 rounded-xl bg-pastel-yellow flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Settings</h3>
            <p className="text-sm text-gray-600">Preferences & account</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-gray-900">Recent Activity</h2>
          {children[0] && (
            <Link to={`/parent/children/${children[0].id}/progress`} className="text-sm text-primary-500 hover:underline">View All</Link>
          )}
        </div>
        {recentActivity.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500">No recent activity yet. Start learning to see progress!</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Lesson</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Child</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity, index) => (
                  <tr key={index} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-gray-900">{activity.lesson}</td>
                    <td className="p-4 text-gray-600">{activity.child}</td>
                    <td className="p-4 text-gray-500 text-sm">{formatLastActive(activity.completed_at)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(activity.score)}`}>
                        {activity.score !== null ? `${activity.score}%` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Weekly Summary */}
        <div className="card p-6 bg-gradient-to-br from-pastel-blue to-pastel-green">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/30 flex items-center justify-center">
              <Target className="w-7 h-7 text-primary-500" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-gray-900">Weekly Learning Goal</h3>
              <p className="text-gray-600">
                {children[0] 
                  ? `${children[0].display_name} has completed ${Object.values(progressData).reduce((sum, p) => sum + p.completed_activities, 0)} activities this week. Great job!`
                  : 'Add a child to start tracking weekly goals'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}