import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, User, Lock } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { api } from '@services/api';

const studentLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(6, 'PIN must be at most 6 digits').regex(/^\d+$/, 'PIN must be numbers only'),
});

type StudentLoginForm = z.infer<typeof studentLoginSchema>;

export default function StudentLoginPage() {
  const [error, setError] = useState('');
  const { setAuth, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentLoginForm>({
    resolver: zodResolver(studentLoginSchema),
  });

  const onSubmit = async (data: StudentLoginForm) => {
    setError('');
    try {
      const response = await api.post('/auth/student/login', data);

      const result = response.data;

      // Backend returns TokenResponse directly (not wrapped in ApiResponse)
      setAuth(result.user, result.access_token, result.refresh_token);
      navigate('/student/dashboard', { replace: true });
    } catch (err: unknown) {
      // Check for axios error first (has response property)
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
        setError(axiosError.response?.data?.error?.message || 'Login failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pastel-pink to-pastel-peach flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-primary-500" />
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900">Little Learner Login</h2>
        <p className="text-gray-600 mt-1">Enter your username and PIN to start learning</p>
      </div>

      <div>
        <label htmlFor="username" className="label">
          Username
        </label>
        <div className="relative">
          <input
            {...register('username')}
            type="text"
            id="username"
            className={`input pl-12 ${errors.username ? 'input-error' : ''}`}
            placeholder="Your username"
            autoComplete="username"
            disabled={isLoading}
          />
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        {errors.username && (
          <p className="mt-1.5 text-sm text-red-500">{errors.username.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="pin" className="label">
          PIN (4-6 digits)
        </label>
        <div className="relative">
          <input
            {...register('pin')}
            type="password"
            id="pin"
            className={`input pl-12 ${errors.pin ? 'input-error' : ''}`}
            placeholder="••••"
            autoComplete="off"
            disabled={isLoading}
            inputMode="numeric"
          />
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        {errors.pin && (
          <p className="mt-1.5 text-sm text-red-500">{errors.pin.message}</p>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Signing in...
          </>
        ) : (
          'Start Learning'
        )}
      </button>

      <div className="text-center text-sm text-gray-600">
        <p>Are you a parent? <Link to="/auth/parent/login" className="text-primary-500 hover:underline font-medium">Parent Login</Link></p>
      </div>
    </form>
  );
}