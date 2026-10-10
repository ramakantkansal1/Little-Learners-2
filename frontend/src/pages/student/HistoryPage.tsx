import { BookOpen, Trophy, Clock, Calendar, ChevronDown, Star } from 'lucide-react';
import { useState } from 'react';

const history = [
  { date: '2024-01-15', lessons: ['Counting 1-10', 'Letter Sounds A-E'], time: '25 min', rewards: ['First Star', 'First Lesson'], streak: 1 },
  { date: '2024-01-16', lessons: ['Shapes & Colors'], time: '15 min', rewards: ['Perfect Score'], streak: 2 },
  { date: '2024-01-17', lessons: [], time: '0 min', rewards: [], streak: 0 },
  { date: '2024-01-18', lessons: ['My Family', 'Rhyming Words'], time: '30 min', rewards: ['Five Lessons', 'Five Stars'], streak: 1 },
  { date: '2024-01-19', lessons: ['Counting 1-20'], time: '20 min', rewards: [], streak: 2 },
  { date: '2024-01-20', lessons: ['Letter Sounds F-J'], time: '18 min', rewards: [], streak: 3 },
  { date: '2024-01-21', lessons: ['Big & Small'], time: '12 min', rewards: [], streak: 4 },
  { date: '2024-01-22', lessons: ['Number Song', 'Animal Friends'], time: '22 min', rewards: [], streak: 5 },
];

const stats = {
  totalDays: 30,
  activeDays: 22,
  totalLessons: 24,
  totalTime: '7h 30m',
  totalRewards: 12,
  longestStreak: 5,
  currentStreak: 5,
};

export default function HistoryPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [month, setMonth] = useState(new Date());

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">Learning Journey</h1>
          <p className="text-gray-600 mt-1">Track your daily learning adventures</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={view} onChange={(e) => setView(e.target.value as 'calendar' | 'list')} className="input w-auto">
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
              <p className="text-2xl font-display font-bold text-gray-900">{stats.activeDays}/{stats.totalDays}</p>
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
              <p className="text-2xl font-display font-bold text-gray-900">{stats.totalLessons}</p>
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
              <p className="text-2xl font-display font-bold text-gray-900">{stats.totalTime}</p>
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
              <p className="text-2xl font-display font-bold text-gray-900">{stats.totalRewards}</p>
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
            <p className="text-4xl font-display font-bold text-white">{stats.currentStreak} days 🔥</p>
            <p className="text-white/70 mt-1">Longest streak: {stats.longestStreak} days</p>
          </div>
          <div className="w-20 h-20 rounded-2xl bg-white/30 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-gray-900">
              {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                <ChevronDown className="w-5 h-5 -rotate-90" />
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for first week */}
              {Array.from({ length: new Date(month.getFullYear(), month.getMonth(), 1).getDay() }).map((_, i) => (
                <div key={i} className="aspect-square" />
              ))}

              {/* Days of month */}
              {Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayData = history.find(h => h.date === dateStr);
                const isToday = dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={day}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-colors ${
                      isToday ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span>{day}</span>
                    {dayData && dayData.lessons.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                        {dayData.lessons.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        ))}
                        {dayData.lessons.length > 3 && (
                          <span className="text-[10px] text-primary-500">+{dayData.lessons.length - 3}</span>
                        )}
                      </div>
                    )}
                    {dayData && dayData.rewards.length > 0 && (
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
      {view === 'list' && (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {history.slice().reverse().map((day, index) => (
              <div key={index} className="p-5 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      day.lessons.length > 0 ? 'bg-pastel-blue' : 'bg-gray-100'
                    }`}>
                      {day.lessons.length > 0 ? (
                        <BookOpen className="w-6 h-6 text-primary-500" />
                      ) : (
                        <Clock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                      <p className="text-sm text-gray-500">
                        {day.lessons.length > 0
                          ? `${day.lessons.length} lesson${day.lessons.length > 1 ? 's' : ''} • ${day.time}`
                          : 'No learning activity'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {day.streak > 0 && (
                      <span className="flex items-center gap-1 text-orange-500 font-medium">
                        <span className="w-4 h-4">🔥</span> {day.streak}
                      </span>
                    )}
                    <span className="text-gray-500">{day.time}</span>
                  </div>
                </div>

                {day.lessons.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {day.lessons.map((lesson, i) => (
                      <span key={i} className="badge badge-primary">{lesson}</span>
                    ))}
                  </div>
                )}

                {day.rewards.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {day.rewards.map((reward, i) => (
                      <span key={i} className="flex items-center gap-1 text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3" />
                        {reward}
                      </span>
                    ))}
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
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary-100" /> Learning Day</span>
          <span className="flex items-center gap-2"><Star className="w-3 h-3 text-yellow-500" /> Reward Earned</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-100" /> Streak Day</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-100" /> No Activity</span>
        </div>
      </div>
    </div>
  );
}