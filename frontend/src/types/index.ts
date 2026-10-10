// Common types
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      cursor?: string;
      limit: number;
      has_more: boolean;
    };
  };
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  native_name: string;
}

// User types
export interface User {
  id: number;
  email: string | null;
  role: 'admin' | 'parent' | 'student';
  is_verified: boolean;
  is_active: boolean;
  last_login_at: string | null;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  role: Role;
  assigned_at: string;
}

export interface Role {
  id: number;
  name: 'admin' | 'parent' | 'student';
  description: string | null;
  is_system: boolean;
}

// Parent types
export interface ParentProfile extends BaseEntity {
  user_id: number;
  full_name: string;
  phone_number: string | null;
  phone_verified: boolean;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
}

// Student types
export interface StudentProfile extends BaseEntity {
  user_id: number;
  display_name: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  avatar_url: string | null;
  avatar_type: string | null;
  current_stage_id: number | null;
  preferred_language: string;
  audio_enabled: boolean;
  reduced_motion: boolean;
  high_contrast: boolean;
  is_active: boolean;
  last_activity_at: string | null;
  current_stage?: LearningStage;
}

export interface ParentStudentRelationship extends BaseEntity {
  parent_id: number;
  student_id: number;
  relationship_type: string;
  is_primary: boolean;
  can_manage_profile: boolean;
  can_view_progress: boolean;
  can_manage_settings: boolean;
}

// Curriculum types
export interface LearningStage extends BaseEntity {
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

export interface LearningDomain extends BaseEntity {
  stage_id: number;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface Subject extends BaseEntity {
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

export interface Topic extends BaseEntity {
  subject_id: number;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  estimated_duration_minutes: number | null;
  is_active: boolean;
}

export interface LearningObjective extends BaseEntity {
  topic_id: number;
  code: string;
  description: string;
  display_order: number;
  is_assessable: boolean;
  is_active: boolean;
}

export interface Lesson extends BaseEntity {
  topic_id: number;
  code: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  version: number;
  estimated_duration_minutes: number | null;
  thumbnail_url: string | null;
  instructions: string | null;
  display_order: number;
  published_at: string | null;
  published_by: number | null;
  is_active: boolean;
  translations: LessonTranslation[];
  activities: Activity[];
}

export interface LessonTranslation extends BaseEntity {
  lesson_id: number;
  language: string;
  title: string;
  description: string | null;
  instructions: string | null;
  audio_url: string | null;
}

export interface Activity extends BaseEntity {
  lesson_id: number;
  type: ActivityType;
  code: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  version: number;
  display_order: number;
  estimated_duration_minutes: number | null;
  instructions: string | null;
  configuration: Record<string, unknown> | null;
  is_active: boolean;
  translations: ActivityTranslation[];
  questions: Question[];
}

export interface ActivityTranslation extends BaseEntity {
  activity_id: number;
  language: string;
  title: string;
  instructions: string | null;
  audio_url: string | null;
}

export interface Question extends BaseEntity {
  activity_id: number;
  question_type: string;
  prompt: string;
  prompt_audio_url: string | null;
  display_order: number;
  points: number;
  configuration: Record<string, unknown> | null;
  is_active: boolean;
  translations: QuestionTranslation[];
  answer_options: AnswerOption[];
}

export interface QuestionTranslation extends BaseEntity {
  question_id: number;
  language: string;
  prompt: string;
  prompt_audio_url: string | null;
}

export interface AnswerOption extends BaseEntity {
  question_id: number;
  text: string;
  text_audio_url: string | null;
  image_url: string | null;
  is_correct: boolean;
  display_order: number;
  feedback_correct: string | null;
  feedback_incorrect: string | null;
  configuration: Record<string, unknown> | null;
  translations: AnswerOptionTranslation[];
}

export interface AnswerOptionTranslation extends BaseEntity {
  answer_option_id: number;
  language: string;
  text: string;
  feedback_correct: string | null;
  feedback_incorrect: string | null;
}

export type ActivityType =
  | 'image_selection'
  | 'color_identification'
  | 'shape_matching'
  | 'picture_matching'
  | 'alphabet_recognition'
  | 'letter_sound'
  | 'number_recognition'
  | 'counting'
  | 'sorting'
  | 'sequencing'
  | 'tracing'
  | 'story_listening'
  | 'picture_comprehension'
  | 'simple_quiz'
  | 'audio_identification';

// Progress types
export interface StudentEnrollment extends BaseEntity {
  student_id: number;
  stage_id: number;
  subject_id: number | null;
  status: 'active' | 'completed' | 'paused' | 'withdrawn';
  enrolled_at: string;
  completed_at: string | null;
  assigned_by: number | null;
  notes: string | null;
}

export interface StudentLessonProgress extends BaseEntity {
  student_id: number;
  lesson_id: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review';
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  time_spent_seconds: number;
  current_activity_id: number | null;
  completion_percentage: number;
}

export interface ActivityAttempt extends BaseEntity {
  student_id: number;
  activity_id: number;
  lesson_progress_id: number | null;
  attempt_number: number;
  status: 'started' | 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number;
  score: number | null;
  max_score: number;
  passed: boolean | null;
  metadata: Record<string, unknown> | null;
}

export interface ActivityResponse extends BaseEntity {
  attempt_id: number;
  question_id: number;
  selected_option_ids: number[];
  is_correct: boolean | null;
  points_earned: number;
  time_spent_seconds: number;
  metadata: Record<string, unknown> | null;
}

export interface StudentReward extends BaseEntity {
  code: string;
  name: string;
  description: string | null;
  reward_type: 'star' | 'sticker' | 'badge' | 'certificate';
  image_url: string | null;
  criteria: Record<string, unknown> | null;
  points_value: number;
  display_order: number;
  is_active: boolean;
}

export interface StudentRewardAward extends BaseEntity {
  student_id: number;
  reward_id: number;
  attempt_id: number | null;
  earned_at: string;
  metadata: Record<string, unknown> | null;
}

// Media types
export interface MediaAsset extends BaseEntity {
  file_name: string;
  original_name: string;
  file_path: string;
  file_url: string | null;
  media_type: 'image' | 'audio' | 'video' | 'document';
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  alt_text: string | null;
  caption: string | null;
  source: string | null;
  license: string | null;
  attribution: string | null;
  language: string | null;
  tags: string[];
  uploaded_by: number | null;
  is_processed: boolean;
  processing_error: string | null;
}

// Notification types
export interface ParentNotification extends BaseEntity {
  parent_id: number;
  student_id: number | null;
  notification_type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  sent_via_email: boolean;
  sent_via_sms: boolean;
}

// Settings types
export interface UserPreference extends BaseEntity {
  user_id: number;
  preferred_language: string;
  audio_enabled: boolean;
  audio_volume: number;
  narration_speed: number;
  reduced_motion: boolean;
  high_contrast: boolean;
  font_size: 'small' | 'medium' | 'large';
  screen_reader_optimized: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  in_app_notifications: boolean;
  weekly_summary_email: boolean;
  progress_alerts: boolean;
  analytics_opt_in: boolean;
  data_sharing_consent: boolean;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface StudentLoginCredentials {
  username: string;
  pin: string;
}

export interface RegisterData {
  full_name: string;
  email: string;
  phone_number?: string;
  password: string;
  confirm_password: string;
  accept_terms: boolean;
  accept_privacy: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirm_password: string;
}