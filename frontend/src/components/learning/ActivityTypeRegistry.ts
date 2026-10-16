import { ActivityType } from '@/types';
import { ReactNode } from 'react';
import type { ActivityTypeComponent, ActivityTypeComponentProps } from './ActivityTypeRegistry.types';

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
export type ActivityTypeComponent = (props: ActivityTypeComponentProps) => ReactNode;

/**
 * Props passed to all activity type components.
 * Contains the activity data, current question, and callback handlers.
 */
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
}

/**
 * Fallback component for unsupported activity types.
 * Displays a friendly message indicating the activity type is not yet supported.
 */
export function UnsupportedActivityTypeComponent(props: ActivityTypeComponentProps): ReactNode {
  const { activity, onRetry } = props;
  const registryEntry = activityTypeRegistry.get(activity.type);
  
  return (
    <div className="card p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-4xl">
        {registryEntry?.icon || '📝'}
      </div>
      <h2 className="text-xl font-display font-bold text-gray-900 mb-2">
        {registryEntry?.label || activity.type.replace(/_/g, ' ')}
      </h2>
      <p className="text-gray-600 mb-6">
        This activity type is not yet supported in the current version.
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Type: <code className="bg-gray-100 px-1 rounded">{activity.type}</code>
      </p>
      <button onClick={onRetry} className="btn btn-primary">
        Try Another Activity
      </button>
    </div>
  );
}

/**
 * Get registry entry for an activity type.
 */
export function getRegistryEntry(type: ActivityType): ActivityTypeRegistryEntry | undefined {
  return activityTypeRegistry.get(type);
}

/**
 * Create a registry entry with default values.
 */
export function createActivityTypeEntry(
  type: ActivityType,
  label: string,
  icon: string,
  color: string,
  component: ActivityTypeComponent,
  options: {
    supportsAudio?: boolean;
    supportsImages?: boolean;
    defaultConfig?: Record<string, unknown>;
  } = {}
): ActivityTypeRegistryEntry {
  return {
    type,
    label,
    icon,
    color,
    component,
    supportsAudio: options.supportsAudio ?? true,
    supportsImages: options.supportsImages ?? true,
    defaultConfig: options.defaultConfig ?? {},
  };
}

/**
 * Validate activity configuration for a given type.
 */
export function validateActivityConfig(
  type: ActivityType,
  config: Record<string, unknown> | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config) {
    return { valid: true, errors: [] };
  }

  // Type-specific validation can be added here
  switch (type) {
    case 'counting':
      if (typeof config.maxCount !== 'number' || config.maxCount < 1) {
        errors.push('counting activity requires maxCount number >= 1');
      }
      break;
    case 'sequencing':
      if (!Array.isArray(config.sequence) || config.sequence.length < 2) {
        errors.push('sequencing activity requires sequence array with at least 2 items');
      }
      break;
    case 'sorting':
      if (!Array.isArray(config.categories) || config.categories.length < 2) {
        errors.push('sorting activity requires categories array with at least 2 items');
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

// Import the registry instance (defined in ActivityTypeRegistry.tsx to avoid circular dependency)
import { activityTypeRegistry } from './ActivityTypeRegistry';

/**
 * Register activity types - called on module load.
 */
export function registerActivityTypes(): void {
  // This function is implemented in ActivityRenderer.tsx where components are available
  // to avoid circular dependencies
}