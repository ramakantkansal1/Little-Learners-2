import { ActivityTypeComponentProps } from "../ActivityRenderer";
import {
  renderActivityHeader,
  renderProgress,
  renderQuestionPrompt,
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
      activity.questions.length > 0
        ? Math.round((score / activity.questions.length) * 100)
        : 0;
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
  const questionTypeLabel =
    activity.questions[0]?.question_type.replace("_", " ") || "Sorting";

  // Get categories from configuration
  const categories = question.configuration?.categories as
    Array<{ name: string; emoji?: string; color?: string }> | undefined;
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

        {categories && categories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {categories.map((category, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  selectedAnswer === idx
                    ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500"
                    : showFeedback && correctOptionIds.includes(idx)
                      ? "border-green-500 bg-green-50"
                      : selectedAnswer === idx &&
                          showFeedback &&
                          !correctOptionIds.includes(idx)
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 hover:border-primary-300 hover:bg-primary-50"
                }`}
                onClick={() => !showFeedback && !submitting && onAnswer(idx)}
              >
                <div className="flex flex-col items-center gap-2">
                  {category.emoji && (
                    <span className="text-4xl">{category.emoji}</span>
                  )}
                  <div
                    className="w-12 h-12 rounded-lg mx-auto"
                    style={{ backgroundColor: category.color || "#f0f0f0" }}
                  />
                  <p className="font-medium text-gray-900">{category.name}</p>
                </div>
                {showFeedback && correctOptionIds.includes(idx) && (
                  <svg
                    className="w-6 h-6 text-green-500 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}

        {renderQuestionPrompt({
          prompt: question.prompt,
        })}

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
