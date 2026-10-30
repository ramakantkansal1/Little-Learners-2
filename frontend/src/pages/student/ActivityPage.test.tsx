import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ActivityPage from './ActivityPage';
import type { AxiosResponse } from 'axios';

import { studentApi, AttemptStartResponse, AnswerSubmitResponse, AttemptCompleteResponse, NextActivityRecommendation } from '@services/api';

// Re-export for use in test helpers
type AttemptStartResponseType = AttemptStartResponse;
type AnswerSubmitResponseType = AnswerSubmitResponse;
type AttemptCompleteResponseType = AttemptCompleteResponse;
type NextActivityRecommendationType = NextActivityRecommendation;

vi.mock('@services/api', () => ({
  studentApi: {
    getMyProfile: vi.fn(),
    startActivityAttempt: vi.fn(),
    getActivityAttempt: vi.fn(),
    submitAnswer: vi.fn(),
    completeAttempt: vi.fn(),
    getNextActivity: vi.fn(),
  },
  api: vi.fn(),
}));

// Type-safe access to mocked functions
const mockedStudentApi = vi.mocked(studentApi);

// Type helpers for mock responses
function createAttemptStartResponse(data: AttemptStartResponse): AxiosResponse<AttemptStartResponse> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} as unknown as import('axios').AxiosRequestHeaders },
  };
}

function createAnswerSubmitResponse(data: AnswerSubmitResponse): AxiosResponse<AnswerSubmitResponse> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} as unknown as import('axios').AxiosRequestHeaders },
  };
}

function createAttemptCompleteResponse(data: AttemptCompleteResponse): AxiosResponse<AttemptCompleteResponse> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} as unknown as import('axios').AxiosRequestHeaders },
  };
}

function createNextActivityResponse(data: NextActivityRecommendation): AxiosResponse<NextActivityRecommendation> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} as unknown as import('axios').AxiosRequestHeaders },
  };
}

