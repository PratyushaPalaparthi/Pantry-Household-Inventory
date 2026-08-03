import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authApi } from '@/services/api';
import { CheckCircleIcon, XCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'At least one uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'At least one lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'At least one number (0–9)', test: (pw) => /[0-9]/.test(pw) },
];

function extractErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Registration failed. Please try again.';
  const data = error.response?.data;
  if (!data) return 'Registration failed. Please try again.';
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((e: { msg?: string; loc?: string[] }) => {
        const field = e.loc && e.loc.length > 1 ? `${e.loc[e.loc.length - 1]}: ` : '';
        return `${field}${e.msg ?? 'Invalid value'}`;
      })
      .join('\n');
  }
  if (typeof data.detail === 'string') return data.detail;
  return error.message || 'Registration failed. Please try again.';
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const allRulesMet = PASSWORD_RULES.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!allRulesMet) {
      setFormError('Please satisfy all password requirements before submitting.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.register(email, password, fullName || undefined);
      navigate('/login');
    } catch (error: unknown) {
      setFormError(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">Create account</h2>

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
          <label htmlFor="fullName" className="block text-sm font-medium mb-1">
            Full name (optional)
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => {
                setPassword(e.target.value);
                if (!passwordTouched) setPasswordTouched(true);
              }}
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

          {passwordTouched && (
            <ul className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password);
                return (
                  <li key={rule.label} className="flex items-center gap-1.5 text-xs">
                    {met
                      ? <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <XCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <span className={met ? 'text-green-700' : 'text-dark-500'}>{rule.label}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {!passwordTouched && (
            <p className="text-xs text-dark-500 mt-1">
              Must be 8+ characters with uppercase, lowercase, and a number.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-600"
              tabIndex={-1}
            >
              {showConfirm
                ? <EyeSlashIcon className="w-5 h-5" />
                : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
          {confirmPassword.length > 0 && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
              {password === confirmPassword
                ? <><CheckCircleIcon className="w-3.5 h-3.5" /> Passwords match</>
                : <><XCircleIcon className="w-3.5 h-3.5" /> Passwords do not match</>}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-dark-500">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          Sign in
        </Link>
      </p>

      <p className="text-center mt-4 text-xs text-dark-400">
        Note: Your account will need to be approved by an administrator before you can access the system.
      </p>
    </div>
  );
}
