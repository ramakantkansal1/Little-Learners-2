import { ActivityTypeComponentProps } from '../ActivityRenderer';
import {
  renderActivityHeader,
  renderProgress,
  renderQuestionPrompt,
  renderOptionButton,
  renderFeedback,
  renderNavigation,
  renderCompletionScreen,
  renderLoading,
  renderError,
} from './BaseActivityComponents';

/**
 * Simple Quiz Activity Component.
 * Used for: simple_quiz, picture_comprehension
 * 
 * Standard multiple choice quiz with text-based options.
 * The prompt is a question, options are text answers.
 */
export function SimpleQuizActivity(props: ActivityTypeComponentProps): React.ReactElement {
  const {
    activity,
    currentQuestion,
    totalQuestions,
    selectedAnswer,
    showFeedback,
    isCorrect,
    correctOptionIds,
    score,
    completed,
    onAnswer,
    onNext,
    onPrevious,
    onRetry,
    onToggleAudio,
    audioEnabled,
    attemptId: _attemptId,
    loading,
      recommendation,
      recommendationLoading,
      recommendationError,
      startingRecommended,
      onStartRecommended,
    submitting,
    error,
  } = props;

  if (loading) return renderLoading();
  if (error || !activity) return renderError({ error: error || 'Activity not found', onRetry });

  if (completed) {
    const percentage = activity.questions.length > 0 ? Math.round((score / activity.questions.length) * 100) : 0;
    const earnedStar = percentage >= 80;
    return renderCompletionScreen({
      activity,
      score,
      percentage,
      earnedStar,
      onBack: () => window.history.back(),
      onRetry,
      loading,
      // Recommendation props
      recommendation,
      recommendationLoading,
      recommendationError,
      startingRecommended,
      onStartRecommended,
    });
  }

  const question = activity.questions[currentQuestion];
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Quiz';

  return (
    <div className="space-y-6">
      {renderActivityHeader({
        activity,
        onBack: () => window.history.back(),
        onToggleAudio,
        audioEnabled,
        questionTypeLabel,
      })}

      {renderProgress({ currentQuestion, totalQuestions, score })}

      <div className="card p-6">
        {renderQuestionPrompt({ 
          prompt: question.prompt,
          promptEmoji: question.configuration?.promptEmoji as string,
        })}

        <div className="grid grid-cols-1 gap-3">
          {question.options.map((option) => (
            renderOptionButton({
              option,
              isSelected: selectedAnswer === option.id,
              isCorrect: correctOptionIds.includes(option.id),
              showFeedback,
              correctOptionIds,
              onClick: () => onAnswer(option.id),
              disabled: showFeedback || submitting,
              renderOptionContent: () => (
                <div className="flex items-center gap-4">
                  {option.image_url ? (
                    <img 
                      src={option.image_url} 
                      alt={option.text}
                      className="w-12 h-12 object-contain rounded-lg bg-gray-50"
                    />
                  ) : option.text_audio_url ? (
                    <span className="text-3xl">🔊</span>
                  ) : (
                    <span className="text-3xl">📝</span>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{option.text}</p>
                  </div>
                </div>
              ),
            })
          ))}
        </div>

        {showFeedback && renderFeedback({ isCorrect })}
      </div>

      {renderNavigation({
        currentQuestion,
        totalQuestions,
        showFeedback,
        completed,
        onPrevious,
        onNext,
        submitting,
      })}
    </div>
  );
}