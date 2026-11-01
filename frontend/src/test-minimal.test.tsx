import { describe, it, expect } from "vitest";

describe("test-minimal", () => {
  it("works", () => {
    const mockResponseData = {
      attempt_id: 1,
      activity: {
        id: 1,
        code: "activity-001",
        type: "picture_matching",
        title: "Match the Pictures",
        instructions: "Find the matching picture",
        estimated_duration_minutes: 5,
        configuration: null,
        questions: [
          {
            id: 1,
            question_type: "single_choice",
            prompt: "Which picture matches?",
            prompt_audio_url: null,
            display_order: 1,
            points: 10,
            configuration: null,
            options: [
              {
                id: 1,
                text: "Option A",
                text_audio_url: null,
                image_url: null,
                display_order: 1,
                is_correct: true,
              },
              {
                id: 2,
                text: "Option B",
                text_audio_url: null,
                image_url: null,
                display_order: 2,
                is_correct: false,
              },
            ],
          },
        ],
        saved_progress: null,
        lesson_progress: null,
      },
    };

    expect(mockResponseData).toBeDefined();
  });
});
