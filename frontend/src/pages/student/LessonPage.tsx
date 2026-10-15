import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, PlayCircle, Clock, Volume2, VolumeX, ChevronRight, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStudent } from '@context/StudentContext';
import { studentApi } from '@services/api';

interface LessonContent {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  estimated_duration_minutes: number | null;
  activities: ActivityContent[];
}

interface ActivityContent {
  id: number;
  type: string;
  code: string;
  title: string;
  instructions: string | null;
  estimated_duration_minutes: number | null;
  configuration: Record<string, unknown> | null;
  questions: QuestionContent[];
}

interface QuestionContent {
  id: number;
  question_type: string;
  prompt: string;
  prompt_audio_url: string | null;
  display_order: number;
  points: number;
  configuration: Record<string, unknown> | null;
  options: OptionContent[];
}

interface OptionContent {
  id: number;
  text: string;
  text_audio_url: string | null;
  image_url: string | null;
  display_order: number;
}

const activityTypeConfigs: Record<string, { icon: string; label: string; color: string }> = {
  image_selection: { icon: '🖼️', label: 'Image Selection', color: 'bg-blue-100 text-blue-700' },
  picture_matching: { icon: '🔗', label: 'Picture Matching', color: 'bg-purple-100 text-purple-700' },
  simple_quiz: { icon: '❓', label: 'Quiz', color: 'bg-green-100 text-green-700' },
  counting: { icon: '🔢', label: 'Counting', color: 'bg-blue-100 text-blue-700' },
  number_recognition: { icon: '🔢', label: 'Number Recognition', color: 'bg-blue-100 text-blue-700' },
  letter_recognition: { icon: '🔤', label: 'Letter Recognition', color: 'bg-purple-100 text-purple-700' },
  letter_sounds: { icon: '🔊', label: 'Letter Sounds', color: 'bg-purple-100 text-purple-700' },
  story_listening: { icon: '📖', label: 'Story Listening', color: 'bg-pink-100 text-pink-700' },
  sorting: { icon: '📦', label: 'Sorting', color: 'bg-green-100 text-green-700' },
  pattern_completion: { icon: '🔄', label: 'Pattern Completion', color: 'bg-purple-100 text-purple-700' },
  tracing: { icon: '✏️', label: 'Tracing', color: 'bg-blue-100 text-blue-700' },
  color_identification: { icon: '🎨', label: 'Color Identification', color: 'bg-yellow-100 text-yellow-700' },
  shape_matching: { icon: '🔷', label: 'Shape Matching', color: 'bg-purple-100 text-purple-700' },
};

