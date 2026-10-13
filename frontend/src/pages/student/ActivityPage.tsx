import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Star, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback, useReducer } from 'react';
import { studentApi, type AnswerSubmitResponse } from '@services/api';

interface ActivityQuestion {
  id: number;
  question_type: string;
  prompt: string;
  prompt_audio_url: string | null;
  display_order: number;
  points: number;
  configuration: Record<string, unknown> | null;
  options: Array<{
    id: number;
    text: string;
    text_audio_url: string | null;
    image_url: string | null;
    display_order: number;
  }>;
}

interface ActivityData {
  id: number;
  type: string;
  code: string;
  title: string;
  instructions: string | null;
  estimated_duration_minutes: number | null;
  configuration: Record<string, unknown> | null;
  questions: ActivityQuestion[];
}

export default function ActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [correctOptionIds, setCorrectOptionIds] = useState<number[]>([]);

  // Parse search params from location.search directly to ensure reactivity
  const searchParams = new URLSearchParams(location.search);
  const attemptIdParam = searchParams.get('attempt');
  
  // Debug: log the search params
  console.log('ActivityPage render:', { locationSearch: location.search, attemptIdParam });
  
  // Debug: render counter
  const renderCount = useRef(0);
  renderCount.current++;
  console.log('ActivityPage render count:', renderCount.current);
  
  // Force re-render when location.search changes
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  useEffect(() => {
    forceUpdate();
  }, [location.search]);

  const loadActivityData = useCallback(async () => {
    console.log('loadActivityData called:', { activityId, attemptIdParam });
    if (!activityId) return;
    setLoading(true);
    setError(null);
    try {
      let attemptIdToUse = attemptIdParam ? parseInt(attemptIdParam, 10) : null;
      
      let activityResponse;
      if (attemptIdToUse) {
        // Use existing attempt - GET endpoint
        activityResponse = await studentApi.getActivityAttempt(attemptIdToUse);
      } else {
        // No attempt ID provided, create new one
        const response = await studentApi.startActivityAttempt(parseInt(activityId!, 10));
        attemptIdToUse = response.data.attempt_id;
        navigate(`/student/activity/${activityId}?attempt=${response.data.attempt_id}`, { replace: true });
        activityResponse = response;
      }
      
      setAttemptId(attemptIdToUse);
      
      const activityData = activityResponse.data.activity;
      
      setActivity({
        id: activityData.id,
        type: activityData.type,
        code: activityData.code,
        title: activityData.title,
        instructions: activityData.instructions,
        estimated_duration_minutes: activityData.estimated_duration_minutes,
        configuration: activityData.configuration,
        questions: activityData.questions.map(q => ({
          id: q.id,
          question_type: q.question_type,
          prompt: q.prompt,
          prompt_audio_url: q.prompt_audio_url,
          display_order: q.display_order,
          points: q.points,
          configuration: q.configuration,
          options: q.options.map(o => ({
            id: o.id,
            text: o.text,
            text_audio_url: o.text_audio_url,
            image_url: o.image_url,
            display_order: o.display_order,
          })),
        })),
      });
    } catch (err) {
      console.error('Failed to load activity:', err);
      setError('Failed to load activity. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activityId, attemptIdParam, navigate]);

  useEffect(() => {
    if (!activityId) return;
    loadActivityData();
  }, [activityId, attemptIdParam, loadActivityData]);

  const handleAnswer = async (answerId: number) => {
    if (showFeedback || submitting || !attemptId || !activity) return;
    
    setSubmitting(true);
    setSelectedAnswer(answerId);
    
    try {
      const question = activity.questions[currentQuestion];
      const response = await studentApi.submitAnswer(attemptId, question.id, [answerId]);
      const answerResult: AnswerSubmitResponse = response.data;
      
      setIsCorrect(answerResult.is_correct);
      if (answerResult.is_correct) setScore(prev => prev + 1);
      setCorrectOptionIds(answerResult.correct_options);
      setShowFeedback(true);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setShowFeedback(false);
      setSelectedAnswer(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!activity) return;
    if (currentQuestion < activity.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsCorrect(false);
      setCorrectOptionIds([]);
    } else {
      setCompleted(true);
    }
  };

  const handleRetry = async () => {
    if (!activity || !attemptId) return;
    setLoading(true);
    try {
      const response = await studentApi.startActivityAttempt(activity.id);
      setAttemptId(response.data.attempt_id);
      navigate(`/student/activity/${activity.id}?attempt=${response.data.attempt_id}`, { replace: true });
      
      const activityResponse = await studentApi.startActivityAttempt(activity.id);
      const activityData = activityResponse.data.activity;
      
      setActivity({
        id: activityData.id,
        type: activityData.type,
        code: activityData.code,
        title: activityData.title,
        instructions: activityData.instructions,
        estimated_duration_minutes: activityData.estimated_duration_minutes,
        configuration: activityData.configuration,
        questions: activityData.questions.map(q => ({
          id: q.id,
          question_type: q.question_type,
          prompt: q.prompt,
          prompt_audio_url: q.prompt_audio_url,
          display_order: q.display_order,
          points: q.points,
          configuration: q.configuration,
          options: q.options.map(o => ({
            id: o.id,
            text: o.text,
            text_audio_url: o.text_audio_url,
            image_url: o.image_url,
            display_order: o.display_order,
          })),
        })),
      });
      
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsCorrect(false);
      setCorrectOptionIds([]);
      setScore(0);
      setCompleted(false);
    } catch (err) {
      console.error('Failed to retry activity:', err);
      alert('Failed to restart activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <p className="text-gray-600">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 mb-2">Unable to load activity</h2>
          <p className="text-gray-600 mb-6">{error || 'Activity not found'}</p>
          <Link to="/student/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (completed) {
    const percentage = activity.questions.length > 0 ? Math.round((score / activity.questions.length) * 100) : 0;
    const earnedStar = percentage >= 80;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/student/learn/${activity.id}`} className="btn btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-gray-900">Great Job!</h1>
            <p className="text-gray-600">You completed the activity!</p>
          </div>
        </div>

        <div className="card p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6">
            <Star className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">
            {percentage}% Score
          </h2>
          <p className="text-gray-600 mb-6">
            You got {score} out of {activity.questions.length} correct!
          </p>

          {earnedStar && (
            <div className="p-4 bg-yellow-50 rounded-xl mb-6 border border-yellow-200">
              <div className="flex items-center justify-center gap-2 text-yellow-700">
                <Star className="w-6 h-6" />
                <span className="font-semibold">You earned a star!</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/student/learn/${activity.id}`} className="btn btn-secondary">
              <ArrowLeft className="w-5 h-5" />
              Back to Lesson
            </Link>
            <button onClick={handleRetry} className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = activity.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / activity.questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/student/learn/${activity.id}`} className="btn btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-primary">{activity.questions[0]?.question_type.replace('_', ' ') || 'Activity'}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{activity.title}</h1>
        </div>
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="btn btn-ghost"
          aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">Question {currentQuestion + 1} of {activity.questions.length}</p>
          <p className="text-sm font-semibold text-gray-900">Score: {score}</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{question.prompt || ''}</div>
          <p className="text-xl font-semibold text-gray-900">{question.prompt || ''}</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {question.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleAnswer(option.id)}
              disabled={showFeedback || submitting}
              className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                showFeedback
                  ? correctOptionIds.includes(option.id)
                    ? 'border-green-500 bg-green-50'
                    : selectedAnswer === option.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{option.image_url || option.text}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{option.text}</p>
                </div>
                {showFeedback && (
                  <div className="flex items-center gap-2">
                    {correctOptionIds.includes(option.id) && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {selectedAnswer === option.id && !correctOptionIds.includes(option.id) && (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {showFeedback && (
          <div className="mt-6 p-4 rounded-xl bg-gray-50">
            <p className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '🎉 Correct! Well done!' : '😊 Good try! The correct answer is highlighted.'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => currentQuestion > 0 && (setCurrentQuestion(prev => prev - 1), setSelectedAnswer(null), setShowFeedback(false), setCorrectOptionIds([]))}
          disabled={currentQuestion === 0 || showFeedback || submitting}
          className="btn btn-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
          Previous
        </button>

        {showFeedback && !completed && (
          <button
            onClick={handleNext}
            className="btn btn-primary"
            disabled={currentQuestion === (activity.questions.length - 1) || submitting}
          >
            {currentQuestion === activity.questions.length - 1 ? 'Finish' : 'Next'}
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}