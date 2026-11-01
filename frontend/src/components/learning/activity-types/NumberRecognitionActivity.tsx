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
 * Number Recognition Activity Component.
 * Used for: number_recognition
 *
 * Shows a number and asks to identify it.
 * Options are number choices.
 */
export function NumberRecognitionActivity(
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
    activity.questions[0]?.question_type.replace("_", " ") ||
    "Number Recognition";

  // Get target number from configuration
  const targetNumber = question.configuration?.targetNumber as
    number | undefined;
  const showObjects = question.configuration?.showObjects as
    boolean | undefined;
  const objectEmoji = question.configuration?.objectEmoji as string | undefined;

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
            Find the number:
          </div>
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-xl bg-green-100 flex items-center justify-center border-2 border-green-200">
              <span className="text-7xl font-bold text-green-700">
                {targetNumber !== undefined ? targetNumber : "1"}
              </span>
            </div>
          </div>
          {showObjects && targetNumber && objectEmoji && (
            <div className="mt-4 flex justify-center gap-1">
              {Array.from({ length: targetNumber }).map((_, idx) => (
                <span key={idx} className="text-4xl">
                  {objectEmoji || "🔴"}
                </span>
              ))}
            </div>
          )}
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
                  <div className="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center text-3xl font-bold text-green-700 border-2 border-green-200">
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
