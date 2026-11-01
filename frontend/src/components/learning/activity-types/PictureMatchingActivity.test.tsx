import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PictureMatchingActivity } from "./PictureMatchingActivity";
import type { ActivityTypeComponentProps } from "../ActivityRenderer";

const mockActivity: ActivityTypeComponentProps["activity"] = {
  id: 64,
  type: "picture_matching",
  code: "pic-match-001",
  title: "Activity 1",
  instructions: "Find the matching picture",
  estimated_duration_minutes: 5,
  configuration: null,
  questions: [
    {
      id: 1,
      question_type: "picture_matching",
      prompt: "Find the match:",
      prompt_audio_url: null,
      display_order: 1,
      points: 1,
      configuration: {
        targetEmoji: "🐘",
        matchType: "exact",
      },
      options: [
        {
          id: 10,
          text: "Elephant",
          text_audio_url: null,
          image_url: null,
          display_order: 1,
        },
        {
          id: 11,
          text: "Lion",
          text_audio_url: null,
          image_url: null,
          display_order: 2,
        },
        {
          id: 12,
          text: "Tiger",
          text_audio_url: null,
          image_url: null,
          display_order: 3,
        },
      ],
    },
  ],
};

const correctOptionIds = [10];

const baseProps: ActivityTypeComponentProps = {
  activity: mockActivity,
  currentQuestion: 0,
  totalQuestions: 1,
  selectedAnswer: null,
  showFeedback: false,
  isCorrect: false,
  correctOptionIds,
  score: 0,
  completed: false,
  onAnswer: vi.fn(),
  onNext: vi.fn(),
  onPrevious: vi.fn(),
  onRetry: vi.fn(),
  onToggleAudio: vi.fn(),
  audioEnabled: true,
  attemptId: null,
  loading: false,
  submitting: false,
  error: null,
};

describe("PictureMatchingActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders valid activity configuration correctly", () => {
    const props = { ...baseProps };
    render(<PictureMatchingActivity {...props} />);

    // Activity title should be visible
    expect(screen.getByText("Activity 1")).toBeInTheDocument();

    // Target should be rendered (emoji)
    expect(screen.getByText("🐘")).toBeInTheDocument();

    // Question prompt - use getAllByText since "Find the match:" appears twice
    const prompts = screen.getAllByText("Find the match:");
    expect(prompts.length).toBeGreaterThanOrEqual(1);

    // All options should be visible (use getAllByText for duplicated labels)
    const lionOptions = screen.getAllByText("Lion");
    expect(lionOptions.length).toBeGreaterThanOrEqual(1);
    const tigerOptions = screen.getAllByText("Tiger");
    expect(tigerOptions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows loading state when loading is true", () => {
    const props = { ...baseProps, loading: true };
    render(<PictureMatchingActivity {...props} />);

    expect(screen.getByText("Loading activity...")).toBeInTheDocument();
  });

  it("shows error state when error is set", () => {
    const props = { ...baseProps, error: "Failed to load activity" };
    render(<PictureMatchingActivity {...props} />);

    expect(screen.getByText("Unable to load activity")).toBeInTheDocument();
    expect(screen.getByText("Failed to load activity")).toBeInTheDocument();
  });

  it("calls onAnswer when an option is selected", () => {
    const onAnswer = vi.fn();
    const props = { ...baseProps, onAnswer };
    render(<PictureMatchingActivity {...props} />);

    // Click the option button containing "Elephant" text
    const buttons = screen.getAllByRole("button");
    const elephantButton = buttons.find((b) =>
      b.textContent?.includes("Elephant"),
    );
    expect(elephantButton).toBeDefined();
    fireEvent.click(elephantButton!);

    expect(onAnswer).toHaveBeenCalledWith(10);
  });

  it("shows feedback after selecting an answer", () => {
    const props = {
      ...baseProps,
      showFeedback: true,
      isCorrect: true,
      correctOptionIds: [10],
    };
    render(<PictureMatchingActivity {...props} />);

    // Feedback message should be visible
    expect(screen.getByText(/🎉 Correct! Well done!/)).toBeInTheDocument();

    // Correct option should be highlighted (green border)
    const buttons = screen.getAllByRole("button");
    const correctButton = buttons.find((b) =>
      b.className.includes("border-green-500"),
    );
    expect(correctButton).toBeDefined();
  });

  it("shows completion screen when activity is completed", () => {
    const onRetry = vi.fn();
    const props = {
      ...baseProps,
      completed: true,
      score: 1,
      onRetry,
    };
    render(<PictureMatchingActivity {...props} />);

    // Completion screen should be visible
    expect(screen.getByText("Great Job!")).toBeInTheDocument();
    expect(screen.getByText("You completed the activity!")).toBeInTheDocument();

    // Score should be shown
    expect(screen.getByText("100% Score")).toBeInTheDocument();

    // Retry button should be available
    expect(
      screen.getByRole("button", { name: /Try Again/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Try Again/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows progress bar with current question and score", () => {
    const props = {
      ...baseProps,
      currentQuestion: 0,
      totalQuestions: 3,
      score: 0,
    };
    render(<PictureMatchingActivity {...props} />);

    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Score: 0")).toBeInTheDocument();
  });

  it("disables option buttons when feedback is showing", () => {
    const props = { ...baseProps, showFeedback: true };
    render(<PictureMatchingActivity {...props} />);

    const buttons = screen.getAllByRole("button");
    // All option buttons should be disabled when feedback is showing
    buttons.forEach((button) => {
      if (
        button.textContent?.includes("Elephant") ||
        button.textContent?.includes("Lion") ||
        button.textContent?.includes("Tiger")
      ) {
        expect(button).toBeDisabled();
      }
    });
  });
});
