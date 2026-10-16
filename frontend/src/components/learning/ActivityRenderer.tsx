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

// Re-export registry and utilities from dedicated modules
export {
  activityTypeRegistry,
  getRegistryEntry,
  createActivityTypeEntry,
  validateActivityConfig,
  UnsupportedActivityTypeComponent,
  registerActivityTypes,
} from './ActivityTypeRegistry';
export type { ActivityTypeRegistryEntry, ActivityTypeComponent, ActivityTypeComponentProps } from './ActivityTypeRegistry';

// Auto-register on module load
registerActivityTypes();