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
 * Shape Matching Activity Component.
 * Used for: shape_matching
 * 
 * Shows a shape and asks to find the matching shape.
 * Options are different shapes.
 */
export function ShapeMatchingActivity(props: ActivityTypeComponentProps): React.ReactElement {
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
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Shape Matching';

  // Get target shape from configuration
  const targetShape = question.configuration?.targetShape as string | undefined;
  const _targetShapeEmoji = question.configuration?.targetShapeEmoji as string | undefined;
  void _targetShapeEmoji;
  const targetShapeSvg = question.configuration?.targetShapeSvg as string | undefined;

  // Shape emoji mapping
  const shapeEmojis: Record<string, string> = {
    circle: '⭕',
    square: '⬜',
    triangle: '🔺',
    rectangle: '🟦',
    star: '⭐',
    heart: '❤️',
    diamond: '💎',
    oval: '⭕',
  };

  const renderShape = (shape: string, size: number = 80) => {
    if (targetShapeSvg) {
      return <div dangerouslySetInnerHTML={{ __html: targetShapeSvg }} style={{ width: size, height: size }} />;
    }
    const emoji = shapeEmojis[shape.toLowerCase()] || '❓';
    return <span className="text-7xl">{emoji}</span>;
  };

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
          <div className="text-2xl font-semibold text-gray-700 mb-4">Find the matching shape:</div>
          <div className="flex justify-center">
            {renderShape(targetShape || 'circle', 120)}
          </div>
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
              renderOptionContent: (): React.ReactNode => {
                const optionShape = option.configuration?.shape as string | undefined;
                const _optionShapeSvg = option.configuration?.shapeSvg as string | undefined;
                void _optionShapeSvg;
                return (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-28 h-28 rounded-xl bg-gray-50 flex items-center justify-center border-2 border-gray-200">
                      {renderShape(optionShape || 'circle', 80)}
                    </div>
                    <p className="font-medium text-gray-900 text-center">{option.text}</p>
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