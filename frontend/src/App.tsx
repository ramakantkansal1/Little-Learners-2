import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout';
import ParentLayout from './layouts/ParentLayout';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';

// Context
import { StudentProvider } from './context/StudentContext';

// Pages - Public
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const FAQPage = lazy(() => import('./pages/public/FAQPage'));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const StageIntroPage = lazy(() => import('./pages/public/StageIntroPage'));

// Pages - Auth
const ParentLoginPage = lazy(() => import('./pages/auth/ParentLoginPage'));
const ParentRegisterPage = lazy(() => import('./pages/auth/ParentRegisterPage'));
const StudentLoginPage = lazy(() => import('./pages/auth/StudentLoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Pages - Parent
const ParentDashboardPage = lazy(() => import('./pages/parent/DashboardPage'));
const ParentChildrenPage = lazy(() => import('./pages/parent/ChildrenPage'));
const ChildProfilePage = lazy(() => import('./pages/parent/ChildProfilePage'));
const ChildProgressPage = lazy(() => import('./pages/parent/ChildProgressPage'));
const ChildRewardsPage = lazy(() => import('./pages/parent/ChildRewardsPage'));
const ParentSettingsPage = lazy(() => import('./pages/parent/SettingsPage'));
const ParentNotificationsPage = lazy(() => import('./pages/parent/NotificationsPage'));

// Pages - Student
const StudentDashboardPage = lazy(() => import('./pages/student/DashboardPage'));
const StudentLessonPage = lazy(() => import('./pages/student/LessonPage'));
const StudentActivityPage = lazy(() => import('./pages/student/ActivityPage'));
const StudentRewardsPage = lazy(() => import('./pages/student/RewardsPage'));
const StudentHistoryPage = lazy(() => import('./pages/student/HistoryPage'));

// Pages - Admin
const AdminDashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/UsersPage'));
const AdminCurriculumPage = lazy(() => import('./pages/admin/CurriculumPage'));
const AdminMediaPage = lazy(() => import('./pages/admin/MediaPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'));
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/SettingsPage'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
        <svg className="w-8 h-8 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/stages/:stageCode" element={<StageIntroPage />} />
        </Route>

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/parent/login" element={<ParentLoginPage />} />
          <Route path="/auth/parent/register" element={<ParentRegisterPage />} />
          <Route path="/auth/student/login" element={<StudentLoginPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Parent Routes - Protected */}
        <Route element={<ParentLayout />}>
          <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
          <Route path="/parent/children" element={<ParentChildrenPage />} />
          <Route path="/parent/children/:childId" element={<ChildProfilePage />} />
          <Route path="/parent/children/:childId/progress" element={<ChildProgressPage />} />
          <Route path="/parent/children/:childId/rewards" element={<ChildRewardsPage />} />
          <Route path="/parent/settings" element={<ParentSettingsPage />} />
          <Route path="/parent/notifications" element={<ParentNotificationsPage />} />
        </Route>

        {/* Student Routes - Protected */}
        <Route element={<StudentProvider><StudentLayout /></StudentProvider>}>
          <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          <Route path="/student/learn/:lessonId" element={<StudentLessonPage />} />
          <Route path="/student/activity/:activityId" element={<StudentActivityPage />} />
          <Route path="/student/rewards" element={<StudentRewardsPage />} />
          <Route path="/student/history" element={<StudentHistoryPage />} />
        </Route>

        {/* Admin Routes - Protected */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/curriculum/*" element={<AdminCurriculumPage />} />
          <Route path="/admin/media" element={<AdminMediaPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Redirects */}
        <Route path="/login" element={<Navigate to="/auth/parent/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/parent/register" replace />} />
        <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />
        <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;