import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Star, Volume2, VolumeX, X } from 'lucide-react';
import { useState } from 'react';

const activity = {
  id: 1,
  title: 'Count the Apples',
  type: 'counting',
  lessonId: 1,
  lessonTitle: 'Counting 1-10',
  instructions: 'Tap on each apple to count them!',
  questions: [
    {
      id: 1,
      prompt: 'How many apples do you see?',
      image: '🍎🍎🍎',
      options: [
        { id: 1, text: '2', emoji: '🍎🍎' },
        { id: 2, text: '3', emoji: '🍎🍎🍎' },
        { id: 3, text: '4', emoji: '🍎🍎🍎🍎' },
      ],
      correctAnswer: 2,
    },
    {
      id: 2,
      prompt: 'Count the bananas!',
      image: '🍌🍌',
      options: [
        { id: 1, text: '1', emoji: '🍌' },
        { id: 2, text: '2', emoji: '🍌🍌' },
        { id: 3, text: '3', emoji: '🍌🍌🍌' },
      ],
      correctAnswer: 2,
    },
    {
      id: 3,
      prompt: 'How many oranges?',
      image: '🍊🍊🍊🍊',
      options: [
        { id: 1, text: '3', emoji: '🍊🍊🍊' },
        { id: 2, text: '4', emoji: '🍊🍊🍊🍊' },
        { id: 3, text: '5', emoji: '🍊🍊🍊🍊🍊' },
      ],
      correctAnswer: 2,
    },
  ],
};

export default function ActivityPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const question = activity.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / activity.questions.length) * 100;

  const handleAnswer = (answerId: number) => {
    if (showFeedback) return;
    setSelectedAnswer(answerId);
    const correct = answerId === question.correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore(prev => prev + 1);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQuestion < activity.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setCompleted(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setIsCorrect(false);
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    const percentage = Math.round((score / activity.questions.length) * 100);
    const earnedStar = percentage >= 80;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/student/learn/${activity.lessonId}`} className="btn btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-gray-900">Great Job!</h1>
            <p className="text-gray-600">You completed the activity!</p>
          </div>
        </div>

        <div className="card p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6">
            <Star className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">
            {percentage}% Score
          </h2>
          <p className="text-gray-600 mb-6">
            You got {score} out of {activity.questions.length} correct!
          </p>

          {earnedStar && (
            <div className="p-4 bg-yellow-50 rounded-xl mb-6 border border-yellow-200">
              <div className="flex items-center justify-center gap-2 text-yellow-700">
                <Star className="w-6 h-6" />
                <span className="font-semibold">You earned a star!</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/student/learn/${activity.lessonId}`} className="btn btn-secondary">
              <ArrowLeft className="w-5 h-5" />
              Back to Lesson
            </Link>
            <button onClick={handleRetry} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/student/learn/${activity.lessonId}`} className="btn btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-primary">{activity.type.replace('_', ' ')}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{activity.title}</h1>
        </div>
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="btn btn-ghost"
          aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">Question {currentQuestion + 1} of {activity.questions.length}</p>
          <p className="text-sm font-semibold text-gray-900">Score: {score}</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{question.image}</div>
          <p className="text-xl font-semibold text-gray-900">{question.prompt}</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {question.options.map(option => (
            <button
              key={option.id}
              onClick={() => handleAnswer(option.id)}
              disabled={showFeedback}
              className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                showFeedback
                  ? option.id === question.correctAnswer
                    ? 'border-green-500 bg-green-50'
                    : selectedAnswer === option.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{option.emoji}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{option.text}</p>
                </div>
                {showFeedback && (
                  <div className="flex items-center gap-2">
                    {option.id === question.correctAnswer && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {selectedAnswer === option.id && option.id !== question.correctAnswer && (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {showFeedback && (
          <div className="mt-6 p-4 rounded-xl bg-gray-50">
            <p className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '🎉 Correct! Well done!' : '😊 Good try! The correct answer is highlighted.'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => currentQuestion > 0 && (setCurrentQuestion(prev => prev - 1), setSelectedAnswer(null), setShowFeedback(false))}
          disabled={currentQuestion === 0 || showFeedback}
          className="btn btn-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
          Previous
        </button>

        {showFeedback && !completed && (
          <button
            onClick={handleNext}
            className="btn btn-primary"
            disabled={currentQuestion === activity.questions.length - 1 && !completed}
          >
            {currentQuestion === activity.questions.length - 1 ? 'Finish' : 'Next'}
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}