function getActivityConfig(type: string) {
  return activityTypeConfigs[type] || { icon: '📝', label: type.replace('_', ' '), color: 'bg-gray-100 text-gray-700' };
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '~10 min';
  return `${minutes} min`;
}

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { profile, toggleAudio, toggleReducedMotion, toggleHighContrast, changeLanguage } = useStudent();
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentActivityIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    const loadLesson = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await studentApi.getLessonContent(parseInt(lessonId, 10));
        setLesson(response.data);
      } catch (err) {
        console.error('Failed to load lesson:', err);
        setError('Failed to load lesson. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadLesson();
  }, [lessonId]);

  const handleStartActivity = async (activityId: number) => {
    try {
      const response = await studentApi.startActivityAttempt(activityId);
      const attemptId = response.data.attempt_id;
      navigate(`/student/activity/${activityId}?attempt=${attemptId}`);
    } catch (err) {
      console.error('Failed to start activity:', err);
      alert('Failed to start activity. Please try again.');
    }
  };

  const handleToggleAudio = async () => {
    await toggleAudio(!audioEnabled);
    setAudioEnabled(!audioEnabled);
  };

  const handleToggleReducedMotion = async () => {
    await toggleReducedMotion(!profile?.reduced_motion);
  };

  const handleToggleHighContrast = async () => {
    await toggleHighContrast(!profile?.high_contrast);
  };

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
    setShowSettings(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <svg className="w-8 h-8 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 mb-2">Unable to load lesson</h2>
          <p className="text-gray-600 mb-6">{error || 'Lesson not found'}</p>
          <Link to="/student/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentActivity = lesson.activities[currentActivityIndex];
  const progress = lesson.activities.length > 0 ? Math.round(((currentActivityIndex) / lesson.activities.length) * 100) : 0;

  const activityConfig = currentActivity ? getActivityConfig(currentActivity.type) : { icon: '📝', label: 'Activity', color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/student/dashboard" className="btn btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-primary">{lesson.activities[0] ? getActivityConfig(lesson.activities[0].type).label : 'Lesson'}</span>
            <span className="text-sm text-gray-500">{formatDuration(lesson.estimated_duration_minutes)}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{lesson.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAudio}
            className="btn btn-ghost"
            aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn btn-ghost"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500">Lesson Progress</p>
            <p className="text-xl font-display font-bold text-gray-900">{progress}% Complete</p>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              ~{Math.max(1, Math.round(Number(lesson.estimated_duration_minutes || 15) * (100 - progress) / 100))} min left
            </span>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Activities List */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-display font-bold text-gray-900">Activities</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {lesson.activities.map((activity, index) => {
            const config = getActivityConfig(activity.type);
            const isCurrent = index === currentActivityIndex;
            const isCompleted = false;

            return (
              <div
                key={activity.id}
                className={`flex items-center justify-between p-5 hover:bg-gray-50 transition-colors ${isCurrent ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-100' : index === currentActivityIndex ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : index === currentActivityIndex ? (
                      <span className="text-2xl">{activityConfig.icon}</span>
                    ) : (
                      <span className="text-2xl">{config.icon}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-medium text-gray-900 ${isCompleted ? '' : 'text-gray-700'}`}>{activity.title}</p>
                    <p className="text-sm text-gray-500">{config.label} • {formatDuration(activity.estimated_duration_minutes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${activityConfig.color}`}>
                    {config.label}
                  </span>
                  {isCompleted && (
                    <>
                      <span className="badge badge-success">Completed</span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </>
                  )}
                  {!isCompleted && isCurrent && (
                    <button
                      onClick={() => handleStartActivity(activity.id)}
                      className="btn btn-primary btn-sm"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start
                    </button>
                  )}
                  {!isCompleted && index !== currentActivityIndex && (
                    <span className="text-sm text-gray-400">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lesson Info */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-2">About this Lesson</h3>
        <p className="text-gray-600">{lesson.description || 'Learn and have fun!'}</p>
        {lesson.instructions && (
          <p className="text-gray-600 mt-2"><strong>Instructions:</strong> {lesson.instructions}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/student/dashboard" className="btn btn-secondary">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
        {currentActivityIndex < lesson.activities.length - 1 && (
          <button
            onClick={() => handleStartActivity(lesson.activities[currentActivityIndex + 1].id)}
            className="btn btn-primary"
          >
            Next Activity
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSettings(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-full bg-white shadow-xl z-50 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-gray-900">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Language */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">🌐</span>
                  Language
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {['en', 'hi'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        profile?.preferred_language === lang
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {lang === 'en' ? 'English' : 'हिंदी'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">🔊</span>
                  Audio
                </h3>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Narration & Sound Effects</span>
                  <button
                    onClick={handleToggleAudio}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      audioEnabled ? 'bg-primary-500' : 'bg-gray-300'
                    }`}
                    aria-label={audioEnabled ? 'Disable audio' : 'Enable audio'}
                  >
                    <span className={`absolute top-1 transition-transform ${
                      audioEnabled ? 'translate-x-6' : 'translate-x-1'
                    } w-5 h-5 rounded-full bg-white shadow-md`} />
                  </button>
                </label>
              </div>

              {/* Reduced Motion */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">🏃</span>
                  Reduced Motion
                </h3>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Minimize animations</span>
                  <button
                    onClick={handleToggleReducedMotion}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      profile?.reduced_motion ? 'bg-primary-500' : 'bg-gray-300'
                    }`}
                    aria-label={profile?.reduced_motion ? 'Disable reduced motion' : 'Enable reduced motion'}
                  >
                    <span className={`absolute top-1 transition-transform ${
                      profile?.reduced_motion ? 'translate-x-6' : 'translate-x-1'
                    } w-5 h-5 rounded-full bg-white shadow-md`} />
                  </button>
                </label>
              </div>

              {/* High Contrast */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">🌓</span>
                  High Contrast
                </h3>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Increase color contrast</span>
                  <button
                    onClick={handleToggleHighContrast}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      profile?.high_contrast ? 'bg-primary-500' : 'bg-gray-300'
                    }`}
                    aria-label={profile?.high_contrast ? 'Disable high contrast' : 'Enable high contrast'}
                  >
                    <span className={`absolute top-1 transition-transform ${
                      profile?.high_contrast ? 'translate-x-6' : 'translate-x-1'
                    } w-5 h-5 rounded-full bg-white shadow-md`} />
                  </button>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}