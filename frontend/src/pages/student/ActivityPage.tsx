import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { studentApi, type AnswerSubmitResponse } from '@services/api';
import { activityTypeRegistry, type ActivityTypeComponentProps } from '@/components/learning/ActivityRenderer';
import type { ActivityType } from '@/types';

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
    configuration?: Record<string, unknown>;
  }>;
}

interface ActivityData {
  id: number;
  type: ActivityType;
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
  
  // Debug: render counter
  const renderCount = useRef(0);
  renderCount.current++;

  const loadActivityData = useCallback(async () => {
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
        type: activityData.type as ActivityType,
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

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsCorrect(false);
      setCorrectOptionIds([]);
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
        type: activityData.type as ActivityType,
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

  // Get the activity type component from registry
  const ActivityComponent = activityTypeRegistry.getComponent(activity.type);
  
  // Prepare props for the activity type component
  const activityProps: ActivityTypeComponentProps = {
    activity,
    currentQuestion,
    totalQuestions: activity.questions.length,
    selectedAnswer,
    showFeedback,
    isCorrect,
    correctOptionIds,
    score,
    completed,
    onAnswer: handleAnswer,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onRetry: handleRetry,
    onToggleAudio: () => setAudioEnabled(prev => !prev),
    audioEnabled,
    attemptId,
    loading,
    submitting,
    error,
  };

  // Render the activity type component
  return <ActivityComponent {...activityProps} />;
}