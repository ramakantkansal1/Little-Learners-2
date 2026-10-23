import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityRenderer } from './ActivityRenderer';
import { activityTypeRegistry } from './ActivityTypeRegistry';
import type { ActivityType } from '@/types';
import type { ActivityTypeComponentProps, ActivityTypeRegistryEntry } from './ActivityTypeRegistry.types';

const SUPPORTED_TYPES: ActivityType[] = [
  'image_selection',
  'color_identification',
  'shape_matching',
  'picture_matching',
  'alphabet_recognition',
  'letter_sound',
  'number_recognition',
  'counting',
  'sorting',
  'sequencing',
  'tracing',
  'story_listening',
  'simple_quiz',
  'audio_identification',
  'picture_comprehension',
];

function makeProps(type: ActivityType): ActivityTypeComponentProps {
  return {
    activity: {
      id: 1,
      type,
      code: `${type}-001`,
      title: `Title for ${type}`,
      instructions: null,
      estimated_duration_minutes: null,
      configuration: null,
      questions: [
        {
          id: 1,
          question_type: type,
          prompt: 'Prompt',
          prompt_audio_url: null,
          display_order: 1,
          points: 1,
          configuration: null,
          options: [
            { id: 10, text: 'Option 1', text_audio_url: null, image_url: null, display_order: 1 },
          ],
        },
      ],
    },
    currentQuestion: 0,
    totalQuestions: 1,
    selectedAnswer: null,
    showFeedback: false,
    isCorrect: false,
    correctOptionIds: [],
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
}

describe('ActivityRenderer registry', () => {
  it('registers all 15 supported activity types', () => {
    const entries = activityTypeRegistry.getAllEntries();
    const registered = new Set(entries.map((e: ActivityTypeRegistryEntry) => e.type));
    for (const type of SUPPORTED_TYPES) {
      expect(registered.has(type), `missing registration for ${type}`).toBe(true);
    }
    expect(entries.length).toBeGreaterThanOrEqual(15);
  });

  it('dispatches each supported type to its intended component', () => {
    for (const type of SUPPORTED_TYPES) {
      const expected = activityTypeRegistry.getComponent(type);
      expect(expected, `no component registered for ${type}`).toBeDefined();
      const { unmount } = render(<ActivityRenderer {...makeProps(type)} />);
      // Supported types must not render the unsupported-type fallback.
      expect(
        screen.queryByText('This activity type is not yet supported in the current version.')
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it('exposes registered entries for the admin activity-type selector', () => {
    const entries = activityTypeRegistry.getAllEntries();
    expect(entries.length).toBeGreaterThanOrEqual(15);
    for (const entry of entries) {
      expect(entry.type).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.component).toBeDefined();
    }
  });
});
