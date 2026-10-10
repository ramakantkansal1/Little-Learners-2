import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useEffect } from 'react';

export default function AuthLayout() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users away from auth pages
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user?.role === 'parent') {
        navigate('/parent/dashboard', { replace: true });
      } else if (user?.role === 'student') {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastel-blue via-pastel-green to-pastel-yellow px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Auth Card */}
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-blue to-pastel-green mb-4">
              <svg className="w-8 h-8 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Happy Little Learners</h1>
            <p className="text-gray-600 mt-1">Sign in to continue learning</p>
          </div>

          <Outlet />

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Don't have an account? <Link to="/auth/parent/register" className="text-primary-500 hover:underline font-medium">Sign up</Link></p>
            <p className="mt-2"><Link to="/auth/forgot-password" className="text-primary-500 hover:underline">Forgot password?</Link></p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link to="/privacy" className="hover:text-primary-500 transition-colors mr-4">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-primary-500 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}