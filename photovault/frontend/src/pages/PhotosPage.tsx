import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { mediaApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { Media, PaginatedResponse } from '@/types';
import PhotoGrid from '@/components/media/PhotoGrid';
import {
  FunnelIcon,
  HeartIcon,
  TrashIcon,
  RectangleStackIcon,
  XMarkIcon,
  PhotoIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function PhotosPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { selectedMedia, clearSelection, sortBy, sortOrder, setSortBy, setSortOrder } = useUIStore();
  
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    media_type: searchParams.get('type') || undefined,
    favorites_only: searchParams.get('favorites') === 'true',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Fetch media
  const { data, isLoading } = useQuery<PaginatedResponse<Media>>({
    queryKey: ['media', page, filters, sortBy, sortOrder],
    queryFn: async () => {
      const response = await mediaApi.list({
        page,
        page_size: 50,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...filters,
      });
      return response.data;
    },
  });
  
  // Toggle favorite mutation
  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      await mediaApi.update(id, { is_favorite: isFavorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
  
  // Bulk delete mutation
  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      await mediaApi.bulkAction(ids, 'delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      clearSelection();
      toast.success('Items moved to trash');
    },
  });
  
  // Bulk favorite mutation
  const bulkFavorite = useMutation({
    mutationFn: async (ids: string[]) => {
      await mediaApi.bulkAction(ids, 'favorite');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      clearSelection();
      toast.success('Items added to favorites');
    },
  });
  
  const handleFavoriteToggle = useCallback((id: string, isFavorite: boolean) => {
    toggleFavorite.mutate({ id, isFavorite });
  }, [toggleFavorite]);
  
  const handleBulkDelete = () => {
    if (selectedMedia.size > 0) {
      bulkDelete.mutate(Array.from(selectedMedia));
    }
  };
  
  const handleBulkFavorite = () => {
    if (selectedMedia.size > 0) {
      bulkFavorite.mutate(Array.from(selectedMedia));
    }
  };
  
  const updateFilter = (
    key: 'media_type' | 'favorites_only',
    value: string | boolean | undefined
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-dark-500">Library</p>
            <h1 className="page-title mt-1">Photos</h1>
            <p className="section-subtitle mt-2">
              {data?.total?.toLocaleString() || 0} items ready to explore
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => updateFilter('media_type', undefined)}
              className={clsx(
                'btn-secondary py-2 text-sm',
                !filters.media_type && 'bg-primary-100 dark:bg-primary-900/35 text-primary-700 dark:text-primary-300'
              )}
            >
              All
            </button>
            <button
              onClick={() => updateFilter('media_type', 'photo')}
              className={clsx(
                'btn-secondary py-2 text-sm inline-flex items-center gap-1.5',
                filters.media_type === 'photo' && 'bg-primary-100 dark:bg-primary-900/35 text-primary-700 dark:text-primary-300'
              )}
            >
              <PhotoIcon className="w-4 h-4" />
              Photos
            </button>
            <button
              onClick={() => updateFilter('media_type', 'video')}
              className={clsx(
                'btn-secondary py-2 text-sm inline-flex items-center gap-1.5',
                filters.media_type === 'video' && 'bg-primary-100 dark:bg-primary-900/35 text-primary-700 dark:text-primary-300'
              )}
            >
              <VideoCameraIcon className="w-4 h-4" />
              Videos
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Use filters and multi-select actions to organize quickly.
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort options */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as 'taken_at' | 'created_at' | 'filename' | 'file_size'
              )
            }
            className="input py-2.5 pr-8 min-w-[170px]"
          >
            <option value="taken_at">Date taken</option>
            <option value="created_at">Date added</option>
            <option value="filename">Name</option>
            <option value="file_size">Size</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="btn-secondary"
            title={sortOrder === 'desc' ? 'Descending order' : 'Ascending order'}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
          
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx('btn-secondary', showFilters && 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300')}
            title="Toggle advanced filters"
          >
            <FunnelIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="card p-4 sm:p-5 flex flex-wrap gap-4 animate-slide-up">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={filters.media_type || ''}
              onChange={(e) => updateFilter('media_type', e.target.value || undefined)}
              className="input py-2"
            >
              <option value="">All</option>
              <option value="photo">Photos</option>
              <option value="video">Videos</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Favorites</label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={filters.favorites_only}
                onChange={(e) => updateFilter('favorites_only', e.target.checked)}
                className="rounded"
              />
              <span>Favorites only</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Selection toolbar */}
      {selectedMedia.size > 0 && (
        <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-4">
            <span className="font-medium">{selectedMedia.size} selected</span>
            <button
              onClick={clearSelection}
              className="text-dark-500 hover:text-dark-700"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBulkFavorite}
              className="btn-secondary flex items-center gap-2"
            >
              <HeartIcon className="w-4 h-4" />
              Favorite
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <RectangleStackIcon className="w-4 h-4" />
              Add to album
            </button>
            <button
              onClick={handleBulkDelete}
              className="btn-danger flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
      
      {/* Photo grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : data?.items ? (
        <>
          <PhotoGrid media={data.items} onFavoriteToggle={handleFavoriteToggle} />
          
          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-dark-500">
          <p>No photos found</p>
        </div>
      )}
    </div>
  );
}
