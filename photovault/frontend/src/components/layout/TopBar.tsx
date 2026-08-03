import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  HomeIcon,
  PhotoIcon,
  RectangleStackIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  MapIcon,
  TrashIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';

/**
 * Navigation for the app.
 *
 * A top bar on desktop and a bottom tab bar on phones, matching the other apps
 * on this domain — the previous sidebar was the last structural thing making
 * this feel like a separate product.
 *
 * The bottom bar matters more than it looks: on a phone it is the only
 * navigation there is, so everything reachable has to fit there, including the
 * way back to the launcher.
 */

const PRIMARY = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Photos', path: '/photos', icon: PhotoIcon },
  { name: 'Albums', path: '/albums', icon: RectangleStackIcon },
  { name: 'People', path: '/people', icon: UserGroupIcon },
  { name: 'Ask', path: '/ask', icon: ChatBubbleLeftRightIcon },
  { name: 'Timeline', path: '/timeline', icon: CalendarDaysIcon },
  { name: 'Map', path: '/map', icon: MapIcon },
];

// Shown on desktop only — a phone tab bar with ten items is unusable, so these
// stay reachable from the Settings page instead.
const SECONDARY = [
  { name: 'Trash', path: '/trash', icon: TrashIcon },
  { name: 'Settings', path: '/settings', icon: Cog6ToothIcon },
];

// On a phone only the most-used destinations fit.
const MOBILE = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Photos', path: '/photos', icon: PhotoIcon },
  { name: 'Albums', path: '/albums', icon: RectangleStackIcon },
  { name: 'Ask', path: '/ask', icon: ChatBubbleLeftRightIcon },
  { name: 'Settings', path: '/settings', icon: Cog6ToothIcon },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
    isActive
      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
      : 'text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800'
  );

export default function TopBar({ portalUrl }: { portalUrl: string | null }) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  return (
    <>
      <header className="sticky top-0 z-40 hidden md:block border-b border-dark-200/70 dark:border-dark-800/80 bg-white/85 dark:bg-dark-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center gap-3 px-4 lg:px-10 py-3">
          <div className="flex items-center gap-3 shrink-0">
            {portalUrl && (
              <a
                href={portalUrl}
                className="text-sm text-dark-500 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                aria-label="Back to all apps"
              >
                ← <span className="hidden lg:inline">All apps</span>
              </a>
            )}
            <NavLink to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">
                <PhotoIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-semibold text-lg leading-none">PhotoVault</span>
            </NavLink>
          </div>

          {/* Scrolls rather than wraps: a nav that reflows onto two rows shifts
              the page content down and looks broken at middling widths. */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide mx-auto">
            {PRIMARY.map(({ name, path, icon: Icon }) => (
              <NavLink key={path} to={path} end={path === '/'} className={linkClass}>
                <Icon className="w-4 h-4 shrink-0" />
                {name}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            {SECONDARY.map(({ name, path, icon: Icon }) => (
              <NavLink key={path} to={path} className={linkClass} title={name}>
                <Icon className="w-4 h-4" />
              </NavLink>
            ))}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded-xl text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
              title="Sign out"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile: a bottom tab bar, thumb-reachable, clearing the home indicator. */}
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-dark-200/70 dark:border-dark-800/80 bg-white/95 dark:bg-dark-900/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {portalUrl && (
          <a
            href={portalUrl}
            className="flex flex-col items-center gap-0.5 px-2 py-2 text-[11px] text-dark-500 dark:text-dark-400"
            aria-label="Back to all apps"
          >
            <HomeIcon className="w-5 h-5" />
            Apps
          </a>
        )}
        {MOBILE.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-2 py-2 text-[11px]',
                isActive ? 'text-primary-600 dark:text-primary-400' : 'text-dark-500 dark:text-dark-400'
              )
            }
          >
            <Icon className="w-5 h-5" />
            {name}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
