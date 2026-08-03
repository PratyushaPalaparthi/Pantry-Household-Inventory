import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  HomeIcon,
  PhotoIcon,
  RectangleStackIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  MapIcon,
  Cog6ToothIcon,
  TrashIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const navItems = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Photos', path: '/photos', icon: PhotoIcon },
  { name: 'Albums', path: '/albums', icon: RectangleStackIcon },
  { name: 'People', path: '/people', icon: UserGroupIcon },
  { name: 'Ask', path: '/ask', icon: ChatBubbleLeftRightIcon },
  { name: 'Timeline', path: '/timeline', icon: CalendarDaysIcon },
  { name: 'Map', path: '/map', icon: MapIcon },
];

const bottomItems = [
  { name: 'Trash', path: '/trash', icon: TrashIcon },
  { name: 'Settings', path: '/settings', icon: Cog6ToothIcon },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const showLabels = !sidebarCollapsed || mobileOpen;

  const handleLogout = () => {
    logout();
    navigate('/login');
    onCloseMobile();
  };

  const handleNavigate = () => {
    if (mobileOpen) {
      onCloseMobile();
    }
  };

  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  useEffect(() => {
    const parts = window.location.hostname.split('.');
    if (parts.length >= 2) {
      setPortalUrl(`${window.location.protocol}//${parts.slice(1).join('.')}`);
    }
  }, []);

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-dark-950/45 backdrop-blur-sm lg:hidden',
          mobileOpen ? 'block' : 'hidden'
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={clsx(
          'fixed left-0 top-0 h-full bg-white/85 dark:bg-dark-900/90 border-r border-white/80 dark:border-dark-700/80 backdrop-blur-xl transition-all duration-300 z-50 flex flex-col',
          'w-72 lg:w-auto',
          sidebarCollapsed ? 'lg:w-24' : 'lg:w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 sm:h-[4.5rem] flex items-center justify-between px-4 border-b border-dark-100/80 dark:border-dark-700/80">
          {showLabels && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/30">
                <PhotoIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-heading font-semibold text-lg leading-none block">PhotoVault</span>
                {/* One of several apps on a shared domain needs a way back to the
                      launcher from any page. Derived from the hostname (every app
                      is a subdomain of it), so no build-time config is required
                      and nothing renders when there is no parent domain. */}
                  {portalUrl ? (
                    <a href={portalUrl} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                      ← All apps
                    </a>
                  ) : (
                    <span className="text-xs text-dark-500 dark:text-dark-400">Personal AI Gallery</span>
                  )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={toggleSidebar}
              className="hidden lg:inline-flex p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="w-5 h-5" />
              ) : (
                <ChevronLeftIcon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
              title="Close menu"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-5 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={handleNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'sidebar-item',
                      isActive && 'sidebar-item-active',
                      sidebarCollapsed && !mobileOpen && 'justify-center px-0'
                    )
                  }
                  title={sidebarCollapsed && !mobileOpen ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {showLabels && <span>{item.name}</span>}
                </NavLink>
              </li>
            ))}

            {/* Admin link */}
            {user?.role === 'admin' && (
              <li>
                <NavLink
                  to="/admin"
                  onClick={handleNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'sidebar-item',
                      isActive && 'sidebar-item-active',
                      sidebarCollapsed && !mobileOpen && 'justify-center px-0'
                    )
                  }
                  title={sidebarCollapsed && !mobileOpen ? 'Admin' : undefined}
                >
                  <ShieldCheckIcon className="w-5 h-5 flex-shrink-0" />
                  {showLabels && <span>Admin</span>}
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        {/* Bottom items */}
        <div className="border-t border-dark-100/80 dark:border-dark-700/80 py-4">
          <ul className="space-y-1 px-3">
            {bottomItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={handleNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'sidebar-item',
                      isActive && 'sidebar-item-active',
                      sidebarCollapsed && !mobileOpen && 'justify-center px-0'
                    )
                  }
                  title={sidebarCollapsed && !mobileOpen ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {showLabels && <span>{item.name}</span>}
                </NavLink>
              </li>
            ))}

            {/* Logout */}
            <li>
              <button
                onClick={handleLogout}
                className={clsx(
                  'sidebar-item w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
                  sidebarCollapsed && !mobileOpen && 'justify-center px-0'
                )}
                title={sidebarCollapsed && !mobileOpen ? 'Logout' : undefined}
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
                {showLabels && <span>Logout</span>}
              </button>
            </li>
          </ul>
        </div>

        {/* User info */}
        {showLabels && user && (
          <div className="p-4 border-t border-dark-100/80 dark:border-dark-700/80">
            <div className="glass-card p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                <span className="text-primary-700 dark:text-primary-300 font-semibold">
                  {user.full_name?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.full_name || 'User'}
                </p>
                <p className="text-xs text-dark-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
