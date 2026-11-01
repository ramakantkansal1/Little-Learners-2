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
 * Counting Activity Component.
 * Used for: counting
 *
 * Shows a set of objects and asks to count them.
 * Options are numbers.
 */
export function CountingActivity(
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
    activity.questions[0]?.question_type.replace("_", " ") || "Counting";

  // Get objects to count from configuration
  const objectsToCount = question.configuration?.objects as
    Array<{ emoji: string; count?: number }> | undefined;
  const objectEmoji = question.configuration?.objectEmoji as string | undefined;
  const totalCount = question.configuration?.totalCount as number | undefined;

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
            Count the objects:
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {objectsToCount?.map((obj, idx) => (
              <span key={idx} className="text-5xl">
                {obj.emoji || "🔴"}
              </span>
            )) ||
              Array.from({ length: totalCount || 5 }).map((_, idx) => (
                <span key={idx} className="text-5xl">
                  {objectEmoji || "🍎"}
                </span>
              ))}
          </div>
        </div>

        {renderQuestionPrompt({
          prompt: question.prompt,
        })}

        <div className="grid grid-cols-3 gap-3">
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
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center text-3xl font-bold text-primary-700">
                    {option.text}
                  </div>
                </div>
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
