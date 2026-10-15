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
 * Letter Sound Activity Component.
 * Used for: letter_sound
 * 
 * Plays a letter sound and asks to identify the letter.
 * Options are letters with optional audio play buttons.
 */
export function LetterSoundActivity(props: ActivityTypeComponentProps): React.ReactElement {
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
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Letter Sound';

  // Get target letter sound from configuration
  const targetLetter = question.configuration?.targetLetter as string | undefined;
  const _targetSound = question.configuration?.targetSound as string | undefined;
  // _targetSound is reserved for future audio playback features
  void _targetSound;
  const promptAudioUrl = question.prompt_audio_url;

  const handlePlaySound = (url: string | null) => {
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(() => console.warn('Audio playback failed'));
    }
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
          <div className="text-2xl font-semibold text-gray-700 mb-4">Listen and find the letter:</div>
          
          <div className="flex flex-col items-center gap-4">
            {/* Big letter display */}
            <div className="w-24 h-24 rounded-xl bg-purple-100 flex items-center justify-center border-2 border-purple-200">
              <span className="text-7xl font-bold text-purple-700 uppercase">
                {targetLetter || 'A'}
              </span>
            </div>
            
            {/* Play sound button */}
            <button
              onClick={() => handlePlaySound(promptAudioUrl)}
              disabled={!promptAudioUrl}
              className="btn btn-primary px-8 py-3 text-lg"
              aria-label="Play letter sound"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              Listen
            </button>
          </div>
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
                  <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center text-3xl font-bold text-purple-700 border-2 border-purple-200">
                    {option.text.toUpperCase()}
                  </div>
                  {option.text_audio_url && (
                    <button
                      onClick={() => handlePlaySound(option.text_audio_url)}
                      className="btn btn-ghost p-2"
                      aria-label={`Play sound for ${option.text}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </button>
                  )}
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