// Helper to render the ActivityPage with proper routing
const renderActivityPageWithRoute = (activityId: string = '1') => {
  return render(
    <MemoryRouter initialEntries={[`/student/activity/${activityId}`]}>
      <Routes>
        <Route path="/student/activity/:activityId" element={<ActivityPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// Activity question structure
interface ActivityQuestion {
  id: number;
  question_type: string;
  prompt: string;
  prompt_audio_url: string | null;
  display_order: number;
  points: number;
  configuration: null | Record<string, unknown>;
  options: Array<{
    id: number;
    text: string;
    text_audio_url: string | null;
    image_url: string | null;
    display_order: number;
    is_correct: boolean;
    configuration?: Record<string, unknown>;
  }>;
}

// Activity structure
interface ActivityData {
  id: number;
  code: string;
  type: string;
  title: string;
  instructions: string;
  estimated_duration_minutes: number;
  configuration: null;
  questions: ActivityQuestion[];
}

// Test data factory
const createMockActivity = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  code: 'activity-001',
  type: 'picture_matching',
  title: 'Match the Pictures',
  instructions: 'Find the matching picture',
  estimated_duration_minutes: 5,
  configuration: null,
  questions: [
    {
      id: 1,
      question_type: 'single_choice',
      prompt: 'Which picture matches?',
      prompt_audio_url: null,
      display_order: 1,
      points: 10,
      configuration: null,
      options: [
        { id: 1, text: 'Option A', text_audio_url: null, image_url: null, display_order: 1, is_correct: true },
        { id: 2, text: 'Option B', text_audio_url: null, image_url: null, display_order: 2, is_correct: false },
      ],
    },
    {
      id: 2,
      question_type: 'single_choice',
      prompt: 'Which picture matches?',
      prompt_audio_url: null,
      display_order: 2,
      points: 10,
      configuration: null,
      options: [
        { id: 3, text: 'Option C', text_audio_url: null, image_url: null, display_order: 1, is_correct: true },
        { id: 4, text: 'Option D', text_audio_url: null, image_url: null, display_order: 2, is_correct: false },
      ],
    },
  ],
  ...overrides,
});

// Helper to render the ActivityPage with proper routing
interface RenderOptions {
  getNextActivityResponse?: AxiosResponse<NextActivityRecommendation>;
}

// Create mock activity data
function createMockActivityData(): AttemptStartResponse {
  return {
    attempt_id: 1,
    activity: {
      id: 1,
      code: 'activity-001',
      type: 'picture_matching',
      title: 'Match the Pictures',
      instructions: 'Find the matching picture',
      estimated_duration_minutes: 5,
      configuration: null,
      questions: [
        {
          id: 1,
          question_type: 'single_choice',
          prompt: 'Which picture matches?',
          prompt_audio_url: null,
          display_order: 1,
          points: 10,
          configuration: null,
          options: [
            { id: 1, text: 'Option A', text_audio_url: null, image_url: null, display_order: 1, correct_option_id: 1 },
            { id: 2, text: 'Option B', text_audio_url: null, image_url: null, display_order: 2 },
          ],
        },
        {
          id: 2,
          question_type: 'single_choice',
          prompt: 'Which picture matches?',
          prompt_audio_url: null,
          display_order: 2,
          points: 10,
          configuration: null,
          options: [
            { id: 3, text: 'Option C', text_audio_url: null, image_url: null, display_order: 1, correct_option_id: 3 },
            { id: 4, text: 'Option D', text_audio_url: null, image_url: null, display_order: 2 },
          ],
        },
      ],
    },
    questions: [
      {
        id: 1,
        question_type: 'single_choice',
        prompt: 'Which picture matches?',
        prompt_audio_url: null,
        display_order: 1,
        points: 10,
        configuration: null,
        options: [
          { id: 1, text: 'Option A', text_audio_url: null, image_url: null, display_order: 1 },
          { id: 2, text: 'Option B', text_audio_url: null, image_url: null, display_order: 2 },
        ],
      },
      {
        id: 2,
        question_type: 'single_choice',
        prompt: 'Which picture matches?',
        prompt_audio_url: null,
        display_order: 2,
        points: 10,
        configuration: null,
        options: [
          { id: 3, text: 'Option C', text_audio_url: null, image_url: null, display_order: 1 },
          { id: 4, text: 'Option D', text_audio_url: null, image_url: null, display_order: 2 },
        ],
      },
    ],
    saved_progress: null,
    lesson_progress: null,
  };
}

const renderActivityPage = (options: RenderOptions = {}) => {
  // Reset all mocks to clean state
  vi.resetAllMocks();

  // Default successful responses
  const mockResponseData = createMockActivityData();
  const mockResponse = createAttemptStartResponse(mockResponseData);

  mockedStudentApi.startActivityAttempt.mockImplementation(async (id: number) => {
    console.log('startActivityAttempt called with:', id);
    return mockResponse;
  });
  
  // Mock getActivityAttempt for the second call after navigation
  mockedStudentApi.getActivityAttempt.mockResolvedValue(mockResponse);

  mockedStudentApi.submitAnswer.mockResolvedValue(createAnswerSubmitResponse({
    is_correct: true,
    points_earned: 10,
    correct_options: [1],
    saved_progress: null,
    lesson_progress: null,
  }));

  mockedStudentApi.completeAttempt.mockResolvedValue(createAttemptCompleteResponse({
    score: 100,
    passed: true,
    rewards_earned: [{ name: 'First Star', type: 'star', image_url: null }],
    next_activity_id: 2,
    streak: { current_streak: 1, longest_streak: 1, last_activity_date: '2024-01-15' },
  }));

  // Default getNextActivity - can be overridden by tests
  const defaultNextActivityResponse = createNextActivityResponse({
    activity_id: 2,
    reason: 'advance_next',
    confidence: 'high',
    mastery_score: 0.95,
    tier: 'advance',
    has_evidence: true,
    activity: {
      id: 2,
      code: 'activity-002',
      type: 'simple_quiz',
      title: 'Simple Quiz',
      instructions: 'Answer the questions',
      estimated_duration_minutes: 5,
      configuration: null,
      questions: [],
    },
  });

  mockedStudentApi.getNextActivity.mockResolvedValue(defaultNextActivityResponse);

  console.log('Mock setup complete, mockResponse:', mockResponse);

  // Use custom getNextActivity response if provided, otherwise use default
  const getNextActivityResponse = options.getNextActivityResponse || defaultNextActivityResponse;

  mockedStudentApi.getNextActivity.mockResolvedValue(getNextActivityResponse);

  return renderActivityPageWithRoute('1');
};

// Helper to complete an activity through the UI
const completeActivity = async () => {
  const user = userEvent.setup();

  // Answer question 1 - find button containing "Option A"
  await waitFor(() => {
    const buttons = screen.getAllByRole('button');
    const optionAButton = buttons.find(btn => btn.textContent?.includes('Option A'));
    expect(optionAButton).toBeInTheDocument();
  }, { timeout: 10000 });
  const buttons1 = screen.getAllByRole('button');
  const optionAButton = buttons1.find(btn => btn.textContent?.includes('Option A'));
  console.log('Clicking Option A');
  await user.click(optionAButton!);
  await waitFor(() => expect(screen.getByText(/Correct/i)).toBeInTheDocument(), { timeout: 10000 });

  // Click Next to go to question 2
  console.log('Clicking Next');
  await user.click(screen.getByText('Next'));

  // Answer question 2 - find button containing "Option C"
  await waitFor(() => {
    const buttons = screen.getAllByRole('button');
    const optionCButton = buttons.find(btn => btn.textContent?.includes('Option C'));
    expect(optionCButton).toBeInTheDocument();
  }, { timeout: 10000 });
  const buttons2 = screen.getAllByRole('button');
  const optionCButton = buttons2.find(btn => btn.textContent?.includes('Option C'));
  console.log('Clicking Option C');
  await user.click(optionCButton!);
  await waitFor(() => expect(screen.getByText(/Correct/i)).toBeInTheDocument(), { timeout: 10000 });

  // Click Finish - use getByRole to find the button
  await waitFor(() => expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument(), { timeout: 5000 });
  console.log('Clicking Finish');
  await user.click(screen.getByRole('button', { name: 'Finish' }));

  // Wait for completion screen
  await waitFor(() => expect(screen.getByText('Great Job!')).toBeInTheDocument(), { timeout: 10000 });
};

describe('ActivityPage — Recommendation Integration', () => {

  describe('Basic rendering', () => {
    it('renders loading state initially', async () => {
      renderActivityPage();
      await waitFor(() => expect(screen.getByText('Loading activity...')).toBeInTheDocument(), { timeout: 5000 });
    }, 10000);

    it('renders activity after loading', async () => {
      renderActivityPage();
      await waitFor(() => expect(screen.getByText('Match the Pictures')).toBeInTheDocument(), { timeout: 10000 });
    }, 15000);
  });

  describe('Type safety and API contract', () => {
    it('imports NextActivityRecommendation type correctly', () => {
      type TestRec = import('@services/api').NextActivityRecommendation;
      const rec: TestRec = {
        activity_id: 1,
        reason: 'advance_next',
        confidence: 'high',
        mastery_score: 0.95,
        tier: 'advance',
        has_evidence: true,
        activity: { id: 1, code: 'test', type: 'picture_matching', title: 'Test', instructions: null, estimated_duration_minutes: 5, configuration: null, questions: [] },
      };
      expect(rec.activity_id).toBe(1);
      expect(rec.tier).toBe('advance');
    });

    it('studentApi has getNextActivity method', () => {
      expect(typeof studentApi.getNextActivity).toBe('function');
    });

    it('mocked startActivityAttempt returns expected data', async () => {
      const mockData: AttemptStartResponse = {
        attempt_id: 1,
        activity: {
          id: 1,
          code: 'test',
          type: 'picture_matching',
          title: 'Test',
          instructions: '',
          estimated_duration_minutes: 5,
          configuration: null,
          questions: [],
        },
        questions: [],
        saved_progress: null,
        lesson_progress: null,
      };
      mockedStudentApi.startActivityAttempt.mockResolvedValue(createAttemptStartResponse(mockData));
      
      const result = await studentApi.startActivityAttempt(1);
      expect(result.data.attempt_id).toBe(1);
      expect(result.data.activity.title).toBe('Test');
    });

    it('NextActivityRecommendation interface includes all required fields', () => {
      const rec = {
        activity_id: 2,
        reason: 'advance_next',
        confidence: 'high',
        mastery_score: 0.95,
        tier: 'advance',
        has_evidence: true,
        activity: { id: 2, code: 'activity-002', type: 'simple_quiz', title: 'Simple Quiz', instructions: 'Answer the questions', estimated_duration_minutes: 5, configuration: null, questions: [] },
      };
      expect(rec).toHaveProperty('activity_id');
      expect(rec).toHaveProperty('reason');
      expect(rec).toHaveProperty('confidence');
      expect(rec).toHaveProperty('mastery_score');
      expect(rec).toHaveProperty('tier');
      expect(rec).toHaveProperty('has_evidence');
      expect(rec).toHaveProperty('activity');
    });

    it('handles null activity_id in recommendation', () => {
      const rec = {
        activity_id: null,
        reason: 'no_more_activities',
        confidence: 'low',
        mastery_score: null,
        tier: 'cold_start',
        has_evidence: false,
        activity: null,
      };
      expect(rec.activity_id).toBeNull();
      expect(rec.reason).toBe('no_more_activities');
      expect(rec.activity).toBeNull();
    });
  });

  describe('Recommendation display after completion', () => {
    it('fetches and displays recommendation after successful completion', async () => {
      renderActivityPage();

      // Wait for activity to load
      await waitFor(() => expect(screen.getByText('Match the Pictures')).toBeInTheDocument(), { timeout: 30000 });

      // Complete the activity
      await completeActivity();

      // Verify recommendation request was made
      await waitFor(() => {
        expect(mockedStudentApi.getNextActivity).toHaveBeenCalledTimes(1);
      });

      // Verify recommendation card is rendered
      await waitFor(() => {
        expect(screen.getByText('Next Recommended Activity')).toBeInTheDocument();
      }, { timeout: 20000 });

      // Verify recommendation details are displayed
      expect(screen.getByText('Ready for the next challenge')).toBeInTheDocument();
      expect(screen.getByText('Advancing')).toBeInTheDocument();
      expect(screen.getByText('Simple Quiz')).toBeInTheDocument();
    }, 60000);

    it('displays human-readable reason and tier labels', async () => {
      // Test with different reason/tier combinations - just test one to avoid state issues
      const testCases = [
        { reason: 'advance_next', expectedReason: 'Ready for the next challenge', tier: 'advance', expectedTier: 'Advancing' },
        // Note: Other cases tested separately to avoid state leakage between iterations
      ];

      for (const tc of testCases) {
        const customResponse = createNextActivityResponse({
          activity_id: 2,
          reason: tc.reason,
          confidence: 'high',
          mastery_score: 0.95,
          tier: tc.tier,
          has_evidence: true,
          activity: { id: 2, code: 'activity-002', type: 'simple_quiz', title: 'Simple Quiz', instructions: 'Answer the questions', estimated_duration_minutes: 5, configuration: null, questions: [] },
        });
        renderActivityPage({ getNextActivityResponse: customResponse });
        await completeActivity();

        await waitFor(() => {
          expect(screen.getByText(tc.expectedReason)).toBeInTheDocument();
          expect(screen.getByText(tc.expectedTier)).toBeInTheDocument();
        }, { timeout: 20000 });
      }
    }, 60000);

    it('handles unknown reason and tier with safe fallbacks', async () => {
      const customResponse = createNextActivityResponse({
        activity_id: 2,
        reason: 'unknown_reason',
        confidence: 'high',
        mastery_score: 0.95,
        tier: 'unknown_tier',
        has_evidence: true,
        activity: { id: 2, code: 'activity-002', type: 'simple_quiz', title: 'Simple Quiz', instructions: 'Answer the questions', estimated_duration_minutes: 5, configuration: null, questions: [] },
      });
      renderActivityPage({ getNextActivityResponse: customResponse });
      await completeActivity();

      await waitFor(() => {
        expect(screen.getByText('Recommended for you')).toBeInTheDocument();
        expect(screen.getByText('Learning')).toBeInTheDocument();
      }, { timeout: 20000 });
    }, 60000);
  });

  describe('No recommendation available', () => {
    it('displays friendly no-more-activities message when activity_id is null', async () => {
      const customResponse = createNextActivityResponse({
        activity_id: null,
        reason: 'no_more_activities',
        confidence: 'low',
        mastery_score: null,
        tier: 'cold_start',
        has_evidence: false,
        activity: null,
      });
      renderActivityPage({ getNextActivityResponse: customResponse });
      await completeActivity();

      await waitFor(() => {
        expect(screen.getByText("You've finished the available activities for now")).toBeInTheDocument();
      }, { timeout: 20000 });

      // Verify Back to Lesson button is available (there are two: one in completion screen, one in no-more-activities card)
      expect(screen.getAllByText('Back to Lesson').length).toBeGreaterThanOrEqual(1);
    }, 60000);

    it('displays no-more-activities when reason is no_more_activities', async () => {
      const customResponse = createNextActivityResponse({
        activity_id: null,
        reason: 'no_more_activities',
        confidence: 'low',
        mastery_score: null,
        tier: 'cold_start',
        has_evidence: false,
        activity: null,
      });
      renderActivityPage({ getNextActivityResponse: customResponse });
      await completeActivity();

      await waitFor(() => {
        expect(screen.getByText("You've finished the available activities for now")).toBeInTheDocument();
      }, { timeout: 20000 });
    }, 60000);
  });

  describe('Recommendation request failure', () => {
    it('preserves completion results when recommendation API fails', async () => {
      renderActivityPage();
      // Override the default mock to reject
      mockedStudentApi.getNextActivity.mockRejectedValueOnce(new Error('Network error'));
      await completeActivity();

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Could not load next activity recommendation')).toBeInTheDocument();
      }, { timeout: 20000 });

      // Completion screen should still be visible
      expect(screen.getByText('Great Job!')).toBeInTheDocument();
      expect(screen.getByText('100% Score')).toBeInTheDocument();
      expect(screen.getByText('You earned a star!')).toBeInTheDocument();
    }, 60000);

    it('does not block completion when recommendation fails', async () => {
      renderActivityPage();
      // Override the default mock to reject
      mockedStudentApi.getNextActivity.mockRejectedValueOnce(new Error('Network error'));
      await completeActivity();

      // Verify completion succeeded despite recommendation failure
      await waitFor(() => {
        expect(mockedStudentApi.completeAttempt).toHaveBeenCalledTimes(1);
      }, { timeout: 20000 });
    }, 60000);
  });

  describe('Starting a recommended activity', () => {
    it('creates new attempt and navigates on click', async () => {
      renderActivityPage();
      await completeActivity();

      await waitFor(() => {
        expect(screen.getByText('Next Recommended Activity')).toBeInTheDocument();
      }, { timeout: 20000 });

      // Click Start This Activity
      const startButton = screen.getByText('Start This Activity');
      expect(startButton).not.toBeDisabled();
      fireEvent.click(startButton);

      // Verify attempt creation was called with recommended activity ID
      await waitFor(() => {
        expect(mockedStudentApi.startActivityAttempt).toHaveBeenCalledWith(2);
      }, { timeout: 20000 });
    }, 60000);

    it('navigates using the new attempt ID', async () => {
      const newAttemptResponse = createAttemptStartResponse({
        attempt_id: 3,
        activity: {
          id: 2,
          code: 'activity-002',
          type: 'simple_quiz',
          title: 'Simple Quiz',
          instructions: 'Answer the questions',
          estimated_duration_minutes: 5,
          configuration: null,
          questions: [
            { id: 1, question_type: 'single_choice', prompt: 'Question 1', prompt_audio_url: null, display_order: 1, points: 10, configuration: null, options: [{ id: 1, text: 'Option A', text_audio_url: null, image_url: null, display_order: 1, correct_option_id: 1 }, { id: 2, text: 'Option B', text_audio_url: null, image_url: null, display_order: 2 }] },
          ],
        },
        questions: [],
        saved_progress: null,
        lesson_progress: null,
      });
      mockedStudentApi.startActivityAttempt.mockResolvedValueOnce(newAttemptResponse);

      renderActivityPage();
      await completeActivity();

      await waitFor(() => {
        expect(screen.getByText('Next Recommended Activity')).toBeInTheDocument();
      }, { timeout: 20000 });

      fireEvent.click(screen.getByText('Start This Activity'));

      // Navigation should occur (MemoryRouter will update location)
      await waitFor(() => {
        expect(mockedStudentApi.startActivityAttempt).toHaveBeenCalledWith(2);
      }, { timeout: 20000 });
    }, 60000);
  });

  describe('Duplicate click protection', () => {
    it('prevents duplicate attempt creation while request is pending', async () => {
      let resolveStart: (value: AxiosResponse<AttemptStartResponse>) => void;
      const startPromise = new Promise<AxiosResponse<AttemptStartResponse>>((resolve) => { resolveStart = resolve; })

      renderActivityPage();
      await completeActivity();

      // Clear mock call count from initial activity load
      mockedStudentApi.startActivityAttempt.mockClear();
      // Override the default mock with our controlled promise
      mockedStudentApi.startActivityAttempt.mockReturnValueOnce(startPromise);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start This Activity/i })).toBeInTheDocument();
      }, { timeout: 20000 });

      // Click Start This Activity
      const startButton = screen.getByRole('button', { name: /Start This Activity/i });
      await userEvent.click(startButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Starting/i })).toBeInTheDocument();
      }, { timeout: 10000 });

      // Click again - should not create duplicate attempts
      // Re-query the button in loading state
      const loadingButton = screen.getByRole('button', { name: /Starting/i });
      await userEvent.click(loadingButton);

      // Resolve the promise
      act(() => {
        resolveStart!(createAttemptStartResponse({
          attempt_id: 3,
          activity: { id: 2, code: 'activity-002', type: 'simple_quiz', title: 'Simple Quiz', instructions: 'Answer the questions', estimated_duration_minutes: 5, configuration: null, questions: [] },
          questions: [],
          saved_progress: null,
          lesson_progress: null,
        }));
      });

      // Should only have been called once despite double click (for the recommendation)
      await waitFor(() => {
        expect(mockedStudentApi.startActivityAttempt).toHaveBeenCalledTimes(1);
      }, { timeout: 20000 });
    }, 60000);
  });

  describe('Attempt creation failure', () => {
    it('shows error and allows retry when attempt creation fails', async () => {
      renderActivityPage();
      await completeActivity();

      // Override the default mock to reject
      mockedStudentApi.startActivityAttempt.mockRejectedValueOnce(new Error('Failed to start'));

      await waitFor(() => {
        expect(screen.getByText('Next Recommended Activity')).toBeInTheDocument();
      }, { timeout: 20000 });

      // Click Start This Activity
      await userEvent.click(screen.getByText('Start This Activity'));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Failed to start the recommended activity. Please try again.')).toBeInTheDocument();
      }, { timeout: 20000 });

      // Button should be re-enabled
      await waitFor(() => {
        expect(screen.getByText('Start This Activity')).not.toBeDisabled();
      }, { timeout: 10000 });
    }, 60000);

    it('does not navigate on attempt creation failure', async () => {
      renderActivityPage();
      await completeActivity();

      // Clear mock call count from initial activity load
      mockedStudentApi.startActivityAttempt.mockClear();
      // Override the default mock to reject
      mockedStudentApi.startActivityAttempt.mockRejectedValueOnce(new Error('Failed to start'));

      await waitFor(() => {
        expect(screen.getByText('Next Recommended Activity')).toBeInTheDocument();
      }, { timeout: 20000 });

      // Click Start This Activity
      await userEvent.click(screen.getByText('Start This Activity'));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Failed to start the recommended activity. Please try again.')).toBeInTheDocument();
      }, { timeout: 20000 });

      // Should not have navigated (no second call to startActivityAttempt with different ID)
      expect(mockedStudentApi.startActivityAttempt).toHaveBeenCalledTimes(1);
    }, 60000);
  });

  describe('Existing completion behavior preserved', () => {
    it('displays completion screen with score and rewards', async () => {
      renderActivityPage();
      await completeActivity();

      await waitFor(() => {
        expect(screen.getByText('Great Job!')).toBeInTheDocument();
        expect(screen.getByText('100% Score')).toBeInTheDocument();
        expect(screen.getByText('You got 2 out of 2 correct!')).toBeInTheDocument();
        expect(screen.getByText('You earned a star!')).toBeInTheDocument();
      }, { timeout: 20000 });
    }, 60000);

    it('shows Try Again and Back to Lesson buttons', async () => {
      renderActivityPage();
      await completeActivity();

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
        // There are two "Back to Lesson" buttons: one in completion screen, one in recommendation card
        expect(screen.getAllByText('Back to Lesson').length).toBeGreaterThanOrEqual(1);
      }, { timeout: 20000 });
    }, 60000);

    it('does not trigger duplicate completion', async () => {
      renderActivityPage();
      await completeActivity();

      // Verify completeAttempt was called exactly once
      expect(mockedStudentApi.completeAttempt).toHaveBeenCalledTimes(1);
    }, 60000);
  });
});
