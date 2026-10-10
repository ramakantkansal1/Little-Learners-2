import { Link } from 'react-router-dom';
import { BookOpen, Trophy, Target, Star, Clock, CheckCircle, PlayCircle, Lock } from 'lucide-react';

const lessons = [
  { id: 1, title: 'Counting 1-10', subject: 'Mathematics', progress: 100, duration: '15 min', completed: true },
  { id: 2, title: 'Letter Sounds A-E', subject: 'English', progress: 100, duration: '12 min', completed: true },
  { id: 3, title: 'Shapes & Colors', subject: 'Mathematics', progress: 65, duration: '10 min', completed: false },
  { id: 4, title: 'My Family', subject: 'EVS', progress: 0, duration: '8 min', completed: false, locked: true },
  { id: 5, title: 'Rhyming Words', subject: 'English', progress: 0, duration: '12 min', completed: false, locked: true },
  { id: 6, title: 'Big & Small', subject: 'Mathematics', progress: 0, duration: '8 min', completed: false, locked: true },
];

const rewards = [
  { name: 'First Star', earned: true, icon: Star },
  { name: 'Five Stars', earned: true, icon: Star },
  { name: 'Counting Champ', earned: true, icon: Trophy },
  { name: 'Letter Explorer', earned: false, icon: BookOpen },
  { name: 'Shape Finder', earned: false, icon: Target },
  { name: 'Week Streak', earned: false, icon: Clock },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center text-4xl">
          👦
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Hello, Aarav!</h1>
          <p className="text-gray-600">Ready for today's adventure?</p>
        </div>
      </div>

      {/* Continue Learning */}
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4">Continue Learning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.filter(l => l.progress > 0 && l.progress < 100).map(lesson => (
            <Link
              key={lesson.id}
              to={`/student/learn/${lesson.id}`}
              className="card p-5 group hover:shadow-soft transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-pastel-blue flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <PlayCircle className="w-7 h-7 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{lesson.title}</p>
                  <p className="text-sm text-gray-500">{lesson.subject} • {lesson.duration}</p>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full"
                      style={{ width: `${lesson.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Next Lessons */}
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4">Up Next</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessons.filter(l => l.progress === 0).slice(0, 4).map(lesson => (
            <Link
              key={lesson.id}
              to={`/student/learn/${lesson.id}`}
              className={`card p-5 ${lesson.locked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  lesson.locked ? 'bg-gray-200' : 'bg-pastel-green'
                }`}>
                  {lesson.locked ? (
                    <Lock className="w-7 h-7 text-gray-400" />
                  ) : (
                    <PlayCircle className="w-7 h-7 text-primary-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-gray-900 ${lesson.locked ? 'text-gray-500' : ''}`}>{lesson.title}</p>
                  <p className="text-sm text-gray-500">{lesson.subject} • {lesson.duration}</p>
                  {lesson.locked && (
                    <p className="text-xs text-orange-500 mt-1">Complete previous lessons to unlock</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-blue flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">12</p>
          <p className="text-sm text-gray-500">Lessons Done</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-green flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">8</p>
          <p className="text-sm text-gray-500">Rewards</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-pink flex items-center justify-center mx-auto mb-3">
            <Clock className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">3h 45m</p>
          <p className="text-sm text-gray-500">This Week</p>
        </div>
        <div className="card p-5 text-center">
          <div className="w-14 h-14 rounded-xl bg-pastel-yellow flex items-center justify-center mx-auto mb-3">
            <Target className="w-7 h-7 text-primary-500" />
          </div>
          <p className="text-2xl font-display font-bold text-gray-900">5</p>
          <p className="text-sm text-gray-500">Day Streak</p>
        </div>
      </div>

      {/* My Rewards Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-gray-900">My Rewards</h2>
          <Link to="/student/rewards" className="text-sm text-primary-500 hover:underline">View All</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {rewards.map((reward, index) => (
            <div
              key={index}
              className={`flex-shrink-0 w-20 flex flex-col items-center p-4 rounded-xl ${
                reward.earned
                  ? 'bg-gradient-to-br from-pastel-yellow to-pastel-orange'
                  : 'bg-gray-100 opacity-60'
              }`}
            >
              <reward.icon className={`w-8 h-8 ${reward.earned ? 'text-yellow-600' : 'text-gray-400'}`} />
              <p className={`text-xs font-medium text-center mt-2 ${reward.earned ? 'text-yellow-800' : 'text-gray-500'}`}>
                {reward.name}
              </p>
              {reward.earned && <CheckCircle className="w-4 h-4 text-green-500 mt-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Learning Path */}
      <div className="card p-6 bg-gradient-to-br from-pastel-blue to-pastel-green">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-primary-500" />
          Your Learning Path
        </h2>
        <p className="text-gray-700 mb-4">You're doing great! Here's what's next:</p>
        <div className="flex flex-col gap-3">
          <Link to="/student/learn/3" className="flex items-center gap-4 p-4 bg-white/30 rounded-xl backdrop-blur-sm hover:bg-white/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Shapes & Colors</p>
              <p className="text-sm text-gray-600">65% complete • 10 min</p>
            </div>
          </Link>
          <Link to="/student/learn/4" className="flex items-center gap-4 p-4 bg-white/20 rounded-xl backdrop-blur-sm opacity-60">
            <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">My Family</p>
              <p className="text-sm text-gray-600">Locked • Complete Shapes & Colors first</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}