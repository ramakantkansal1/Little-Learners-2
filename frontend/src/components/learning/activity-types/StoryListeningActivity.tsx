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
 * Story Listening Activity Component.
 * Used for: story_listening
 * 
 * Plays a story audio and asks comprehension questions.
 */
export function StoryListeningActivity(props: ActivityTypeComponentProps): React.ReactElement {
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
  const questionTypeLabel = activity.questions[0]?.question_type.replace('_', ' ') || 'Story Listening';

  // Get story configuration
  const storyTitle = question.configuration?.storyTitle as string | undefined;
  const storyImage = question.configuration?.storyImage as string | undefined;
  const storyAudioUrl = question.prompt_audio_url;
  const isFirstQuestion = currentQuestion === 0;

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
        {/* Story player - shown on first question */}
        {isFirstQuestion && storyAudioUrl && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {storyImage && (
                  <img src={storyImage} alt={storyTitle || 'Story'} className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-sm text-gray-500">Story</p>
                  <h3 className="font-semibold text-gray-900">{storyTitle || 'Listen to the story'}</h3>
                </div>
              </div>
              <button
                onClick={() => handlePlayAudio(storyAudioUrl)}
                className="btn btn-primary px-6 py-2"
                aria-label="Play story"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                Listen to Story
              </button>
            </div>
          </div>
        )}

        {renderQuestionPrompt({ 
          prompt: question.prompt,
        })}

        <div className="grid grid-cols-1 gap-3">
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
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{option.text}</p>
                  </div>
                  {option.text_audio_url && (
                    <button
                      onClick={() => handlePlayAudio(option.text_audio_url)}
                      className="btn btn-ghost p-2"
                      aria-label={`Play answer option`}
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