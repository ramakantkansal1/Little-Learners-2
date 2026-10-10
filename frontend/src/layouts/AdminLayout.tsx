import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Image,
  BarChart,
  FileText,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  User,
  Shield,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', href: '/admin/users', icon: Users, roles: ['admin'] },
    { name: 'Curriculum', href: '/admin/curriculum', icon: BookOpen, roles: ['admin'] },
    { name: 'Media Library', href: '/admin/media', icon: Image, roles: ['admin'] },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart, roles: ['admin'] },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileText, roles: ['admin'] },
    { name: 'Settings', href: '/admin/settings', icon: Settings, roles: ['admin'] },
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
        aria-label="Admin navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-6 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-500" />
            </div>
            <span className="font-display font-bold text-xl text-gray-900">Admin Panel</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Admin navigation">
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-purple to-pastel-blue flex items-center justify-center">
                <User className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.email || 'Admin'}</p>
                <p className="text-xs text-gray-500">Administrator</p>
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
                  to="/admin/settings"
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

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-gray-500">
                {user?.email}
              </span>
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