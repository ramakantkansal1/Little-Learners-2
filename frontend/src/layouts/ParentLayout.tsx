import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  User,
  BookOpen,
  Trophy,
} from 'lucide-react';

export default function ParentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
    { name: 'My Children', href: '/parent/children', icon: Users },
    { name: 'Progress Reports', href: '/parent/children/1/progress', icon: BookOpen },
    { name: 'Rewards & Achievements', href: '/student/rewards', icon: Trophy },
    { name: 'Notifications', href: '/parent/notifications', icon: Bell },
    { name: 'Settings', href: '/parent/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/auth/parent/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-6 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-gray-900">Happy Little Learners</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
            {navigation.map(item => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center">
                <User className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.email || 'Parent'}</p>
                <p className="text-xs text-gray-500">Parent Account</p>
              </div>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="Profile menu"
                aria-expanded={isProfileOpen}
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="mt-2 py-2 rounded-xl bg-white border border-gray-200 shadow-soft animate-in">
                <Link
                  to="/parent/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page Title */}
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => location.pathname.startsWith(item.href))?.name || 'Dashboard'}
              </h1>
            </div>

            {/* Notifications & Profile */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-xs text-white font-medium flex items-center justify-center">3</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}