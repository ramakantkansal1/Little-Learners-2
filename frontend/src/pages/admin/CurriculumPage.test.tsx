/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CurriculumPage from './CurriculumPage';

// Mock the API service with default resolved values
vi.mock('@services/api', () => {
  const m: any = {
    adminApi: {
      getStages: vi.fn(),
      getSubjects: vi.fn(),
      getLessons: vi.fn(),
      getActivities: vi.fn(),
      createStage: vi.fn(),
      createSubject: vi.fn(),
      createLesson: vi.fn(),
      createActivity: vi.fn(),
      updateStage: vi.fn(),
      updateSubject: vi.fn(),
      updateLesson: vi.fn(),
      updateActivity: vi.fn(),
      deleteStage: vi.fn(),
      deleteSubject: vi.fn(),
      deleteActivity: vi.fn(),
      archiveLesson: vi.fn(),
      publishLesson: vi.fn(),
      unpublishLesson: vi.fn(),
      getActivityDifficultyTier: vi.fn(),
      updateActivityDifficultyTier: vi.fn(),
    },
    curriculumApi: {
      getSubjects: vi.fn(),
      getTopics: vi.fn(),
    },
  };
  const empty: any = { data: [], status: 200, statusText: 'OK', headers: {}, config: {} };
  m.adminApi.getStages.mockResolvedValue(empty);
  m.adminApi.getSubjects.mockResolvedValue(empty);
  m.adminApi.getLessons.mockResolvedValue(empty);
  m.adminApi.getActivities.mockResolvedValue(empty);
  m.curriculumApi.getSubjects.mockResolvedValue(empty);
  m.curriculumApi.getTopics.mockResolvedValue(empty);
  return m;
});

import {
  adminApi,
  curriculumApi,
} from '@services/api';

const renderPage = () =>
  render(
    <BrowserRouter>
      <CurriculumPage />
    </BrowserRouter>
  );

async function clickTab(label: string) {
  await waitFor(() => {
    expect(
      screen.getAllByRole('button').some((b) => b.textContent?.includes(label))
    ).toBe(true);
  });
  const tabs = screen.getAllByRole('button');
  const tab = tabs.find((t) => t.textContent?.includes(label));
  expect(tab).toBeDefined();
  fireEvent.click(tab!);
}

async function openAddModal() {
  await waitFor(() => {
    expect(
      screen.getAllByRole('button').some((b) =>
        b.textContent?.includes('Add Content')
      )
    ).toBe(true);
  });
  const addButtons = screen.getAllByRole('button', { name: /Add Content/i });
  fireEvent.click(addButtons[0]);
  await waitFor(() => {
    expect(screen.getByText(/Add New Content/)).toBeInTheDocument();
  });
}

async function submitForm() {
  await waitFor(() => {
    expect(document.querySelector('form')).not.toBeNull();
  });
  const form = document.querySelector('form')!;
  fireEvent.submit(form);
}

function resetApiMocks() {
  const empty: any = { data: [], status: 200, statusText: 'OK', headers: {}, config: {} };
  vi.mocked(adminApi.getStages).mockResolvedValue(empty);
  vi.mocked(adminApi.getSubjects).mockResolvedValue(empty);
  vi.mocked(adminApi.getLessons).mockResolvedValue(empty);
  vi.mocked(adminApi.getActivities).mockResolvedValue(empty);
  vi.mocked(curriculumApi.getSubjects).mockResolvedValue(empty);
  vi.mocked(curriculumApi.getTopics).mockResolvedValue(empty);
  // Reset mutating endpoints to a neutral resolved value so
  // per-test mockRejectedValue/mockResolvedValue overrides do not leak.
  vi.mocked(adminApi.createStage).mockResolvedValue(empty);
  vi.mocked(adminApi.createSubject).mockResolvedValue(empty);
  vi.mocked(adminApi.createLesson).mockResolvedValue(empty);
  vi.mocked(adminApi.createActivity).mockResolvedValue(empty);
  vi.mocked(adminApi.updateStage).mockResolvedValue(empty);
  vi.mocked(adminApi.updateSubject).mockResolvedValue(empty);
  vi.mocked(adminApi.updateLesson).mockResolvedValue(empty);
  vi.mocked(adminApi.updateActivity).mockResolvedValue(empty);
  vi.mocked(adminApi.deleteStage).mockResolvedValue(empty);
  vi.mocked(adminApi.deleteSubject).mockResolvedValue(empty);
  vi.mocked(adminApi.deleteActivity).mockResolvedValue(empty);
  vi.mocked(adminApi.archiveLesson).mockResolvedValue(empty);
  vi.mocked(adminApi.publishLesson).mockResolvedValue(empty);
  vi.mocked(adminApi.unpublishLesson).mockResolvedValue(empty);
  vi.mocked(adminApi.getActivityDifficultyTier).mockResolvedValue(empty);
  vi.mocked(adminApi.updateActivityDifficultyTier).mockResolvedValue(empty);
}

