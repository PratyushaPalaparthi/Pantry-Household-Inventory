import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usersApi, mediaApi, albumsApi, peopleApi } from '@/services/api';
import { UserStats, Media, Album, Person } from '@/types';
import {
  PhotoIcon,
  VideoCameraIcon,
  RectangleStackIcon,
  UserGroupIcon,
  CloudIcon,
  SparklesIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import PhotoGrid from '@/components/media/PhotoGrid';

export default function HomePage() {
  const { user } = useAuthStore();

  // Fetch user stats
  const { data: stats } = useQuery<UserStats>({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await usersApi.getStats();
      return response.data;
    },
  });

  // Fetch recent photos
  const { data: recentMedia } = useQuery<{ items: Media[] }>({
    queryKey: ['recentMedia'],
    queryFn: async () => {
      const response = await mediaApi.list({ page_size: 12, sort_by: 'created_at', sort_order: 'desc' });
      return response.data;
    },
  });

  // Fetch albums
  const { data: albums } = useQuery<Album[]>({
    queryKey: ['albums'],
    queryFn: async () => {
      const response = await albumsApi.list();
      return response.data;
    },
  });

  // Fetch people
  const { data: people } = useQuery<Person[]>({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await peopleApi.list({ named_only: true });
      return response.data;
    },
  });

  const storageUsage = useMemo(() => {
    if (!stats || !stats.storage_quota_bytes) {
      return 0;
    }
    return Math.min(100, (stats.storage_used_bytes / stats.storage_quota_bytes) * 100);
  }, [stats]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="glass-card p-6 sm:p-8 lg:p-10 overflow-hidden relative">
        <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-primary-300/25 blur-3xl" />
        <div className="relative grid xl:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-100/80 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 px-3 py-1 text-sm font-medium">
              <SparklesIcon className="w-4 h-4" />
              Workspace Overview
            </div>
            <h1 className="page-title mt-4">
              Welcome back, {user?.full_name?.split(' ')[0] || 'there'}.
            </h1>
            <p className="section-subtitle mt-3 max-w-2xl text-balance">
              Review recent media activity, monitor storage health, and jump straight into photo search or upload flows.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/photos?upload=true" className="btn-primary inline-flex items-center gap-2">
                <ArrowUpTrayIcon className="w-4 h-4" />
                Upload Media
              </Link>
              <Link to="/ask" className="btn-secondary inline-flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                Ask PhotoVault
              </Link>
              <Link to="/settings" className="btn-secondary inline-flex items-center gap-2">
                <Cog6ToothIcon className="w-4 h-4" />
                Configure Sources
              </Link>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <CloudIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-base sm:text-lg font-semibold">Storage Health</h2>
            </div>
            <div className="flex items-end justify-between mb-2">
              <p className="text-3xl font-heading font-semibold">{storageUsage.toFixed(1)}%</p>
              <p className="text-sm text-dark-500">Used</p>
            </div>
            <div className="h-3 rounded-full bg-dark-100 dark:bg-dark-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-700"
                style={{ width: `${storageUsage}%` }}
              />
            </div>
            <div className="mt-3 text-sm text-dark-500 flex items-center justify-between gap-3">
              <span>{formatBytes(stats?.storage_used_bytes || 0)}</span>
              <span>{formatBytes(stats?.storage_quota_bytes || 0)} total</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="card p-4 sm:p-5">
          <div className="inline-flex p-2 rounded-lg bg-primary-100 dark:bg-primary-900/35 mb-3">
            <PhotoIcon className="w-5 h-5 text-primary-700 dark:text-primary-300" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-semibold">{stats?.total_photos?.toLocaleString() || 0}</p>
          <p className="text-sm text-dark-500 mt-1">Photos Indexed</p>
        </article>

        <article className="card p-4 sm:p-5">
          <div className="inline-flex p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30 mb-3">
            <VideoCameraIcon className="w-5 h-5 text-sky-700 dark:text-sky-300" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-semibold">{stats?.total_videos?.toLocaleString() || 0}</p>
          <p className="text-sm text-dark-500 mt-1">Videos Indexed</p>
        </article>

        <article className="card p-4 sm:p-5">
          <div className="inline-flex p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 mb-3">
            <RectangleStackIcon className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-semibold">{stats?.total_albums || 0}</p>
          <p className="text-sm text-dark-500 mt-1">Albums</p>
        </article>

        <article className="card p-4 sm:p-5">
          <div className="inline-flex p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 mb-3">
            <UserGroupIcon className="w-5 h-5 text-amber-700 dark:text-amber-300" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-semibold">{stats?.total_people || 0}</p>
          <p className="text-sm text-dark-500 mt-1">People Groups</p>
        </article>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold">Recent Media</h2>
          <Link to="/photos" className="text-primary-700 dark:text-primary-300 hover:underline text-sm font-medium">
            Open library
          </Link>
        </div>
        {recentMedia?.items && recentMedia.items.length > 0 ? (
          <PhotoGrid media={recentMedia.items} selectable={false} />
        ) : (
          <div className="card p-12 text-center">
            <SparklesIcon className="w-12 h-12 mx-auto text-dark-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No media yet</h3>
            <p className="text-dark-500 mb-4">
              Start by uploading files or configuring your NAS sync path.
            </p>
            <Link to="/settings" className="btn-primary">
              Open Settings
            </Link>
          </div>
        )}
      </section>

      {albums && albums.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold">Albums</h2>
            <Link to="/albums" className="text-primary-700 dark:text-primary-300 hover:underline text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.slice(0, 6).map((album) => (
              <Link
                key={album.id}
                to={`/albums/${album.id}`}
                className="card overflow-hidden group"
              >
                <div className="aspect-square bg-dark-100 dark:bg-dark-700 relative">
                  {album.cover_thumbnail ? (
                    <img
                      src={album.cover_thumbnail}
                      alt={album.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <RectangleStackIcon className="w-12 h-12 text-dark-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium truncate">{album.name}</p>
                  <p className="text-sm text-dark-500">{album.media_count} items</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {people && people.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold">People</h2>
            <Link to="/people" className="text-primary-700 dark:text-primary-300 hover:underline text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {people.slice(0, 10).map((person) => (
              <Link
                key={person.id}
                to={`/people/${person.id}`}
                className="flex-shrink-0 text-center group"
              >
                <div className="w-20 h-20 rounded-full bg-dark-100 dark:bg-dark-700 overflow-hidden mb-2 border border-white/70 dark:border-dark-700">
                  {person.cover_face_thumbnail ? (
                    <img
                      src={person.cover_face_thumbnail}
                      alt={person.name || 'Unknown'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserGroupIcon className="w-8 h-8 text-dark-300" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium truncate max-w-[80px]">
                  {person.name || 'Unknown'}
                </p>
                <p className="text-xs text-dark-500">{person.face_count} photos</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
