import { Users, BookOpen, Image, TrendingUp, CheckCircle, Star, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const stats = [
  { label: 'Registered Parents', value: '1,234', change: '+12%', trend: 'up', icon: Users, color: 'bg-pastel-blue' },
  { label: 'Child Profiles', value: '2,156', change: '+8%', trend: 'up', icon: Users, color: 'bg-pastel-green' },
  { label: 'Published Lessons', value: '48', change: '+3', trend: 'up', icon: BookOpen, color: 'bg-pastel-pink' },
  { label: 'Activities Completed', value: '12,450', change: '+234', trend: 'up', icon: CheckCircle, color: 'bg-pastel-yellow' },
];

const recentActivity = [
  { time: '2 min ago', action: 'New parent registered', user: 'priya@example.com', type: 'user' },
  { time: '15 min ago', action: 'Lesson published', user: 'admin', details: 'Counting 1-20 (Mathematics)', type: 'content' },
  { time: '1 hour ago', action: 'Media uploaded', user: 'content_team', details: '5 images for Nursery', type: 'media' },
  { time: '3 hours ago', action: 'Content review completed', user: 'reviewer', details: 'Hindi Alphabet lesson approved', type: 'review' },
  { time: '5 hours ago', action: 'New child profile created', user: 'rahul@example.com', type: 'user' },
];

const contentStatus = [
  { status: 'Published', count: 48, color: 'bg-green-500' },
  { status: 'In Review', count: 12, color: 'bg-yellow-500' },
  { status: 'Draft', count: 8, color: 'bg-blue-500' },
  { status: 'Archived', count: 3, color: 'bg-gray-500' },
];

const topLessons = [
  { title: 'Counting 1-10', subject: 'Mathematics', completions: 1250, rating: 4.9 },
  { title: 'Letter Sounds A-E', subject: 'English', completions: 1180, rating: 4.8 },
  { title: 'Shapes & Colors', subject: 'Mathematics', completions: 980, rating: 4.7 },
  { title: 'My Family', subject: 'EVS', completions: 890, rating: 4.8 },
  { title: 'Rhyming Words', subject: 'English', completions: 750, rating: 4.6 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Platform overview and key metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Link key={index} to={`/admin/${stat.label.toLowerCase().replace(/\s+/g, '-')}`} className="card p-6 group hover:shadow-soft transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-display font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-14 h-14 rounded-xl ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-7 h-7 text-primary-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <TrendingUp className={`w-4 h-4 ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'} font-medium`}>{stat.change}</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Content Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-gray-900">Content Status</h2>
            <Link to="/admin/curriculum" className="text-sm text-primary-500 hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            {contentStatus.map(item => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="font-medium text-gray-900">{item.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(item.count / 71) * 100}%` }}
                      // Note: In real app, calculate percentage based on max
                    />
                  </div>
                  <span className="font-semibold text-gray-900 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-gray-900">Recent Activity</h2>
            <Link to="/admin/audit-logs" className="text-sm text-primary-500 hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.type === 'user' ? 'bg-pastel-blue' : activity.type === 'content' ? 'bg-pastel-green' : activity.type === 'media' ? 'bg-pastel-pink' : 'bg-pastel-yellow'}`}>
                  {activity.type === 'user' && <Users className="w-5 h-5 text-primary-500" />}
                  {activity.type === 'content' && <BookOpen className="w-5 h-5 text-primary-500" />}
                  {activity.type === 'media' && <Image className="w-5 h-5 text-primary-500" />}
                  {activity.type === 'review' && <FileText className="w-5 h-5 text-primary-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  {activity.details && <p className="text-sm text-gray-500">{activity.details}</p>}
                  <p className="text-xs text-gray-400 mt-1">By {activity.user} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Lessons */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-gray-900">Top Lessons by Completion</h2>
          <Link to="/admin/analytics" className="text-sm text-primary-500 hover:underline">View Analytics</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Lesson</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Completions</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
              </tr>
            </thead>
            <tbody>
              {topLessons.map((lesson, index) => (
                <tr key={index} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-gray-900">{lesson.title}</td>
                  <td className="p-4 text-gray-600">{lesson.subject}</td>
                  <td className="p-4 font-semibold text-gray-900">{lesson.completions.toLocaleString()}</td>
                  <td className="p-4 flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{lesson.rating}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/curriculum/lessons/new" className="card p-5 text-center group hover:shadow-soft transition-shadow border-2 border-dashed border-gray-200 hover:border-primary-300">
            <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Create Lesson</h3>
            <p className="text-sm text-gray-600">Add new learning content</p>
          </Link>
          <Link to="/admin/media/upload" className="card p-5 text-center group hover:shadow-soft transition-shadow border-2 border-dashed border-gray-200 hover:border-primary-300">
            <div className="w-12 h-12 rounded-xl bg-pastel-green flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Image className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Upload Media</h3>
            <p className="text-sm text-gray-600">Add images & audio</p>
          </Link>
          <Link to="/admin/users/new" className="card p-5 text-center group hover:shadow-soft transition-shadow border-2 border-dashed border-gray-200 hover:border-primary-300">
            <div className="w-12 h-12 rounded-xl bg-pastel-pink flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Add User</h3>
            <p className="text-sm text-gray-600">Create admin/parent accounts</p>
          </Link>
          <Link to="/admin/settings" className="card p-5 text-center group hover:shadow-soft transition-shadow border-2 border-dashed border-gray-200 hover:border-primary-300">
            <div className="w-12 h-12 rounded-xl bg-pastel-yellow flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Settings</h3>
            <p className="text-sm text-gray-600">Platform configuration</p>
          </Link>
        </div>
      </div>
    </div>
  );
}