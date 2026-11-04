import TracePad from "../TracePad";
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
 * Tracing Activity Component.
 * Used for: tracing
 *
 * Shows a shape/letter/number to trace.
 * Drawing stays on the device; only the exploration outcome is saved.
 */
export function TracingActivity(
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
    activity.questions[0]?.question_type.replace("_", " ") || "Tracing";

  // Get tracing configuration
  const traceType = question.configuration?.traceType as
    "letter" | "number" | "shape" | "line" | undefined;
  const traceTarget = question.configuration?.traceTarget as string | undefined;

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
            Trace the shape:
          </div>

          <TracePad
            key={question.id}
            target={traceTarget || "○"}
            disabled={showFeedback || submitting}
            onDone={
              question.question_type === "exploration"
                ? props.onExplore
                : undefined
            }
          />

          <p className="text-sm text-gray-500">
            {traceType === "letter"
              ? "Trace the letter with your finger"
              : traceType === "number"
                ? "Trace the number with your finger"
                : traceType === "shape"
                  ? "Trace the shape with your finger"
                  : "Trace the line with your finger"}
          </p>
        </div>

        {renderQuestionPrompt({
          prompt: question.prompt,
        })}

        {/* For now, use option selection to confirm tracing */}
        <div className="grid grid-cols-2 gap-4">
          {question.options.map((option) =>
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
                  <div className="w-20 h-20 rounded-xl bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-700 border-2 border-blue-200">
                    {(option.configuration?.emoji as string) || option.text}
                  </div>
                  <p className="font-medium text-gray-900 text-center text-sm">
                    {option.text}
                  </p>
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
