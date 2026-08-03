import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { PhotoIcon, SparklesIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden p-4 sm:p-8 flex items-center justify-center">
      <div className="absolute -top-28 -right-20 w-[28rem] h-[28rem] rounded-full bg-primary-300/30 blur-3xl animate-soft-pulse" />
      <div className="absolute -bottom-28 -left-16 w-[24rem] h-[24rem] rounded-full bg-primary-600/25 blur-3xl animate-soft-pulse" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
        <section className="hidden lg:flex glass-card p-10 flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200/80 bg-primary-50/70 px-3 py-1 text-sm text-primary-800">
              <SparklesIcon className="w-4 h-4" />
              Private photo intelligence
            </div>
            <h1 className="mt-6 text-4xl leading-tight text-balance">
              A calm, modern workspace for your memories.
            </h1>
            <p className="mt-4 text-dark-500 dark:text-dark-300 text-base leading-relaxed">
              PhotoVault keeps your media local, searchable, and easy to manage with AI workflows that stay on your infrastructure.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <ShieldCheckIcon className="w-5 h-5 text-primary-600" />
              End-to-end self-hosted control
            </div>
            <div className="flex items-center gap-3 text-sm">
              <PhotoIcon className="w-5 h-5 text-primary-600" />
              Face, semantic and timeline discovery
            </div>
          </div>
        </section>

        <section className="card p-6 sm:p-8 lg:p-10">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-700/30">
              <PhotoIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-heading font-semibold text-xl leading-none">PhotoVault</p>
              <p className="text-xs text-dark-500 mt-1">Local AI Photo Platform</p>
            </div>
          </Link>

          <Outlet />
        </section>
      </div>
    </div>
  );
}
