import { ActivityType } from "@/types";
import type { ReactNode } from "react";

/**
 * Registry entry for an activity type.
 */
export interface ActivityTypeRegistryEntry {
  /** The activity type identifier (matches backend enum) */
  type: ActivityType;
  /** Human-readable label for the activity type */
  label: string;
  /** Icon or emoji for the activity type */
  icon: string;
  /** Color theme for the activity type */
  color: string;
  /** The React component that renders this activity type */
  component: ActivityTypeComponent;
  /** Whether this activity type supports audio narration */
  supportsAudio: boolean;
  /** Whether this activity type supports images in options */
  supportsImages: boolean;
  /** Default configuration schema for validation */
  defaultConfig: Record<string, unknown>;
}

/**
 * Type for activity type component.
 * Each activity type component receives the same props interface.
 */
export type ActivityTypeComponent = (
  props: ActivityTypeComponentProps,
) => ReactNode;

/**
 * Props passed to all activity type components.
 * Contains the activity data, current question, and callback handlers.
 */
export interface NextActivityRecommendation {
  activity_id: number | null;
  reason: string;
  confidence: string;
  mastery_score: number | null;
  tier: string | null;
  has_evidence: boolean;
  activity: {
    id: number;
    code: string;
    type: string;
    title: string;
    instructions: string | null;
    estimated_duration_minutes: number | null;
    configuration: Record<string, unknown> | null;
    questions: Array<{
      id: number;
      question_type: string;
      prompt: string;
      prompt_audio_url: string | null;
      display_order: number;
      points: number;
      configuration: Record<string, unknown> | null;
      options: Array<{
        id: number;
        text: string;
        text_audio_url: string | null;
        image_url: string | null;
        display_order: number;
        configuration?: Record<string, unknown>;
      }>;
    }>;
  } | null;
}

export interface ActivityTypeComponentProps {
  /** The full activity data including questions and options */
  activity: {
    id: number;
    type: ActivityType;
    code: string;
    title: string;
    instructions: string | null;
    estimated_duration_minutes: number | null;
    configuration: Record<string, unknown> | null;
    questions: Array<{
      id: number;
      question_type: string;
      prompt: string;
      prompt_audio_url: string | null;
      display_order: number;
      points: number;
      configuration: Record<string, unknown> | null;
      options: Array<{
        id: number;
        text: string;
        text_audio_url: string | null;
        image_url: string | null;
        display_order: number;
        configuration?: Record<string, unknown>;
      }>;
    }>;
  };
  /** Current question index */
  currentQuestion: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Currently selected answer option ID */
  selectedAnswer: number | null;
  /** Whether feedback is currently shown */
  showFeedback: boolean;
  /** Whether the current answer was correct */
  isCorrect: boolean;
  /** IDs of correct options for the current question */
  correctOptionIds: number[];
  /** Current score */
  score: number;
  /** Whether activity is completed */
  completed: boolean;
  /** Callback when an answer is selected */
  onAnswer: (answerId: number) => void;
  /** Callback to proceed to next question or finish */
  onNext: () => void;
  /** Callback to go to previous question */
  onPrevious: () => void;
  /** Callback to retry the activity */
  onRetry: () => void;
  /** Callback to toggle audio */
  onToggleAudio: () => void;
  /** Whether audio is enabled */
  audioEnabled: boolean;
  /** Activity attempt ID for answer submission */
  attemptId: number | null;
  /** Loading state */
  loading: boolean;
  /** Submitting state */
  submitting: boolean;
  /** Error message if any */
  error: string | null;
  /** Next activity recommendation (shown on completion) */
  recommendation?: NextActivityRecommendation | null;
  /** Whether recommendation is being fetched */
  recommendationLoading?: boolean;
  /** Error fetching recommendation */
  recommendationError?: string | null;
  /** Whether a recommended activity is being started */
  startingRecommended?: boolean;
  /** Callback to start the recommended activity */
  onStartRecommended?: () => void;
}
