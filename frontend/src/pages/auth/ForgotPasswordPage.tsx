import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { api } from '@services/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setStatus('loading');
    setError('');
    try {
      await api.post('/auth/forgot-password', data);

      

      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      if (err instanceof Error) {
        setError(err.message);
      } else if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
        setError(axiosError.response?.data?.error?.message || 'Something went wrong');
      } else {
        setError('Something went wrong');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/auth/parent/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-4">
        <ArrowLeft className="w-5 h-5" />
        Back to Login
      </Link>

      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-pastel-blue flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary-500" />
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-2">Reset Password</h2>
        <p className="text-gray-600">Enter your email and we'll send you a reset link</p>
      </div>

      {status === 'success' ? (
        <div className="p-6 rounded-xl bg-green-50 border border-green-200 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-1">Check Your Email</h3>
          <p className="text-green-700">If an account exists, a password reset link has been sent.</p>
          <Link to="/auth/parent/login" className="inline-block mt-4 text-primary-500 hover:underline">
            Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="label">
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="parent@example.com"
              autoComplete="email"
              disabled={status === 'loading'}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
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
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-600">
        Remember your password? <Link to="/auth/parent/login" className="text-primary-500 hover:underline font-medium">Sign In</Link>
      </p>
    </div>
  );
}