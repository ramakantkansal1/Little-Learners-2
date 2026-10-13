import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '@hooks/useAuth';

// Use relative URL to go through Vite proxy in development
// In production, VITE_API_URL should be set to the full API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Generate or retrieve a unique client ID stored in localStorage
function getClientId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let clientId = localStorage.getItem('client_id');
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem('client_id', clientId);
  }
  return clientId;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// CSRF token management - fetch from endpoint instead of cookie since cookies are on different port
let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  
  try {
    const response = await api.get<{ csrf_token: string }>('/auth/csrf-token');
    csrfToken = response.data.csrf_token;
    return csrfToken;
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err);
    return null;
  }
}

// Request interceptor to add CSRF token and client ID
// Note: Backend uses cookies for authentication (withCredentials: true), so we don't send Authorization header
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add client ID for rate limiting (helps in Docker environments)
    const clientId = getClientId();
    if (clientId && config.headers) {
      config.headers['X-Client-ID'] = clientId;
    }
    
    // Add CSRF token for state-changing methods
    const csrfMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (config.method && csrfMethods.includes(config.method.toUpperCase())) {
      const token = await ensureCsrfToken();
      if (token && config.headers) {
        config.headers['X-CSRF-Token'] = token;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Track if a token refresh is already in progress to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

function subscribeTokenRefresh(cb: () => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed() {
  refreshSubscribers.forEach(cb => cb());
  refreshSubscribers = [];
}

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const requestUrl = originalRequest.url || '';

    // Do not retry on 403 (forbidden) or 429 (rate limited) - these are not auth issues
    if (status === 403 || status === 429) {
      // Clear CSRF token on 403/429 as it may be invalid
      if (status === 403) {
        csrfToken = null;
      }
      return Promise.reject(error);
    }

    // Skip token refresh for login endpoints - they should return 401 for invalid credentials
    const isLoginEndpoint = requestUrl.includes('/auth/') && 
      (requestUrl.includes('/student/login') || requestUrl.includes('/parent/login') || requestUrl.includes('/parent/register'));

    // Handle 401 Unauthorized with token refresh (skip for login endpoints)
    if (status === 401 && !originalRequest._retry && !isLoginEndpoint) {
      originalRequest._retry = true;

      // If already refreshing, wait for the refresh to complete
      if (isRefreshing) {
        try {
          await new Promise<void>((resolve) => {
            subscribeTokenRefresh(resolve);
          });
          // Retry with new token (cookies are automatically sent with withCredentials)
          return api(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      // Start refresh process
      isRefreshing = true;

      try {
        const { refreshAccessToken } = useAuth.getState();
        const success = await refreshAccessToken();

        if (success) {
          onTokenRefreshed();
          // Backend uses cookies, so just retry the request
          return api(originalRequest);
        } else {
          onTokenRefreshed();
          useAuth.getState().clearAuth();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/parent/login';
          }
        }
      } catch (refreshError) {
        onTokenRefreshed();
        useAuth.getState().clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/parent/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API response types
export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Array<{
      field: string;
      message: string;
      type: string;
    }>;
  };
}

// Helper to extract data from response
export const extractData = <T>(response: { data: T }): T => {
  return response.data;
};

// Helper to handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.error?.message) {
      return apiError.error.message;
    }
    return error.message;
  }
  return 'An unexpected error occurred';
};

// ===========================================
// Curriculum API
// ===========================================

export interface Stage {
  id: number;
  code: string;
  name: string;
  description: string | null;
  min_age_months: number;
  max_age_months: number;
  display_order: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface Domain {
  id: number;
  stage_id: number;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface Subject {
  id: number;
  stage_id: number;
  domain_id: number;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface Topic {
  id: number;
  subject_id: number;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  estimated_duration_minutes: number | null;
  is_active: boolean;
}

export interface Lesson {
  id: number;
  topic_id: number;
  code: string;
  name: string;
  description: string | null;
  estimated_duration_minutes: number | null;
  is_active: boolean;
}

export interface Activity {
  id: number;
  lesson_id: number;
  type: string;
  code: string;
  status: string;
  version: number;
  display_order: number;
  estimated_duration_minutes: number | null;
  instructions: string | null;
  configuration: Record<string, unknown> | null;
  is_active: boolean;
  title?: string;
  translated_instructions?: string;
}

export const curriculumApi = {
  getStages: (activeOnly = true) => 
    api.get<Stage[]>('/curriculum/stages', { params: { active_only: activeOnly } }),
  
  getStage: (stageId: number) => 
    api.get<Stage>(`/curriculum/stages/${stageId}`),
  
  getDomainsForStage: (stageId: number, activeOnly = true) => 
    api.get<Domain[]>(`/curriculum/stages/${stageId}/domains`, { params: { active_only: activeOnly } }),
  
  getSubjects: (params?: { stage_id?: number; domain_id?: number; active_only?: boolean }) => 
    api.get<Subject[]>('/curriculum/subjects', { params }),
  
  getTopics: (params?: { subject_id?: number; active_only?: boolean }) => 
    api.get<Topic[]>('/curriculum/topics', { params }),
  
  getLessons: (params?: { 
    stage_id?: number; 
    subject_id?: number; 
    topic_id?: number; 
    status?: string; 
    language?: string;
    active_only?: boolean;
    limit?: number;
    offset?: number;
  }) => 
    api.get<Lesson[]>('/curriculum/lessons', { params }),
  
  getLesson: (lessonId: number, language = 'en') => 
    api.get<Lesson>(`/curriculum/lessons/${lessonId}`, { params: { language } }),
  
  getLessonActivities: (lessonId: number, language = 'en', activeOnly = true) => 
    api.get<Activity[]>(`/curriculum/lessons/${lessonId}/activities`, { params: { language, active_only: activeOnly } }),
  
  getActivities: (params?: {
    lesson_id?: number;
    activity_type?: string;
    status?: string;
    language?: string;
    active_only?: boolean;
  }) => 
    api.get<Activity[]>('/curriculum/activities', { params }),
  
  getActivity: (activityId: number, language = 'en') => 
    api.get<Activity>(`/curriculum/activities/${activityId}`, { params: { language } }),
};

// ===========================================
// Parent API
// ===========================================

export interface Child {
  id: number;
  display_name: string;
  date_of_birth: string | null;
  gender: string | null;
  avatar_type: string | null;
  current_stage_id: number | null;
  current_stage_code: string | null;
  current_stage_name: string | null;
  preferred_language: string;
  audio_enabled: boolean;
  reduced_motion: boolean;
  high_contrast: boolean;
  is_active: boolean;
  progress_percentage: number;
  last_activity_at: string | null;
  username: string;
}

export interface ParentProfile {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  phone_verified: boolean;
  children: Child[];
}

export interface ChildCreateRequest {
  display_name: string;
  date_of_birth?: string;
  gender?: string;
  avatar_type?: string;
  current_stage_id?: number;
  preferred_language?: string;
  pin?: string;
}

export interface ChildUpdateRequest {
  display_name?: string;
  date_of_birth?: string;
  gender?: string;
  avatar_type?: string;
  current_stage_id?: number | null;
  preferred_language?: string;
  is_active?: boolean;
  pin?: string;
}

export interface ChildProgress {
  child_id: number;
  child_name: string;
  stage_code: string;
  stage_name: string;
  total_lessons: number;
  completed_lessons: number;
  in_progress_lessons: number;
  total_activities: number;
  completed_activities: number;
  total_time_spent_minutes: number;
  average_score: number | null;
  completion_rate: number;
  recent_activity: Array<{
    lesson: string;
    activity: string;
    completed_at: string | null;
    score: number | null;
    time_spent: number;
  }>;
}

export const parentApi = {
  getMyProfile: () => 
    api.get<ParentProfile>('/parents/me'),
  
  getChildren: () => 
    api.get<Child[]>('/parents/me/children'),
  
  createChild: (data: ChildCreateRequest) => 
    api.post<Child>('/parents/me/children', data),
  
  getChild: (childId: number) => 
    api.get<Child>(`/parents/me/children/${childId}`),
  
  updateChild: (childId: number, data: ChildUpdateRequest) => 
    api.patch<Child>(`/parents/me/children/${childId}`, data),
  
  deactivateChild: (childId: number) => 
    api.delete(`/parents/me/children/${childId}`),
  
  getChildProgress: (childId: number) => 
    api.get(`/parents/me/children/${childId}/progress`),
  
  getChildRewards: (childId: number) => 
    api.get(`/parents/me/children/${childId}/rewards`),
};

// ===========================================
// Student API
// ===========================================

export interface StudentProfile {
  id: number;
  display_name: string;
  date_of_birth: string | null;
  gender: string | null;
  avatar_type: string | null;
  current_stage_id: number | null;
  current_stage_code: string | null;
  current_stage_name: string | null;
  preferred_language: string;
  audio_enabled: boolean;
  audio_volume: number;
  narration_speed: number;
  reduced_motion: boolean;
  high_contrast: boolean;
  is_active: boolean;
}

export interface DashboardData {
  continue_learning: Array<{
    lesson_id: number;
    title: string;
    progress: number;
    last_activity: string | null;
  }>;
  next_lessons: Array<{
    lesson_id: number;
    title: string;
    locked: boolean;
  }>;
  rewards_preview: Array<{
    id: number;
    name: string;
    reward_type: string;
    image_url: string | null;
    earned: boolean;
  }>;
  stats: {
    lessons_completed: number;
    rewards_earned: number;
    time_this_week: string;
    current_streak: number;
  };
}

export interface LessonListItem {
  id: number;
  code: string;
  title: string;
  description: string | null;
  subject_name: string;
  subject_code: string;
  stage_code: string;
  status: string;
  estimated_duration_minutes: number | null;
  thumbnail_url: string | null;
  display_order: number;
  progress?: {
    status: string;
    completion_percentage: number;
    time_spent_seconds: number;
  };
}

export interface ActivityDetail {
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
      correct_option_id?: number;
    }>;
  }>;
}

export interface QuestionContent {
  id: number;
  question_type: string;
  prompt: string;
  prompt_audio_url: string | null;
  display_order: number;
  points: number;
  configuration: Record<string, unknown> | null;
  options: OptionContent[];
}

export interface OptionContent {
  id: number;
  text: string;
  text_audio_url: string | null;
  image_url: string | null;
  display_order: number;
  is_correct?: boolean;
  correct_option_id?: number;
}

export interface AttemptStartResponse {
  attempt_id: number;
  activity: ActivityDetail;
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
    }>;
  }>;
}

export interface AnswerSubmitResponse {
  is_correct: boolean;
  points_earned: number;
  correct_options: number[];
}

export interface AttemptCompleteResponse {
  score: number;
  passed: boolean;
  rewards_earned: Array<{
    name: string;
    type: string;
    image_url: string | null;
  }>;
  next_activity_id: number | null;
}

export interface Reward {
  id: number;
  code: string;
  name: string;
  description: string | null;
  reward_type: string;
  image_url: string | null;
  points_value: number;
  earned: boolean;
  earned_at: string | null;
}

export interface HistoryItem {
  id: number;
  lesson_id: number;
  lesson_title: string;
  activity_id: number | null;
  activity_title: string | null;
  status: string;
  score: number | null;
  completed_at: string | null;
  time_spent_seconds: number;
}

export const studentApi = {
  getMyProfile: () => 
    api.get<StudentProfile>('/students/me'),
  
  getDashboard: () => 
    api.get<DashboardData>('/students/me/dashboard'),
  
  getLessons: (params?: { stage_id?: number; subject_id?: number }) => 
    api.get<LessonListItem[]>('/students/me/lessons', { params }),
  
  getLessonContent: (lessonId: number) => 
    api.get(`/students/me/learn/${lessonId}`),
  
  startActivityAttempt: (activityId: number) => 
    api.post<AttemptStartResponse>(`/students/me/activities/${activityId}/attempts`),
  
  getActivityAttempt: (attemptId: number) => 
    api.get<AttemptStartResponse>(`/students/me/attempts/${attemptId}`),
  
  submitAnswer: (attemptId: number, questionId: number, selectedOptionIds: number[]) => 
    api.post<AnswerSubmitResponse>(`/attempts/${attemptId}/responses`, { 
      question_id: questionId, 
      selected_option_ids: selectedOptionIds 
    }),
  
  completeAttempt: (attemptId: number) => 
    api.post<AttemptCompleteResponse>(`/attempts/${attemptId}/complete`),
  
  getRewards: () => 
    api.get<Reward[]>('/students/me/rewards'),
  
  getHistory: () => 
    api.get<HistoryItem[]>('/students/me/history'),
  
  updatePreferences: (prefs: Record<string, unknown>) => 
    api.patch('/students/me/preferences', prefs),
};

// ===========================================
// Progress API
// ===========================================

export interface Enrollment {
  id: number;
  student_id: number;
  stage_id: number;
  stage_code: string | null;
  stage_name: string | null;
  subject_id: number | null;
  subject_name: string | null;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
}

export interface LessonProgress {
  id: number;
  student_id: number;
  lesson_id: number;
  lesson_title: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  time_spent_seconds: number;
  completion_percentage: number;
}

export interface ActivityAttempt {
  id: number;
  student_id: number;
  activity_id: number;
  activity_title: string | null;
  lesson_id: number;
  lesson_title: string | null;
  attempt_number: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number;
  score: number | null;
  max_score: number;
  passed: boolean | null;
}

export const progressApi = {
  getStudentEnrollments: (studentId: number) => 
    api.get<Enrollment[]>(`/progress/students/${studentId}/enrollments`),
  
  createEnrollment: (studentId: number, stageId: number, subjectId?: number) => 
    api.post<Enrollment>(`/progress/students/${studentId}/enrollments`, null, { 
      params: { stage_id: stageId, subject_id: subjectId } 
    }),
  
  getLessonProgress: (studentId: number) => 
    api.get<LessonProgress[]>(`/progress/students/${studentId}/lessons`),
  
  getActivityAttempts: (studentId: number, lessonId?: number) => 
    api.get<ActivityAttempt[]>(`/progress/students/${studentId}/activities`, { 
      params: { lesson_id: lessonId } 
    }),
  
  getChildProgressSummary: (childId: number) => 
    api.get(`/progress/parents/me/children/${childId}/summary`),
};

// ===========================================
// Admin API
// ===========================================

export interface AdminDashboardMetrics {
  total_parents: number;
  total_children: number;
  active_accounts: number;
  published_lessons: number;
  total_activities: number;
  activities_completed: number;
  content_pending_review: number;
  recent_registrations: number;
}

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  parent_name: string | null;
  children_count: number;
}

