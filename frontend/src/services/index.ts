export { api, extractData, handleApiError, type ApiError } from "./api";

export {
  curriculumApi,
  type Stage,
  type Domain,
  type Subject,
  type Topic,
  type Lesson,
  type Activity,
} from "./api";

export {
  parentApi,
  type Child,
  type ParentProfile,
  type ChildCreateRequest,
  type ChildUpdateRequest,
  type ChildProgress,
} from "./api";

export {
  studentApi,
  type StudentProfile,
  type DashboardData,
  type LessonListItem,
  type ActivityDetail,
  type AttemptStartResponse,
  type AnswerSubmitResponse,
  type AttemptCompleteResponse,
  type Reward,
  type HistoryItem,
} from "./api";

export {
  progressApi,
  type Enrollment,
  type LessonProgress,
  type ActivityAttempt,
} from "./api";

export {
  adminApi,
  type AdminDashboardMetrics,
  type AdminUser,
  type AdminStage,
  type AdminLesson,
  type AdminActivity,
  type AnalyticsData,
  type AuditLog,
} from "./api";

export { mediaApi, type MediaAsset } from "./api";
