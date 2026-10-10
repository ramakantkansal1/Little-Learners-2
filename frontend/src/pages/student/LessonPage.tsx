import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle, PlayCircle, Clock, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

const lesson = {
  id: 1,
  title: 'Counting 1-10',
  subject: 'Mathematics',
  description: 'Learn to count from 1 to 10 with fun objects and animals!',
  duration: '15 min',
  progress: 65,
  activities: [
    { id: 1, title: 'Count the Apples', type: 'counting', completed: true, score: 100 },
    { id: 2, title: 'Number Match', type: 'number_recognition', completed: true, score: 90 },
    { id: 3, title: 'Count with Fingers', type: 'counting', completed: false, score: null },
    { id: 4, title: 'Number Song', type: 'story_listening', completed: false, score: null },
  ],
};

export default function LessonPage() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentActivity] = useState(2); // 0-indexed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/student/dashboard" className="btn btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-primary">{lesson.subject}</span>
            <span className="text-sm text-gray-500">{lesson.duration}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{lesson.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="btn btn-ghost"
            aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500">Lesson Progress</p>
            <p className="text-xl font-display font-bold text-gray-900">{lesson.progress}% Complete</p>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm">~{Math.round(Number(lesson.duration.replace(' min', '')) * (100 - lesson.progress) / 100)} min left</span>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full transition-all duration-500"
            style={{ width: `${lesson.progress}%` }}
          />
        </div>
      </div>

      {/* Activities List */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-display font-bold text-gray-900">Activities</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {lesson.activities.map((activity, index) => (
            <div
              key={activity.id}
              className={`flex items-center justify-between p-5 hover:bg-gray-50 transition-colors ${
                index === currentActivity ? 'bg-blue-50/50' : ''
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  activity.completed ? 'bg-green-100' : index === currentActivity ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  {activity.completed ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : index === currentActivity ? (
                    <PlayCircle className="w-6 h-6 text-primary-500" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`font-medium text-gray-900 ${activity.completed ? '' : 'text-gray-700'}`}>{activity.title}</p>
                  <p className="text-sm text-gray-500 capitalize">{activity.type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activity.completed && (
                  <>
                    <span className="badge badge-success">{activity.score}%</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </>
                )}
                {!activity.completed && index === currentActivity && (
                  <Link
                    to={`/student/activity/${activity.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Start
                  </Link>
                )}
                {!activity.completed && index !== currentActivity && (
                  <span className="text-sm text-gray-400">Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lesson Info */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-2">About this Lesson</h3>
        <p className="text-gray-600">{lesson.description}</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/student/dashboard" className="btn btn-secondary">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
        {currentActivity < lesson.activities.length - 1 && (
          <Link
            to={`/student/activity/${lesson.activities[currentActivity + 1].id}`}
            className="btn btn-primary"
          >
            Next Activity
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </Link>
        )}
      </div>
    </div>
  );
}