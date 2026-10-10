import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useState } from 'react';
import { Home, BookOpen, Trophy, History, LogOut, Menu, User } from 'lucide-react';

export default function StudentLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Learning Home', href: '/student/dashboard', icon: Home },
    { name: 'My Lessons', href: '/student/dashboard', icon: BookOpen },
    { name: 'My Rewards', href: '/student/rewards', icon: Trophy },
    { name: 'My Journey', href: '/student/history', icon: History },
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/auth/student/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-pastel-green to-pastel-yellow">
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/90 backdrop-blur-sm border-r border-white/20 transform transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Learning navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-6 border-b border-white/20">
            <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-gray-800">Happy Learners</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Learning navigation">
            {navigation.map(item => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    window.location.href = item.href;
                    setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/30 text-primary-600 shadow-sm'
                      : 'text-gray-700 hover:bg-white/20'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/20">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center">
                <User className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">Little Learner</p>
                <p className="text-xs text-gray-500">Playgroup</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

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
                {navigation.find(item => location.pathname.startsWith(item.href))?.name || 'Learning Home'}
              </h1>
            </div>

            {/* Profile Button */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center">
                <User className="w-5 h-5 text-primary-500" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 pb-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}