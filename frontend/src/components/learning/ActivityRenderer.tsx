import { ReactNode } from 'react';
import { ActivityType } from '@/types';

export type { ActivityType };
import {
  ImageSelectionActivity,
  SimpleQuizActivity,
  PictureMatchingActivity,
  ColorIdentificationActivity,
  ShapeMatchingActivity,
  CountingActivity,
  AlphabetRecognitionActivity,
  NumberRecognitionActivity,
  LetterSoundActivity,
  SortingActivity,
  SequencingActivity,
  TracingActivity,
  StoryListeningActivity,
  AudioIdentificationActivity,
  PictureComprehensionActivity,
} from './activity-types';

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
 * Type for activity type component.
 * Each activity type component receives the same props interface.
 */
export type ActivityTypeComponent = (props: ActivityTypeComponentProps) => ReactNode;

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
 * Activity Type Registry - maps activity types to their rendering components.
 * This allows adding new activity types without modifying the main ActivityPage.
 */
class ActivityTypeRegistry {
  private entries: Map<ActivityType, ActivityTypeRegistryEntry> = new Map();

  /**
   * Register a new activity type component.
   */
  register(entry: ActivityTypeRegistryEntry): void {
    this.entries.set(entry.type, entry);
  }

  /**
   * Get the registry entry for an activity type.
   * Returns undefined if the type is not registered.
   */
  get(type: ActivityType): ActivityTypeRegistryEntry | undefined {
    return this.entries.get(type);
  }

  /**
   * Get the component for an activity type.
   * Returns a fallback component if the type is not registered.
   */
  getComponent(type: ActivityType): ActivityTypeComponent {
    const entry = this.entries.get(type);
    if (entry) {
      return entry.component;
    }
    // Return fallback component for unsupported types
    return UnsupportedActivityTypeComponent;
  }

  /**
   * Get the label for an activity type.
   */
  getLabel(type: ActivityType): string {
    const entry = this.entries.get(type);
    return entry?.label || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get the icon for an activity type.
   */
  getIcon(type: ActivityType): string {
    const entry = this.entries.get(type);
    return entry?.icon || '📝';
  }

  /**
   * Get the color theme for an activity type.
   */
  getColor(type: ActivityType): string {
    const entry = this.entries.get(type);
    return entry?.color || 'bg-gray-100 text-gray-700';
  }

  /**
   * Check if an activity type is registered.
   */
  has(type: ActivityType): boolean {
    return this.entries.has(type);
  }

  /**
   * Get all registered activity types.
   */
  getAllTypes(): ActivityType[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Get all registry entries.
   */
  getAllEntries(): ActivityTypeRegistryEntry[] {
    return Array.from(this.entries.values());
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export const activityTypeRegistry = new ActivityTypeRegistry();

/**
 * Get registry entry for an activity type.
 */
export function getRegistryEntry(type: ActivityType): ActivityTypeRegistryEntry | undefined {
  return activityTypeRegistry.get(type);
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

// eslint-disable-next-line react-refresh/only-export-components
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

// eslint-disable-next-line react-refresh/only-export-components
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

// eslint-disable-next-line react-refresh/only-export-components
export function registerActivityTypes(): void {
  // Image Selection - for image_selection, alphabet_recognition, number_recognition
  activityTypeRegistry.register({
    type: 'image_selection',
    label: 'Image Selection',
    icon: '🖼️',
    color: 'bg-blue-100 text-blue-700',
    component: ImageSelectionActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: { promptEmoji: '🔍' },
  });

  // Simple Quiz - for simple_quiz, picture_comprehension
  activityTypeRegistry.register({
    type: 'simple_quiz',
    label: 'Quiz',
    icon: '❓',
    color: 'bg-green-100 text-green-700',
    component: SimpleQuizActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Picture Matching - for picture_matching, shape_matching, color_identification
  activityTypeRegistry.register({
    type: 'picture_matching',
    label: 'Picture Matching',
    icon: '🔗',
    color: 'bg-purple-100 text-purple-700',
    component: PictureMatchingActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: { matchType: 'exact' },
  });

  // Color Identification
  activityTypeRegistry.register({
    type: 'color_identification',
    label: 'Color Identification',
    icon: '🎨',
    color: 'bg-yellow-100 text-yellow-700',
    component: ColorIdentificationActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Shape Matching
  activityTypeRegistry.register({
    type: 'shape_matching',
    label: 'Shape Matching',
    icon: '🔷',
    color: 'bg-purple-100 text-purple-700',
    component: ShapeMatchingActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Counting
  activityTypeRegistry.register({
    type: 'counting',
    label: 'Counting',
    icon: '🔢',
    color: 'bg-blue-100 text-blue-700',
    component: CountingActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Alphabet Recognition
  activityTypeRegistry.register({
    type: 'alphabet_recognition',
    label: 'Alphabet Recognition',
    icon: '🔤',
    color: 'bg-purple-100 text-purple-700',
    component: AlphabetRecognitionActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Number Recognition
  activityTypeRegistry.register({
    type: 'number_recognition',
    label: 'Number Recognition',
    icon: '🔢',
    color: 'bg-green-100 text-green-700',
    component: NumberRecognitionActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Letter Sound
  activityTypeRegistry.register({
    type: 'letter_sound',
    label: 'Letter Sound',
    icon: '🔊',
    color: 'bg-purple-100 text-purple-700',
    component: LetterSoundActivity,
    supportsAudio: true,
    supportsImages: false,
    defaultConfig: {},
  });

  // Sorting
  activityTypeRegistry.register({
    type: 'sorting',
    label: 'Sorting',
    icon: '📦',
    color: 'bg-green-100 text-green-700',
    component: SortingActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Sequencing
  activityTypeRegistry.register({
    type: 'sequencing',
    label: 'Sequencing',
    icon: '🔄',
    color: 'bg-purple-100 text-purple-700',
    component: SequencingActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Tracing
  activityTypeRegistry.register({
    type: 'tracing',
    label: 'Tracing',
    icon: '✏️',
    color: 'bg-blue-100 text-blue-700',
    component: TracingActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Story Listening
  activityTypeRegistry.register({
    type: 'story_listening',
    label: 'Story Listening',
    icon: '📖',
    color: 'bg-pink-100 text-pink-700',
    component: StoryListeningActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Audio Identification
  activityTypeRegistry.register({
    type: 'audio_identification',
    label: 'Audio Identification',
    icon: '👂',
    color: 'bg-blue-100 text-blue-700',
    component: AudioIdentificationActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });

  // Picture Comprehension
  activityTypeRegistry.register({
    type: 'picture_comprehension',
    label: 'Picture Comprehension',
    icon: '🖼️',
    color: 'bg-purple-100 text-purple-700',
    component: PictureComprehensionActivity,
    supportsAudio: true,
    supportsImages: true,
    defaultConfig: {},
  });
}

// Auto-register on module load
registerActivityTypes();