export interface AdminStage {
  id: number;
  code: string;
  name: string;
  description: string | null;
  min_age_months: number;
  max_age_months: number;
  display_order: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface AdminLesson {
  id: number;
  code: string;
  title: string;
  subject_name: string;
  stage_code: string;
  status: string;
  estimated_duration_minutes: number | null;
  display_order: number;
  published_at: string | null;
}

export interface AdminActivity {
  id: number;
  code: string;
  type: string;
  title: string;
  lesson_title: string;
  status: string;
  display_order: number;
}

export interface AnalyticsData {
  registrations_by_day: Array<{ date: string; count: number }>;
  lessons_completed_by_day: Array<{ date: string; count: number }>;
  active_users_by_day: Array<{ date: string; count: number }>;
  popular_activities: Array<{ activity_code: string; type: string; attempts: number }>;
  average_session_time: number;
  completion_rates_by_stage: Array<{
    stage_code: string;
    stage_name: string;
    completed: number;
    total: number;
    rate: number;
  }>;
}

export interface AuditLog {
  id: number;
  created_at: string;
  user_id: number | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  success: boolean;
  error_message: string | null;
}

export const adminApi = {
  getDashboard: () => 
    api.get<AdminDashboardMetrics>('/admin/dashboard'),
  
  getUsers: (params?: { 
    role?: string; 
    is_active?: boolean; 
    search?: string; 
    limit?: number; 
    offset?: number; 
  }) => 
    api.get<AdminUser[]>('/admin/users', { params }),
  
  updateUser: (userId: number, data: { is_active?: boolean; role?: string }) => 
    api.patch(`/admin/users/${userId}`, data),
  
  getStages: () => 
    api.get<AdminStage[]>('/admin/stages'),
  
  createStage: (data: {
    code: string;
    name: string;
    description?: string;
    min_age_months: number;
    max_age_months: number;
    display_order?: number;
    icon?: string;
    color?: string;
    is_active?: boolean;
  }) => 
    api.post<AdminStage>('/admin/stages', data),
  
  updateStage: (stageId: number, data: Partial<AdminStage>) => 
    api.patch<AdminStage>(`/admin/stages/${stageId}`, data),
  
  deleteStage: (stageId: number) => 
    api.delete(`/admin/stages/${stageId}`),
  
  getLessons: (params?: { 
    stage_id?: number; 
    subject_id?: number; 
    status?: string; 
    limit?: number; 
    offset?: number; 
  }) => 
    api.get<AdminLesson[]>(`/admin/lessons`, { params }),
  
  publishLesson: (lessonId: number) => 
    api.post(`/admin/lessons/${lessonId}/publish`),
  
  unpublishLesson: (lessonId: number) => 
    api.post(`/admin/lessons/${lessonId}/unpublish`),
  
  getActivities: (params?: { 
    lesson_id?: number; 
    activity_type?: string; 
    status?: string; 
    limit?: number; 
    offset?: number; 
  }) => 
    api.get<AdminActivity[]>(`/admin/activities`, { params }),
  
  getAnalytics: (days = 30) => 
    api.get<AnalyticsData>(`/admin/analytics`, { params: { days } }),
  
  getAuditLogs: (params?: { 
    user_id?: number; 
    action?: string; 
    resource_type?: string; 
    start_date?: string; 
    end_date?: string; 
    limit?: number; 
    offset?: number; 
  }) => 
    api.get(`/admin/audit-logs`, { params }),
  
  getSettings: () => 
    api.get('/admin/settings'),
  
  updateSettings: (data: Record<string, unknown>) => 
    api.patch('/admin/settings', data),
};

// ===========================================
// Media API
// ===========================================

export interface MediaAsset {
  id: number;
  file_name: string;
  original_name: string;
  file_url: string | null;
  media_type: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  alt_text: string | null;
  caption: string | null;
  source: string | null;
  license: string | null,
  attribution: string | null,
  language: string | null,
  tags: string[] | null,
  is_processed: boolean,
  processing_error: string | null,
  created_at: string,
}

export const mediaApi = {
  list: (params?: { 
    media_type?: string; 
    language?: string; 
    is_processed?: boolean; 
    limit?: number; 
    offset?: number; 
  }) => 
    api.get<MediaAsset[]>('/media', { params }),
  
  get: (mediaId: number) => 
    api.get<MediaAsset>(`/media/${mediaId}`),
  
  upload: (file: File, data: { 
    media_type: string; 
    language?: string; 
    alt_text?: string; 
    caption?: string; 
    source?: string; 
    license?: string; 
    attribution?: string; 
    tags?: string; 
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) formData.append(key, String(value));
    });
    return api.post<MediaAsset>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  delete: (mediaId: number) => 
    api.delete(`/media/${mediaId}`),
  
  getLessonMedia: (lessonId: number) => 
    api.get<MediaAsset[]>(`/media/lessons/${lessonId}/media`),
  
  getActivityMedia: (activityId: number) => 
    api.get<MediaAsset[]>(`/media/activities/${activityId}/media`),
};