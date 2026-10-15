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
 * Picture Comprehension Activity Component.
 * Used for: picture_comprehension
 * 
 * Shows an image and asks questions about it.
 * Similar to simple_quiz but with a reference image.
 */
export function PictureComprehensionActivity(props: ActivityTypeComponentProps): React.ReactElement {
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
    });
  }

  const question = activity.questions[currentQuestion];
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Picture Comprehension';

  // Get reference image from configuration
  const referenceImage = question.configuration?.referenceImage as string | undefined;
  const referenceImageAlt = question.configuration?.referenceImageAlt as string | undefined;

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
        {/* Reference image */}
        {referenceImage && (
          <div className="mb-6">
            <div className="text-center mb-2">
              <p className="text-sm text-gray-500">Look at the picture:</p>
            </div>
            <div className="flex justify-center">
              <img
                src={referenceImage}
                alt={referenceImageAlt || 'Reference image'}
                className="max-w-full h-48 object-contain rounded-xl border border-gray-200 bg-gray-50"
              />
            </div>
          </div>
        )}

        {renderQuestionPrompt({ 
          prompt: question.prompt,
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
                  ) : (
                    <span className="text-3xl">{option.text}</span>
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