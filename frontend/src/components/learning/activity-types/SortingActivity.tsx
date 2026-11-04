import { ActivityTypeComponentProps } from "../ActivityRenderer";
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
} from "./BaseActivityComponents";

/**
 * Sorting Activity Component.
 * Used for: sorting
 *
 * Shows items that need to be sorted into categories.
 * This is a drag-and-drop style activity, but for simplicity we use click-to-select.
 */
export function SortingActivity(
  props: ActivityTypeComponentProps,
): React.ReactElement {
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
  if (error || !activity)
    return renderError({ error: error || "Activity not found", onRetry });

  if (completed) {
    const percentage =
      props.finalScore ??
      (activity.questions.length > 0
        ? Math.round((score / activity.questions.length) * 100)
        : 0);
    const earnedStar = props.rewardsEnabled !== false;
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
  const questionTypeLabel =
    activity.questions[0]?.question_type.replace("_", " ") || "Sorting";

  // Get categories from configuration
  const itemsToSort = question.configuration?.items as
    Array<{ name: string; emoji?: string; category: string }> | undefined;

  // For this implementation, we show the categories and the item to sort
  // The options are the categories
  const targetItem =
    itemsToSort?.[currentQuestion % (itemsToSort?.length || 1)];

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
          <div className="text-2xl font-semibold text-gray-700 mb-4">
            Sort the item into the right group:
          </div>

          {targetItem && (
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-gray-200 shadow-sm">
                {targetItem.emoji ? (
                  <span className="text-7xl">{targetItem.emoji}</span>
                ) : (
                  <span className="text-4xl font-bold text-gray-700">
                    {targetItem.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {renderQuestionPrompt({
          prompt: question.prompt,
        })}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {question.options.map((option) =>
            renderOptionButton({
              option,
              isSelected: selectedAnswer === option.id,
              isCorrect: correctOptionIds.includes(option.id),
              showFeedback,
              correctOptionIds,
              onClick: () => onAnswer(option.id),
              disabled: showFeedback || submitting,
              renderOptionContent: () => (
                <span className="text-xl">{option.text}</span>
              ),
            }),
          )}
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
