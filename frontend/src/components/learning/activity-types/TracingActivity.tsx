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
 * In this simplified version, we show the tracing path and ask to identify it.
 * Full canvas-based tracing would be a separate implementation.
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
    activity.questions[0]?.question_type.replace("_", " ") || "Tracing";

  // Get tracing configuration
  const traceType = question.configuration?.traceType as
    "letter" | "number" | "shape" | "line" | undefined;
  const traceTarget = question.configuration?.traceTarget as string | undefined;
  const traceSvg = question.configuration?.traceSvg as string | undefined;
  const traceSteps = question.configuration?.traceSteps as
    Array<{ x: number; y: number }> | undefined;

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

          <div className="flex justify-center mb-4">
            <div className="w-48 h-48 rounded-xl bg-gray-50 border-2 border-gray-200 relative overflow-hidden">
              {traceSvg && (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: traceSvg }}
                />
              )}
              {!traceSvg && traceTarget && (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl font-light text-gray-300 select-none">
                    {traceTarget}
                  </span>
                </div>
              )}

              {/* Tracing guide dots */}
              {traceSteps &&
                traceSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="absolute w-3 h-3 rounded-full bg-primary-500 border-2 border-white opacity-70 pointer-events-none"
                    style={{
                      left: `${step.x}%`,
                      top: `${step.y}%`,
                      transform: "translate(-50%, -50%)",
                      transition: "opacity 0.3s",
                      zIndex: 10,
                    }}
                  />
                ))}
            </div>
          </div>

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
