import type { ReactNode } from "react";
import { ActivityType } from "@/types";
import type { ActivityTypeComponentProps } from "./ActivityTypeRegistry.types";
import {
  activityTypeRegistry,
  createActivityTypeEntry,
} from "./ActivityTypeRegistry";
import { UnsupportedActivityTypeComponent } from "./ActivityTypeRegistry.tsx";
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
} from "./activity-types";

export type { ActivityType };
export type { ActivityTypeComponentProps } from "./ActivityTypeRegistry.types";
export type { ActivityTypeRegistryEntry } from "./ActivityTypeRegistry.types";

/**
 * Register all activity type components with the registry.
 * Called on module load to populate the activity type dispatcher.
 */
function registerActivityTypes(): void {
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "image_selection",
      "Image Selection",
      "🖼️",
      "#FFB3BA",
      ImageSelectionActivity,
      { supportsAudio: true, supportsImages: true },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "color_identification",
      "Color Identification",
      "🎨",
      "#BAFFC9",
      ColorIdentificationActivity,
      { supportsAudio: true, supportsImages: true },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "shape_matching",
      "Shape Matching",
      "🔷",
      "#BAE1FF",
      ShapeMatchingActivity,
      { supportsAudio: true, supportsImages: true },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "picture_matching",
      "Picture Matching",
      "🖼️",
      "#FFFFBA",
      PictureMatchingActivity,
      { supportsAudio: true, supportsImages: true },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "alphabet_recognition",
      "Alphabet Recognition",
      "🔤",
      "#FFB3BA",
      AlphabetRecognitionActivity,
      { supportsAudio: true, supportsImages: false },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "letter_sound",
      "Letter Sound",
      "🔊",
      "#BAFFC9",
      LetterSoundActivity,
      { supportsAudio: true, supportsImages: false },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "number_recognition",
      "Number Recognition",
      "🔢",
      "#BAE1FF",
      NumberRecognitionActivity,
      { supportsAudio: true, supportsImages: false },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "counting",
      "Counting",
      "🐘",
      "#FFFFBA",
      CountingActivity,
      { supportsAudio: true, supportsImages: true },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "sorting",
      "Sorting",
      "📦",
      "#FFB3BA",
      SortingActivity,
      { supportsAudio: false, supportsImages: true },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "sequencing",
      "Sequencing",
      "🔢",
      "#BAFFC9",
      SequencingActivity,
      { supportsAudio: false, supportsImages: true },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "tracing",
      "Tracing",
      "✏️",
      "#BAE1FF",
      TracingActivity,
      { supportsAudio: false, supportsImages: false },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "story_listening",
      "Story Listening",
      "📖",
      "#FFFFBA",
      StoryListeningActivity,
      { supportsAudio: true, supportsImages: false },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "simple_quiz",
      "Simple Quiz",
      "❓",
      "#FFB3BA",
      SimpleQuizActivity,
      { supportsAudio: true, supportsImages: true },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "audio_identification",
      "Audio Identification",
      "🔊",
      "#BAFFC9",
      AudioIdentificationActivity,
      { supportsAudio: true, supportsImages: false },
    ),
  );
  activityTypeRegistry.register(
    createActivityTypeEntry(
      "picture_comprehension",
      "Picture Comprehension",
      "🖼️",
      "#BAE1FF",
      PictureComprehensionActivity,
      { supportsAudio: true, supportsImages: true },
    ),
  );
}

/**
 * ActivityRenderer component.
 * Dispatches to the correct activity type component based on the activity's type.
 */
export function ActivityRenderer(props: ActivityTypeComponentProps): ReactNode {
  const ActivityComponent = activityTypeRegistry.getComponent(
    props.activity.type,
  );

  if (!ActivityComponent) {
    return <UnsupportedActivityTypeComponent {...props} />;
  }

  return <ActivityComponent {...props} />;
}

// Auto-register on module load
registerActivityTypes();