describe('CurriculumPage — Form Validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetApiMocks();
  });

  it('shows validation error when creating a lesson without required fields', async () => {
    renderPage();

    await clickTab('Lessons');

    await openAddModal();

    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows validation error when creating an activity without required fields', async () => {
    renderPage();

    await clickTab('Activities');

    await openAddModal();

    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid activity configuration', async () => {
    renderPage();

    await clickTab('Activities');

    await openAddModal();

    const typeSelect = document.querySelectorAll('select')[1];
    expect(typeSelect).toBeDefined();
    fireEvent.change(typeSelect!, { target: { value: 'counting' } });

    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('CurriculumPage — Modal Open/Close', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetApiMocks();
  });

  it('opens the Add Content modal when clicking Add Content button', async () => {
    renderPage();

    expect(screen.queryByText(/Add New Content/)).not.toBeInTheDocument();

    await openAddModal();
  });

  it('closes the Add Content modal when clicking the X button', async () => {
    renderPage();

    await openAddModal();

    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(
      (b) => !b.textContent?.trim() && b.querySelector('svg')
    );
    expect(closeButton).toBeDefined();

    fireEvent.click(closeButton!);

    expect(screen.queryByText(/Add New Content/)).not.toBeInTheDocument();
  });
});

describe('CurriculumPage — API Error Handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetApiMocks();
  });

  it('displays error message when lesson creation API fails', async () => {
    const errorMsg = 'Server error: unable to create lesson';
    vi.mocked(adminApi.createLesson).mockRejectedValue({
      response: {
        data: { error: { message: errorMsg } },
      },
    });

    renderPage();

    await clickTab('Lessons');

    await openAddModal();

    // Fill required fields so validation passes, then API error should surface
    const topicSelect = document.querySelectorAll('select')[0];
    fireEvent.change(topicSelect!, { target: { value: '1' } });
    const codeInput = document.querySelector('input[placeholder="e.g., lesson_1"]');
    fireEvent.change(codeInput!, { target: { value: 'LESSON-001' } });

    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('displays error message when stage creation API fails', async () => {
    const errorMsg = 'Stage code already exists';
    vi.mocked(adminApi.createStage).mockRejectedValue({
      response: {
        data: { error: { message: errorMsg } },
      },
    });

    renderPage();

    await clickTab('Stages');

    await openAddModal();

    const codeInput = document.querySelector('input[placeholder="e.g., playgroup"]');
    fireEvent.change(codeInput!, { target: { value: 'dup-stage' } });
    const nameInput = document.querySelector('input[placeholder="e.g., Playgroup / Pre-Nursery"]');
    fireEvent.change(nameInput!, { target: { value: 'Duplicate Stage' } });

    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('handles publish validation errors from API', async () => {
    const draftLesson: any = {
      id: 1,
      code: 'draft-001',
      title: 'Draft Lesson',
      subject_name: 'Test Subject',
      stage_code: 'playgroup',
      status: 'draft',
      estimated_duration_minutes: 10,
      display_order: 0,
      published_at: null,
      activity_count: 0,
    };

    const validationErrors: any[] = [
      { field: 'activities', message: 'Lesson must have at least one activity', code: 'VALIDATION_ERROR' },
    ];

    vi.mocked(adminApi.getLessons).mockResolvedValue({
      data: [draftLesson],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    } as any);

    vi.mocked(adminApi.publishLesson).mockResolvedValue({
      data: { valid: false, errors: validationErrors, warnings: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    } as any);

    renderPage();

    await clickTab('Lessons');

    await waitFor(() => {
      expect(screen.getByText('Draft Lesson')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle(/Validate and publish/i));

    await waitFor(() => {
      expect(screen.getByText(/Validation failed/)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/at least one activity/)).toBeInTheDocument();
    });
  });
});
