import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';
import { XCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

function extractErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Login failed. Please try again.';
  const data = error.response?.data;
  if (!data) return error.message || 'Login failed. Please try again.';
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((e: { msg?: string; loc?: string[] }) => {
        const field = e.loc && e.loc.length > 1 ? `${e.loc[e.loc.length - 1]}: ` : '';
        return `${field}${e.msg ?? 'Invalid value'}`;
      })
      .join('\n');
  }
  if (typeof data.detail === 'string') return data.detail;
  return error.message || 'Login failed. Please try again.';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, setTokens } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { access_token, refresh_token } = response.data;

      // Set tokens in store BEFORE calling /me so the request carries the auth header
      setTokens(access_token, refresh_token);

      const userResponse = await authApi.me();
      login(userResponse.data, access_token, refresh_token);
      navigate('/');
    } catch (error: unknown) {
      setFormError(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">Sign in</h2>

      {formError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
          {formError.split('\n').map((line, i) => (
            <p key={i} className="text-sm text-red-700 flex items-start gap-1.5">
              <XCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              {line}
            </p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
            className="input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
              className="input pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-600"
              tabIndex={-1}
            >
              {showPassword
                ? <EyeSlashIcon className="w-5 h-5" />
                : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Remember me</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-dark-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
