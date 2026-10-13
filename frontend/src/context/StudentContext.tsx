import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { studentApi, curriculumApi, type StudentProfile, type DashboardData, type Subject, type LessonListItem } from '@services/api';
import { useAuth } from '@hooks/useAuth';

interface StudentContextType {
  profile: StudentProfile | null;
  dashboard: DashboardData | null;
  lessons: LessonListItem[];
  subjects: Subject[];
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshLessons: () => Promise<void>;
  refreshSubjects: () => Promise<void>;
  changeLanguage: (language: string) => Promise<void>;
  toggleAudio: (enabled: boolean) => Promise<void>;
  toggleReducedMotion: (enabled: boolean) => Promise<void>;
  toggleHighContrast: (enabled: boolean) => Promise<void>;
}

const StudentContext = createContext<StudentContextType | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  // Track if initial load has completed to prevent re-initialization
  const initialLoadCompleted = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await studentApi.getMyProfile();
      if (isMounted.current) setProfile(response.data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const response = await studentApi.getDashboard();
      if (isMounted.current) setDashboard(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  }, []);

  const refreshLessons = useCallback(async () => {
    try {
      const response = await studentApi.getLessons();
      if (isMounted.current) setLessons(response.data);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
    }
  }, []);

  const refreshSubjects = useCallback(async () => {
    if (!profile?.current_stage_id) return;
    try {
      const response = await curriculumApi.getSubjects({ stage_id: profile.current_stage_id, active_only: true });
      if (isMounted.current) setSubjects(response.data);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  }, [profile?.current_stage_id]);

  const changeLanguage = async (language: string) => {
    try {
      await studentApi.updatePreferences({ preferred_language: language });
      await refreshProfile();
      await refreshDashboard();
      await refreshLessons();
    } catch (err) {
      console.error('Failed to change language:', err);
      throw err;
    }
  };

  const toggleAudio = async (enabled: boolean) => {
    try {
      await studentApi.updatePreferences({ audio_enabled: enabled });
      await refreshProfile();
    } catch (err) {
      console.error('Failed to toggle audio:', err);
      throw err;
    }
  };

  const toggleReducedMotion = async (enabled: boolean) => {
    try {
      await studentApi.updatePreferences({ reduced_motion: enabled });
      await refreshProfile();
    } catch (err) {
      console.error('Failed to toggle reduced motion:', err);
      throw err;
    }
  };

  const toggleHighContrast = async (enabled: boolean) => {
    try {
      await studentApi.updatePreferences({ high_contrast: enabled });
      await refreshProfile();
    } catch (err) {
      console.error('Failed to toggle high contrast:', err);
      throw err;
    }
  };

  // Load initial data when auth is ready and user is a student
  useEffect(() => {
    // Prevent re-initialization after initial load completes
    if (initialLoadCompleted.current) return;

    const loadInitialData = async () => {
      // Wait for auth to be ready
      if (authLoading) return;
      
      // Only load if authenticated as student
      if (!isAuthenticated || user?.role !== 'student') {
        if (isMounted.current) setLoading(false);
        initialLoadCompleted.current = true;
        return;
      }

      // Already loaded? Don't reload
      if (initialLoadCompleted.current) return;

      if (isMounted.current) setLoading(true);
      setError(null);
      try {
        await Promise.all([
          refreshProfile(),
          refreshDashboard(),
          refreshLessons(),
        ]);
        if (isMounted.current && profile?.current_stage_id) {
          await refreshSubjects();
        }
      } catch (err) {
        if (isMounted.current) {
          setError('Failed to load student data');
          console.error('Failed to load initial data:', err);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          initialLoadCompleted.current = true;
        }
      }
    };

    loadInitialData();
  }, [authLoading, isAuthenticated, user, refreshProfile, refreshDashboard, refreshLessons, refreshSubjects, profile?.current_stage_id]);

  // Refresh subjects when profile changes (but not during initial load)
  useEffect(() => {
    if (initialLoadCompleted.current && profile?.current_stage_id && subjects.length === 0) {
      refreshSubjects();
    }
  }, [profile?.current_stage_id, subjects.length, refreshSubjects]);

  return (
    <StudentContext.Provider value={{
      profile,
      dashboard,
      lessons,
      subjects,
      loading,
      error,
      refreshProfile,
      refreshDashboard,
      refreshLessons,
      refreshSubjects,
      changeLanguage,
      toggleAudio,
      toggleReducedMotion,
      toggleHighContrast,
    }}>
      {children}
    </StudentContext.Provider>
  );
}

 
// eslint-disable-next-line react-refresh/only-export-components
export function useStudent() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
}