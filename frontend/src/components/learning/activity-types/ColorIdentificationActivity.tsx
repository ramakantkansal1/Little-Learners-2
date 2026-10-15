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
 * Color Identification Activity Component.
 * Used for: color_identification
 * 
 * Shows a color swatch and asks to identify it by name.
 * Options are color names with color swatches.
 */
export function ColorIdentificationActivity(props: ActivityTypeComponentProps): React.ReactElement {
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
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Color Identification';

  // Get target color from configuration
  const targetColor = question.configuration?.targetColor as string | undefined;
  const targetColorName = question.configuration?.targetColorName as string | undefined;

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
        <div className="text-center mb-6">
          <div className="text-2xl font-semibold text-gray-700 mb-4">What color is this?</div>
          {targetColor && (
            <div className="w-32 h-32 rounded-xl mx-auto border-2 border-gray-200 shadow-sm"
                 style={{ backgroundColor: targetColor }}>
            </div>
          )}
          {targetColorName && (
            <p className="sr-only">The color is {targetColorName}</p>
          )}
        </div>

        {renderQuestionPrompt({ 
          prompt: question.prompt,
        })}

        <div className="grid grid-cols-2 gap-4">
          {question.options.map((option) => (
            renderOptionButton({
              option,
              isSelected: selectedAnswer === option.id,
              isCorrect: correctOptionIds.includes(option.id),
              showFeedback,
              correctOptionIds,
              onClick: () => onAnswer(option.id),
              disabled: showFeedback || submitting,
              renderOptionContent: () => {
                // Extract color from option text or configuration
                const optionColor = option.configuration?.color as string | undefined;
                return (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-xl border-2 border-gray-200 flex items-center justify-center"
                         style={{ backgroundColor: optionColor || '#f0f0f0' }}>
                      {optionColor ? null : <span className="text-4xl">{option.text}</span>}
                    </div>
                    <p className="font-medium text-gray-900 text-center text-lg">{option.text}</p>
                  </div>
                );
              },
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