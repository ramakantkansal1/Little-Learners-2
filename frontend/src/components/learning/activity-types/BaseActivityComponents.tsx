import { ActivityTypeComponentProps } from '../ActivityRenderer';
import { NextActivityRecommendation } from '../ActivityTypeRegistry.types';

/**
 * Base component props for all activity type components.
 * Extends the common props with type-specific data.
 */
export interface BaseActivityComponentProps extends ActivityTypeComponentProps {
  /** The current question being displayed */
  question: ActivityTypeComponentProps['activity']['questions'][0];
  /** All questions in the activity */
  questions: ActivityTypeComponentProps['activity']['questions'];
}

/**
 * Render an option button with consistent styling.
 */
export function renderOptionButton({
  option,
  isSelected,
  isCorrect: _isCorrect,
  showFeedback,
  correctOptionIds,
  onClick,
  disabled,
  renderOptionContent,
}: {
  option: BaseActivityComponentProps['question']['options'][0];
  isSelected: boolean;
  isCorrect: boolean;
  showFeedback: boolean;
  correctOptionIds: number[];
  onClick: () => void;
  disabled: boolean;
  renderOptionContent: () => React.ReactNode;
}): React.ReactElement {
  const isCorrectOption = correctOptionIds.includes(option.id);
  const isWrongSelection = showFeedback && isSelected && !isCorrectOption;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative p-5 rounded-xl border-2 text-left transition-all ${
        showFeedback
          ? isCorrectOption
            ? 'border-green-500 bg-green-50'
            : isWrongSelection
            ? 'border-red-500 bg-red-50'
            : 'border-gray-200 bg-gray-50'
          : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
      }`}
      key={option.id}
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl">{renderOptionContent()}</span>
        <div className="flex-1">
          <p className="font-medium text-gray-900">{option.text}</p>
        </div>
        {showFeedback && (
          <div className="flex items-center gap-2">
            {isCorrectOption && (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isWrongSelection && (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Render the feedback message.
 */
export function renderFeedback({ isCorrect }: { isCorrect: boolean }): React.ReactElement {
  return (
    <div className="mt-6 p-4 rounded-xl bg-gray-50">
      <p className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
        {isCorrect ? '🎉 Correct! Well done!' : '😊 Good try! The correct answer is highlighted.'}
      </p>
    </div>
  );
}

/**
 * Render the question prompt with optional emoji/image.
 */
export function renderQuestionPrompt({ 
  prompt, 
  promptEmoji 
}: { 
  prompt: string; 
  promptEmoji?: string;
}): React.ReactElement {
  return (
    <div className="text-center mb-6">
      {promptEmoji && <div className="text-6xl mb-4">{promptEmoji}</div>}
      <p className="text-xl font-semibold text-gray-900">{prompt}</p>
    </div>
  );
}

/**
 * Render the progress bar.
 */
export function renderProgress({
  currentQuestion,
  totalQuestions,
  score,
}: {
  currentQuestion: number;
  totalQuestions: number;
  score: number;
}): React.ReactElement {
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">Question {currentQuestion + 1} of {totalQuestions}</p>
        <p className="text-sm font-semibold text-gray-900">Score: {score}</p>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Render the activity header with title and audio toggle.
 */
export function renderActivityHeader({
  activity,
  onBack,
  onToggleAudio,
  audioEnabled,
  questionTypeLabel,
}: {
  activity: BaseActivityComponentProps['activity'];
  onBack: () => void;
  onToggleAudio: () => void;
  audioEnabled: boolean;
  questionTypeLabel: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-4">
      <button onClick={onBack} className="btn btn-ghost">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="badge badge-primary">{questionTypeLabel}</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900">{activity.title}</h1>
      </div>
      <button
        onClick={onToggleAudio}
        className="btn btn-ghost"
        aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
      >
        {audioEnabled ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
      </button>
    </div>
  );
}

/**
 * Render navigation buttons (Previous / Next / Finish).
 */
export function renderNavigation({
  currentQuestion,
  totalQuestions,
  showFeedback,
  completed,
  onPrevious,
  onNext,
  submitting,
}: {
  currentQuestion: number;
  totalQuestions: number;
  showFeedback: boolean;
  completed: boolean;
  onPrevious: () => void;
  onNext: () => void;
  submitting: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrevious}
        disabled={currentQuestion === 0 || showFeedback || submitting}
        className="btn btn-secondary"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Previous
      </button>

      {showFeedback && !completed && (
        <button
          onClick={onNext}
          className="btn btn-primary"
          disabled={submitting}
        >
          {currentQuestion === totalQuestions - 1 ? 'Finish' : 'Next'}
          <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Render the completion screen.
 */
export function renderCompletionScreen({
  activity,
  score,
  percentage,
  earnedStar,
  onBack,
  onRetry,
  loading,
  // Recommendation props
  recommendation,
  recommendationLoading,
  recommendationError,
  startingRecommended,
  onStartRecommended,
}: {
  activity: BaseActivityComponentProps['activity'];
  score: number;
  percentage: number;
  earnedStar: boolean;
  onBack: () => void;
  onRetry: () => void;
  loading: boolean;
  recommendation?: NextActivityRecommendation | null;
  recommendationLoading?: boolean;
  recommendationError?: string | null;
  startingRecommended?: boolean;
  onStartRecommended?: () => void;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn btn-ghost">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-900">Great Job!</h1>
          <p className="text-gray-600">You completed the activity!</p>
        </div>
      </div>

      <div className="card p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
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
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="font-semibold">You earned a star!</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onBack} className="btn btn-secondary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Lesson
          </button>
          <button onClick={onRetry} className="btn btn-primary" disabled={loading}>
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Try Again'
            )}
          </button>
        </div>
      </div>

      {/* Next Activity Recommendation */}
      {renderRecommendationCard({
        recommendation,
        recommendationLoading,
        recommendationError,
        startingRecommended,
        onStartRecommended,
      })}
    </div>
  );
}

/**
 * Render loading state.
 */
export function renderLoading(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
          <svg className="w-8 h-8 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-gray-600">Loading activity...</p>
      </div>
    </div>
  );
}

/**
 * Render error state.
 */
export function renderError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-2">Unable to load activity</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={onRetry} className="btn btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}

/**
 * Render the recommendation reason as a human-readable label.
 */
function getRecommendationReasonLabel(reason: string): string {
  switch (reason) {
    case 'cold_start_sequence':
      return 'Starting your learning journey';
    case 'review_overdue':
      return 'Time to review what you learned';
    case 'remediate_repeat':
      return "Let's practice this a bit more";
    case 'maintain_practice':
      return 'Keep up the great work';
    case 'advance_next':
      return 'Ready for the next challenge';
    case 'curriculum_sequence':
      return 'Next in your curriculum';
    case 'no_more_activities':
      return 'No more activities available';
    case 'no_stage_assigned':
      return 'Please set your learning stage';
    case 'no_activities_in_stage':
      return 'No activities in this stage yet';
    default:
      return 'Recommended for you';
  }
}

/**
 * Render the mastery tier as a human-readable label.
 */
function getTierLabel(tier: string | null): string {
  switch (tier) {
    case 'cold_start':
      return 'Getting Started';
    case 'remediate':
      return 'Practice More';
    case 'maintain':
      return 'Maintain Skills';
    case 'advance':
      return 'Advancing';
    default:
      return 'Learning';
  }
}

/**
 * Render the confidence as a human-readable label.
 */
function getConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Good match';
    case 'low':
      return 'Suggested';
    default:
      return '';
  }
}

/**
 * Render the recommendation card for the completion screen.
 */
export function renderRecommendationCard({
  recommendation,
  recommendationLoading,
  recommendationError,
  startingRecommended,
  onStartRecommended,
}: {
  recommendation: NextActivityRecommendation | null | undefined;
  recommendationLoading?: boolean;
  recommendationError?: string | null;
  startingRecommended?: boolean;
  onStartRecommended?: () => void;
}): React.ReactElement | null {
  // If there's an error fetching recommendation, show a subtle message but don't block
  if (recommendationError && !recommendation) {
    return (
      <div className="card p-4 border-yellow-200 bg-yellow-50">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-yellow-800">{recommendationError}</p>
        </div>
      </div>
    );
  }

  // If no recommendation or no activity_id, show "no more activities" message
  if (!recommendation || !recommendation.activity_id) {
    return (
      <div className="card p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">You've finished the available activities for now</h3>
        <p className="text-gray-600 mb-4">Great job completing this activity! Check back later for more content.</p>
        <button onClick={() => window.history.back()} className="btn btn-secondary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lesson
        </button>
      </div>
    );
  }

  // If loading recommendation, show skeleton
  if (recommendationLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  const rec = recommendation!;
  const activity = rec.activity;

  // Show error banner if there's a start attempt error
  const errorBanner = recommendationError ? (
    <div className="card p-4 border-red-200 bg-red-50 mb-4">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm text-red-800">{recommendationError}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className="card p-6 border-primary-200 bg-gradient-to-br from-primary-50 to-pastel-blue">
      {errorBanner}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Next Recommended Activity</h3>
          <p className="text-sm text-gray-600">{getRecommendationReasonLabel(rec.reason)}</p>
        </div>
        <span className="badge badge-primary badge-sm">{getTierLabel(rec.tier)}</span>
      </div>

      {activity && (
        <div className="card p-4 bg-white/50 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              {activity.type === 'picture_matching' && <span className="text-2xl">🖼️</span>}
              {activity.type === 'simple_quiz' && <span className="text-2xl">❓</span>}
              {activity.type === 'color_identification' && <span className="text-2xl">🎨</span>}
              {activity.type === 'shape_matching' && <span className="text-2xl">🔷</span>}
              {activity.type === 'alphabet_recognition' && <span className="text-2xl">🔤</span>}
              {activity.type === 'number_recognition' && <span className="text-2xl">🔢</span>}
              {activity.type === 'counting' && <span className="text-2xl">🐘</span>}
              {activity.type === 'sorting' && <span className="text-2xl">📦</span>}
              {activity.type === 'sequencing' && <span className="text-2xl">🔢</span>}
              {activity.type === 'tracing' && <span className="text-2xl">✏️</span>}
              {activity.type === 'letter_sound' && <span className="text-2xl">🔊</span>}
              {activity.type === 'story_listening' && <span className="text-2xl">📖</span>}
              {activity.type === 'audio_identification' && <span className="text-2xl">🔊</span>}
              {activity.type === 'picture_comprehension' && <span className="text-2xl">🖼️</span>}
              {activity.type === 'image_selection' && <span className="text-2xl">🖼️</span>}
              {!['picture_matching','simple_quiz','color_identification','shape_matching','alphabet_recognition','number_recognition','counting','sorting','sequencing','tracing','letter_sound','story_listening','audio_identification','picture_comprehension','image_selection'].includes(activity.type) && (
                <span className="text-2xl">📚</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{activity.title || activity.code}</h4>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                {activity.estimated_duration_minutes && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {activity.estimated_duration_minutes} min
                  </span>
                )}
                <span className="capitalize">{activity.type.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <span className="text-sm text-gray-500">{getConfidenceLabel(rec.confidence)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onStartRecommended}
          disabled={startingRecommended || !activity}
          className="btn btn-primary flex-1"
        >
          {startingRecommended ? (
            <>
              <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Starting...
            </>
          ) : (
            'Start This Activity'
          )}
        </button>
        <button onClick={() => window.history.back()} className="btn btn-secondary flex-1">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lesson
        </button>
      </div>
    </div>
  );
}
