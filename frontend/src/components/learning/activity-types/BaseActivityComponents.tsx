import { ActivityTypeComponentProps } from '../ActivityRenderer';

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
          disabled={currentQuestion === totalQuestions - 1 || submitting}
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
}: {
  activity: BaseActivityComponentProps['activity'];
  score: number;
  percentage: number;
  earnedStar: boolean;
  onBack: () => void;
  onRetry: () => void;
  loading: boolean;
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