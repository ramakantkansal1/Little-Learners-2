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
 * Audio Identification Activity Component.
 * Used for: audio_identification
 * 
 * Plays a sound and asks to identify what it is.
 * Options are possible sources of the sound.
 */
export function AudioIdentificationActivity(props: ActivityTypeComponentProps): React.ReactElement {
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
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Audio Identification';

  const promptAudioUrl = question.prompt_audio_url;
  const soundHint = question.configuration?.soundHint as string | undefined;
  const soundCategory = question.configuration?.soundCategory as string | undefined;

  const handlePlayAudio = (url: string | null) => {
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
          <div className="text-2xl font-semibold text-gray-700 mb-4">Listen and identify the sound:</div>
          
          <div className="flex flex-col items-center gap-4">
            {/* Big play button */}
            <button
              onClick={() => handlePlayAudio(promptAudioUrl)}
              disabled={!promptAudioUrl}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Play sound"
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
            
            {soundHint && (
              <p className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                Hint: {soundHint}
              </p>
            )}
            
            {soundCategory && (
              <span className="badge badge-primary">{soundCategory}</span>
            )}
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
              renderOptionContent: () => (
                <div className="flex flex-col items-center gap-3">
                  {option.image_url ? (
                    <img 
                      src={option.image_url} 
                      alt={option.text}
                      className="w-24 h-24 object-contain rounded-lg bg-gray-50"
                    />
                  ) : option.text_audio_url ? (
                    <button
                      onClick={() => handlePlayAudio(option.text_audio_url)}
                      className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      aria-label={`Play sound for ${option.text}`}
                    >
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </button>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                      <span className="text-4xl">{option.text}</span>
                    </div>
                  )}
                  <p className="font-medium text-gray-900 text-center">{option.text}</p>
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