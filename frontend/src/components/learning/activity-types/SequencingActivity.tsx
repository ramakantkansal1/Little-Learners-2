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
 * Sequencing Activity Component.
 * Used for: sequencing
 * 
 * Shows a sequence with missing items and asks to complete it.
 * Options are the possible next items.
 */
export function SequencingActivity(props: ActivityTypeComponentProps): React.ReactElement {
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
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Sequencing';

  // Get sequence from configuration
  const sequence = question.configuration?.sequence as Array<{ value: string; emoji?: string; isMissing?: boolean }> | undefined;
  const _patternType = question.configuration?.patternType as 'numbers' | 'letters' | 'shapes' | 'colors' | 'custom' | undefined;
  // _patternType is reserved for future pattern validation logic
  void _patternType;

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
          <div className="text-2xl font-semibold text-gray-700 mb-4">Complete the pattern:</div>
          
          {sequence && sequence.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              {sequence.map((item, idx) => (
                <div
                  key={idx}
                  className={`w-16 h-16 rounded-xl flex items-center justify-center border-2 transition-all ${
                    item.isMissing
                      ? 'border-dashed border-gray-400 bg-gray-50 animate-pulse'
                      : 'border-solid border-gray-200 bg-white shadow-sm'
                  }`}
                >
                  {item.emoji ? (
                    <span className="text-4xl">{item.emoji}</span>
                  ) : (
                    <span className="text-3xl font-bold text-gray-700">{item.value}</span>
                  )}
                  {item.isMissing && <span className="absolute -top-2 -right-2 text-red-500">?</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {renderQuestionPrompt({ 
          prompt: question.prompt,
        })}

        <div className="grid grid-cols-3 gap-3">
          {question.options.map((option) => (
            renderOptionButton({
              option,
              isSelected: selectedAnswer === option.id,
              isCorrect: correctOptionIds.includes(option.id),
              showFeedback,
              correctOptionIds,
              onClick: () => onAnswer(option.id),
              disabled: showFeedback || submitting,
              renderOptionContent: (): React.ReactNode => (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl bg-yellow-100 flex items-center justify-center text-3xl font-bold text-yellow-700 border-2 border-yellow-200">
                    {(option.configuration?.emoji as string) || option.text}
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