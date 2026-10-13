import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { StudentProvider, useStudent } from '../context/StudentContext'
import StudentLayout from '../layouts/StudentLayout'

// Mock the auth hook
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    user: { id: 1, role: 'student' },
    isAuthenticated: true,
  }),
}))

// Mock the API calls
vi.mock('@services/api', () => ({
  studentApi: {
    getMyProfile: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        display_name: 'Test Student',
        current_stage_id: 1,
        current_stage_code: 'playgroup',
        current_stage_name: 'Playgroup',
        avatar_type: 'boy',
        preferred_language: 'en',
        audio_enabled: true,
        reduced_motion: false,
        high_contrast: false,
      },
    }),
    getDashboard: vi.fn().mockResolvedValue({ data: { continue_learning: [], next_lessons: [], rewards_preview: [], stats: {} } }),
    getLessons: vi.fn().mockResolvedValue({ data: [] }),
  },
  curriculumApi: {
    getSubjects: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

// Test component that uses useStudent to verify context is available
function TestComponent() {
  const { profile } = useStudent()
  return <div data-testid="profile-name">{profile?.display_name || 'loading'}</div>
}

describe('StudentProvider Integration', () => {
  it('StudentLayout renders without throwing useStudent error when wrapped in StudentProvider', async () => {
    const { container } = render(
      <BrowserRouter>
        <StudentProvider>
          <StudentLayout />
        </StudentProvider>
      </BrowserRouter>
    )

    // Should show loading state initially
    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  it('useStudent hook works correctly when StudentProvider wraps the component', async () => {
    render(
      <BrowserRouter>
        <StudentProvider>
          <TestComponent />
        </StudentProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('profile-name')).toHaveTextContent('Test Student')
    })
  })

  it('throws error when useStudent is used outside StudentProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(
        <BrowserRouter>
          <TestComponent />
        </BrowserRouter>
      )
    }).toThrow('useStudent must be used within a StudentProvider')

    consoleError.mockRestore()
  })

  it('StudentProvider context is accessible through nested components', async () => {
    function NestedComponent() {
      return <TestComponent />
    }

    render(
      <BrowserRouter>
        <StudentProvider>
          <div>
            <NestedComponent />
          </div>
        </StudentProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('profile-name')).toHaveTextContent('Test Student')
    })
  })
})