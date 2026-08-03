import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  Squares2X2Icon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export default function Header({ onOpenMobileMenu }: HeaderProps) {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, gridSize, setGridSize, searchQuery, setSearchQuery, setUploadModalOpen } = useUIStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    if (localSearch.trim()) {
      navigate(`/ask?q=${encodeURIComponent(localSearch)}`);
    }
  };
  
  const gridSizes = ['small', 'medium', 'large'] as const;
  
  return (
    <header className="sticky top-0 z-30 border-b border-white/75 dark:border-dark-700/75 bg-white/70 dark:bg-dark-900/70 backdrop-blur-xl">
      <div className="h-16 sm:h-[4.5rem] flex items-center justify-between px-4 sm:px-6 lg:px-10 gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
          title="Open menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search photos, people, places..."
            className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-white/75 dark:bg-dark-800/80 border border-dark-200/75 dark:border-dark-700/70 focus:border-primary-500 focus:bg-white dark:focus:bg-dark-800 transition-all"
          />
          <span className="hidden sm:inline text-[11px] text-dark-500 absolute right-3 top-1/2 -translate-y-1/2 border border-dark-200 dark:border-dark-600 rounded-md px-1.5 py-0.5">
            Enter
          </span>
        </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Grid size */}
          <div className="hidden md:flex items-center bg-white/75 dark:bg-dark-800/70 rounded-xl p-1 border border-dark-200/70 dark:border-dark-700/70">
          {gridSizes.map((size) => (
            <button
              key={size}
              onClick={() => setGridSize(size)}
              className={clsx(
                'p-1.5 rounded transition-colors',
                gridSize === size
                  ? 'bg-primary-50 dark:bg-primary-900/35 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-dark-200 dark:hover:bg-dark-600'
              )}
              title={`${size.charAt(0).toUpperCase() + size.slice(1)} grid`}
            >
              <Squares2X2Icon
                className={clsx(
                  'w-4 h-4',
                  size === 'small' && 'scale-75',
                  size === 'large' && 'scale-110'
                )}
              />
            </button>
          ))}
          </div>

          {/* Upload button */}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? (
              <SunIcon className="w-5 h-5 text-amber-500" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
