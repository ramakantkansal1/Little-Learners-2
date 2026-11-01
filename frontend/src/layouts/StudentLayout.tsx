import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStudent } from "@context/StudentContext";
import { useAuth } from "@hooks/useAuth";
import { useState } from "react";
import {
  Home,
  BookOpen,
  Trophy,
  History,
  LogOut,
  Menu,
  Globe,
  Settings,
  Move,
  Contrast,
  Music,
} from "lucide-react";

export default function StudentLayout() {
  const { logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    profile,
    toggleAudio,
    toggleReducedMotion,
    toggleHighContrast,
    changeLanguage,
  } = useStudent();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const navigation = [
    { name: "Learning Home", href: "/student/dashboard", icon: Home },
    { name: "My Lessons", href: "/student/dashboard", icon: BookOpen },
    { name: "My Rewards", href: "/student/rewards", icon: Trophy },
    { name: "My Journey", href: "/student/history", icon: History },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/auth/student/login", { replace: true });
  };

  const avatarMap: Record<string, string> = {
    boy: "👦",
    girl: "👧",
    elephant: "🐘",
    owl: "🦉",
    rabbit: "🐰",
    tiger: "🐯",
  };

  const getStageName = (code: string | null) => {
    const stages: Record<string, string> = {
      playgroup: "Playgroup",
      nursery: "Nursery",
      lkg: "LKG",
      ukg: "UKG",
    };
    return code ? stages[code] : "Playgroup";
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <svg
              className="w-8 h-8 text-primary-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-gray-600">Loading your learning space...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate("/auth/student/login", { replace: true });
    return null;
  }

  // Show loading while profile is being fetched
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <svg
              className="w-8 h-8 text-primary-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-gray-600">Loading your learning space...</p>
        </div>
      </div>
    );
  }

  const handleToggleAudio = async () => {
    await toggleAudio(!profile.audio_enabled);
  };

  const handleToggleReducedMotion = async () => {
    await toggleReducedMotion(!profile.reduced_motion);
  };

  const handleToggleHighContrast = async () => {
    await toggleHighContrast(!profile.high_contrast);
  };

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
    setShowSettings(false);
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-pastel-blue via-pastel-green to-pastel-yellow ${profile.high_contrast ? "high-contrast" : ""} ${profile.reduced_motion ? "reduced-motion" : ""}`}
    >
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/90 backdrop-blur-sm border-r border-white/20 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Learning navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-6 border-b border-white/20">
            <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-gray-800">
              Happy Learners
            </span>
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 p-4 space-y-1 overflow-y-auto"
            aria-label="Learning navigation"
          >
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white/30 text-primary-600 shadow-sm"
                      : "text-gray-700 hover:bg-white/20"
                  }`}
                >
                  <item.icon
                    className="w-5 h-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/20">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center text-2xl">
                {avatarMap[profile.avatar_type || "boy"] || "👦"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {profile.display_name}
                </p>
                <p className="text-xs text-gray-500">
                  {getStageName(profile.current_stage_code)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/30 hover:bg-white/50 text-sm font-medium transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>

            <button
              onClick={handleLogout}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowSettings(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-gray-900">
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Language */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Language
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {["en", "hi"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        profile.preferred_language === lang
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {lang === "en" ? "English" : "हिंदी"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  Audio
                </h3>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Narration & Sound Effects
                  </span>
                  <button
                    onClick={handleToggleAudio}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      profile.audio_enabled ? "bg-primary-500" : "bg-gray-300"
                    }`}
                    aria-label={
                      profile.audio_enabled ? "Disable audio" : "Enable audio"
                    }
                  >
                    <span
                      className={`absolute top-1 transition-transform ${
                        profile.audio_enabled
                          ? "translate-x-6"
                          : "translate-x-1"
                      } w-5 h-5 rounded-full bg-white shadow-md`}
                    />
                  </button>
                </label>
              </div>

              {/* Reduced Motion */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Move className="w-5 h-5" />
                  Reduced Motion
                </h3>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Minimize animations
                  </span>
                  <button
                    onClick={handleToggleReducedMotion}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      profile.reduced_motion ? "bg-primary-500" : "bg-gray-300"
                    }`}
                    aria-label={
                      profile.reduced_motion
                        ? "Disable reduced motion"
                        : "Enable reduced motion"
                    }
                  >
                    <span
                      className={`absolute top-1 transition-transform ${
                        profile.reduced_motion
                          ? "translate-x-6"
                          : "translate-x-1"
                      } w-5 h-5 rounded-full bg-white shadow-md`}
                    />
                  </button>
                </label>
              </div>

              {/* High Contrast */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Contrast className="w-5 h-5" />
                  High Contrast
                </h3>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Increase color contrast
                  </span>
                  <button
                    onClick={handleToggleHighContrast}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      profile.high_contrast ? "bg-primary-500" : "bg-gray-300"
                    }`}
                    aria-label={
                      profile.high_contrast
                        ? "Disable high contrast"
                        : "Enable high contrast"
                    }
                  >
                    <span
                      className={`absolute top-1 transition-transform ${
                        profile.high_contrast
                          ? "translate-x-6"
                          : "translate-x-1"
                      } w-5 h-5 rounded-full bg-white shadow-md`}
                    />
                  </button>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Button for Desktop */}
      <button
        onClick={() => setShowSettings(true)}
        className="hidden lg:flex lg:fixed lg:bottom-6 lg:right-6 z-40 p-3 rounded-full bg-white/30 hover:bg-white/50 shadow-lg transition-colors"
        aria-label="Open settings"
      >
        <Settings className="w-6 h-6 text-gray-700" />
      </button>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/90 backdrop-blur-sm border-r border-white/20 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Learning navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-6 border-b border-white/20">
            <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-gray-800">
              Happy Learners
            </span>
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 p-4 space-y-1 overflow-y-auto"
            aria-label="Learning navigation"
          >
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white/30 text-primary-600 shadow-sm"
                      : "text-gray-700 hover:bg-white/20"
                  }`}
                >
                  <item.icon
                    className="w-5 h-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/20">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center text-2xl">
                {avatarMap[profile.avatar_type || "boy"] || "👦"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {profile.display_name}
                </p>
                <p className="text-xs text-gray-500">
                  {getStageName(profile.current_stage_code)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/30 hover:bg-white/50 text-sm font-medium transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>

            <button
              onClick={handleLogout}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Settings Button for Mobile */}
      <button
        onClick={() => setShowSettings(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 p-3 rounded-full bg-white/30 hover:bg-white/50 shadow-lg transition-colors"
        aria-label="Open settings"
      >
        <Settings className="w-6 h-6 text-gray-700" />
      </button>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/50 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/30 hover:bg-white/50 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>

            {/* Page Title */}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-display font-bold text-gray-800">
                {navigation.find((item) =>
                  location.pathname.startsWith(item.href),
                )?.name || "Learning Home"}
              </h1>
            </div>

            {/* Profile Button */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center text-2xl">
                {avatarMap[profile.avatar_type || "boy"] || "👦"}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={`p-4 sm:p-6 lg:p-8 pb-20 ${profile.reduced_motion ? "reduced-motion" : ""} ${profile.high_contrast ? "high-contrast" : ""}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
