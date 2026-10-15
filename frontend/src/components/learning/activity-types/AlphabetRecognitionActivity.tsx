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
 * Alphabet Recognition Activity Component.
 * Used for: alphabet_recognition
 * 
 * Shows a letter and asks to identify it.
 * Options are letter choices.
 */
export function AlphabetRecognitionActivity(props: ActivityTypeComponentProps): React.ReactElement {
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
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Alphabet Recognition';

  // Get target letter from configuration
  const targetLetter = question.configuration?.targetLetter as string | undefined;
  const targetLetterCase = question.configuration?.targetLetterCase as 'upper' | 'lower' | undefined;
  const showBothCases = question.configuration?.showBothCases as boolean | undefined;

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
            {question.prompt.includes('upper') || question.prompt.includes('capital') ? 'Find the capital letter:' : 
             question.prompt.includes('lower') || question.prompt.includes('small') ? 'Find the small letter:' :
             'Find the letter:'}
          </div>
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-xl bg-primary-100 flex items-center justify-center border-2 border-primary-200">
              <span className={`text-7xl font-bold ${targetLetterCase === 'lower' ? 'lowercase' : 'uppercase'} text-primary-700`}>
                {targetLetter || 'A'}
              </span>
            </div>
          </div>
          {showBothCases && targetLetter && (
            <p className="mt-2 text-sm text-gray-500">
              Also: {targetLetter.toLowerCase()} {targetLetter.toUpperCase()}
            </p>
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
              renderOptionContent: () => (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center text-3xl font-bold text-primary-700 border-2 border-primary-200">
                    {option.text}
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