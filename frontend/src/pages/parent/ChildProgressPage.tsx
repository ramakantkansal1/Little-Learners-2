import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Trophy, TrendingUp, Clock, Target, Star, CheckCircle, AlertCircle } from 'lucide-react';

const progressData = {
  overview: {
    lessonsCompleted: 24,
    totalLessons: 48,
    timeThisWeek: '3h 45m',
    timeThisMonth: '14h 20m',
    currentStreak: 5,
    longestStreak: 12,
    rewardsEarned: 28,
  },
  subjects: [
    { name: 'English', progress: 75, lessonsDone: 12, totalLessons: 16, color: 'bg-red-500' },
    { name: 'Hindi', progress: 60, lessonsDone: 9, totalLessons: 15, color: 'bg-orange-500' },
    { name: 'Mathematics', progress: 80, lessonsDone: 14, totalLessons: 18, color: 'bg-blue-500' },
    { name: 'EVS', progress: 55, lessonsDone: 8, totalLessons: 14, color: 'bg-green-500' },
    { name: 'Art & Music', progress: 90, lessonsDone: 6, totalLessons: 7, color: 'bg-purple-500' },
  ],
  recentLessons: [
    { name: 'Counting 1-20', subject: 'Mathematics', completed: '2 hours ago', score: 95, time: '12 min' },
    { name: 'Letter Sounds A-Z', subject: 'English', completed: 'Yesterday', score: 88, time: '15 min' },
    { name: 'Shapes & Patterns', subject: 'Mathematics', completed: '2 days ago', score: 100, time: '10 min' },
    { name: 'My Family', subject: 'EVS', completed: '3 days ago', score: 92, time: '8 min' },
    { name: 'Rhyming Words', subject: 'English', completed: '5 days ago', score: 85, time: '12 min' },
  ],
  strengths: [
    'Number recognition 1-20',
    'Shape identification',
    'Color matching',
    'Following audio instructions',
  ],
  needsPractice: [
    'Hindi letter recognition',
    'Counting backwards',
    'Letter sound blending',
    'Fine motor tracing',
  ],
  weeklyProgress: [
    { day: 'Mon', lessons: 2, time: 25 },
    { day: 'Tue', lessons: 1, time: 15 },
    { day: 'Wed', lessons: 3, time: 40 },
    { day: 'Thu', lessons: 0, time: 0 },
    { day: 'Fri', lessons: 2, time: 30 },
    { day: 'Sat', lessons: 1, time: 20 },
    { day: 'Sun', lessons: 1, time: 15 },
  ],
};

export default function ChildProgressPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <a href="/parent/children" className="btn btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Aarav's Progress</h1>
          <p className="text-gray-600">Nursery • Age 4 • Overall: 68% complete</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Lessons Completed</p>
              <p className="text-3xl font-display font-bold text-gray-900">{progressData.overview.lessonsCompleted} / {progressData.overview.totalLessons}</p>
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
              <p className="text-3xl font-display font-bold text-gray-900">{progressData.overview.timeThisWeek}</p>
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
              <p className="text-3xl font-display font-bold text-gray-900">{progressData.overview.currentStreak} days</p>
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
              <p className="text-3xl font-display font-bold text-gray-900">{progressData.overview.rewardsEarned}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pastel-yellow flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Subject Progress */}
      <div className="card p-6">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Subject Progress</h2>
        <div className="space-y-4">
          {progressData.subjects.map(subject => (
            <div key={subject.name} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl ${subject.color} flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">{subject.name.charAt(0)}</span>
                  </div>
                  <span className="font-medium text-gray-900">{subject.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{subject.lessonsDone}/{subject.totalLessons} lessons</span>
                  <span className="font-semibold text-gray-900">{subject.progress}%</span>
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
          <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Weekly Activity</h2>
          <div className="flex items-end justify-between h-48 gap-2">
            {progressData.weeklyProgress.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-pastel-blue rounded-t transition-all duration-300 hover:bg-primary-500"
                  style={{ height: `${Math.max(day.time / 50, 5)}%`, minHeight: '4px' }}
                />
                <span className="text-xs text-gray-500">{day.day}</span>
                <span className="text-xs text-gray-400">{day.lessons} lessons</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">This week: {progressData.weeklyProgress.reduce((a, b) => a + b.lessons, 0)} lessons • {progressData.weeklyProgress.reduce((a, b) => a + b.time, 0)} minutes</p>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Recent Lessons</h2>
          <div className="space-y-3">
            {progressData.recentLessons.map((lesson, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl group hover:bg-gray-100">
                <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{lesson.name}</p>
                  <p className="text-sm text-gray-500">{lesson.subject} • {lesson.completed}</p>
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
            {progressData.strengths.map((strength, index) => (
              <li key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
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
            {progressData.needsPractice.map((area, index) => (
              <li key={index} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
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
          <Link to="/student/learn/lesson-1" className="p-4 bg-white/30 rounded-xl backdrop-blur-sm hover:bg-white/50 transition-colors">
            <p className="font-semibold text-gray-900">Practice Hindi Letters</p>
            <p className="text-sm text-gray-600 mt-1">Focus on स्वर अ-इ</p>
          </Link>
          <Link to="/student/learn/lesson-2" className="p-4 bg-white/30 rounded-xl backdrop-blur-sm hover:bg-white/50 transition-colors">
            <p className="font-semibold text-gray-900">Counting Backwards</p>
            <p className="text-sm text-gray-600 mt-1">Numbers 20-1</p>
          </Link>
          <Link to="/student/learn/lesson-3" className="p-4 bg-white/30 rounded-xl backdrop-blur-sm hover:bg-white/50 transition-colors">
            <p className="font-semibold text-gray-900">Letter Sound Blending</p>
            <p className="text-sm text-gray-600 mt-1">CVC word building</p>
          </Link>
        </div>
      </div>
    </div>
  );
}