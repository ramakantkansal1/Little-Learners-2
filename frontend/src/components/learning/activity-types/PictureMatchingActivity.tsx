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
 * Picture Matching Activity Component.
 * Used for: picture_matching, shape_matching, color_identification
 * 
 * Shows a target image/item and options to match with it.
 * The prompt typically says "Match the shape" or "Find the same color"
 */
export function PictureMatchingActivity(props: ActivityTypeComponentProps): React.ReactElement {
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
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Activity';

  // Get the target from question configuration
  const targetImage = question.configuration?.targetImage as string | undefined;
  const targetEmoji = question.configuration?.targetEmoji as string | undefined;
  const targetText = question.configuration?.targetText as string | undefined;
  const _matchType = question.configuration?.matchType as 'exact' | 'category' | 'color' | 'shape' | undefined || 'exact';
  // _matchType is reserved for future matching logic
  void _matchType;

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
          <div className="text-2xl font-semibold text-gray-700 mb-2">Find the match:</div>
          <div className="flex justify-center">
            {targetImage ? (
              <img 
                src={targetImage} 
                alt={targetText || 'Target'}
                className="w-32 h-32 object-contain rounded-xl bg-gray-50 p-4"
              />
            ) : targetEmoji ? (
              <span className="text-7xl">{targetEmoji}</span>
            ) : (
              <div className="w-32 h-32 rounded-xl bg-primary-100 flex items-center justify-center">
                <span className="text-4xl font-bold text-primary-600">{targetText || '?'}</span>
              </div>
            )}
          </div>
        </div>

        {renderQuestionPrompt({ 
          prompt: question.prompt,
          promptEmoji: undefined,
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
              renderOptionContent: () => (
                <div className="flex flex-col items-center gap-2">
                  {option.image_url ? (
                    <img 
                      src={option.image_url} 
                      alt={option.text}
                      className="w-24 h-24 object-contain rounded-lg bg-gray-50"
                    />
                  ) : option.text_audio_url ? (
                    <span className="text-5xl">🔊</span>
                  ) : (
                    <span className="text-5xl">{option.text}</span>
                  )}
                  <p className="font-medium text-gray-900 text-center">{option.text}</p>
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