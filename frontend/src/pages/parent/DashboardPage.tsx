import { Link } from 'react-router-dom';
import { Users, BookOpen, Trophy, TrendingUp, Star, Clock, Target } from 'lucide-react';

const children = [
  { id: 1, name: 'Aarav', age: 4, stage: 'Nursery', avatar: '👦', progress: 65, lastActive: '2 hours ago' },
  { id: 2, name: 'Anaya', age: 6, stage: 'UKG', avatar: '👧', progress: 82, lastActive: 'Yesterday' },
];

const recentActivity = [
  { lesson: 'Counting 1-10', child: 'Aarav', completed: '2 hours ago', score: 90 },
  { lesson: 'Letter Sounds A-E', child: 'Anaya', completed: 'Yesterday', score: 85 },
  { lesson: 'Shapes Matching', child: 'Aarav', completed: '2 days ago', score: 100 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">Welcome back, Priya!</h1>
          <p className="text-gray-600 mt-1">Here's how your little learners are doing</p>
        </div>
        <Link to="/parent/children" className="btn btn-primary">
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
              <p className="text-3xl font-display font-bold text-gray-900">12</p>
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
              <p className="text-3xl font-display font-bold text-gray-900">3h 45m</p>
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
              <p className="text-3xl font-display font-bold text-gray-900">28</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map(child => (
            <Link
              key={child.id}
              to={`/parent/children/${child.id}`}
              className="card p-6 group hover:shadow-soft transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">
                  {child.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-display font-bold text-gray-900">{child.name}</h3>
                    <span className="badge badge-primary">{child.stage}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Age {child.age} • Last active: {child.lastActive}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Overall Progress</span>
                      <span className="font-semibold text-gray-900">{child.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full transition-all duration-500"
                        style={{ width: `${child.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/parent/children/1" className="card p-6 text-center group">
            <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Continue Learning</h3>
            <p className="text-sm text-gray-600">Aarav's next lesson</p>
          </Link>
          <Link to="/parent/children/1/progress" className="card p-6 text-center group">
            <div className="w-12 h-12 rounded-xl bg-pastel-green flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">View Progress</h3>
            <p className="text-sm text-gray-600">Detailed reports</p>
          </Link>
          <Link to="/student/rewards" className="card p-6 text-center group">
            <div className="w-12 h-12 rounded-xl bg-pastel-pink flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Rewards</h3>
            <p className="text-sm text-gray-600">Stars & badges earned</p>
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
          <Link to="/parent/children/1/progress" className="text-sm text-primary-500 hover:underline">View All</Link>
        </div>
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
                  <td className="p-4 text-gray-500 text-sm">{activity.completed}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      activity.score >= 90 ? 'bg-green-100 text-green-700' :
                      activity.score >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {activity.score}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="card p-6 bg-gradient-to-br from-pastel-blue to-pastel-green">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/30 flex items-center justify-center">
            <Target className="w-7 h-7 text-primary-500" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-gray-900">Weekly Learning Goal</h3>
            <p className="text-gray-600">Aarav has completed 5 out of 7 recommended activities this week. Great job!</p>
          </div>
        </div>
      </div>
    </div>
  );
}