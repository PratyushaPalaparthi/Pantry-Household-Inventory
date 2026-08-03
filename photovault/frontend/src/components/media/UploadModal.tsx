import { useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { mediaApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface FileEntry {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

export default function UploadModal() {
  const queryClient = useQueryClient();
  const { setUploadModalOpen } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newEntries: FileEntry[] = Array.from(files).map((f) => ({
      file: f,
      status: 'pending',
      progress: 0,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const startUpload = async () => {
    const pending = entries.filter((e) => e.status === 'pending');
    if (!pending.length) return;

    setIsUploading(true);

    // Upload in batches of 5
    const batchSize = 5;
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      const batchFiles = batch.map((e) => e.file);

      // Mark batch as uploading
      setEntries((prev) =>
        prev.map((e) =>
          batchFiles.includes(e.file) ? { ...e, status: 'uploading' } : e
        )
      );

      try {
        await mediaApi.upload(batchFiles, (pct) => {
          setEntries((prev) =>
            prev.map((e) =>
              batchFiles.includes(e.file) ? { ...e, progress: pct } : e
            )
          );
        });

        setEntries((prev) =>
          prev.map((e) =>
            batchFiles.includes(e.file) ? { ...e, status: 'done', progress: 100 } : e
          )
        );
      } catch (err: unknown) {
        let message = 'Upload failed';
        if (axios.isAxiosError(err)) {
          const detail = err.response?.data?.detail;
          if (typeof detail === 'string') message = detail;
          else if (Array.isArray(detail)) message = detail.map((d: { msg?: string }) => d.msg).join(', ');
          else if (err.message) message = err.message;
        }
        setEntries((prev) =>
          prev.map((e) =>
            batchFiles.includes(e.file)
              ? { ...e, status: 'error', error: message }
              : e
          )
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ['media'] });
    setIsUploading(false);
  };

  const close = () => setUploadModalOpen(false);

  const pendingCount = entries.filter((e) => e.status === 'pending').length;
  const doneCount = entries.filter((e) => e.status === 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-dark-900 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200 dark:border-dark-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ArrowUpTrayIcon className="w-5 h-5" />
            Upload Photos & Videos
          </h2>
          <button
            onClick={close}
            className="p-1.5 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-dark-300 dark:border-dark-600 hover:border-primary-400 hover:bg-dark-50 dark:hover:bg-dark-800'
            )}
          >
            <ArrowUpTrayIcon className="w-10 h-10 mx-auto mb-3 text-dark-400" />
            <p className="font-medium text-dark-700 dark:text-dark-200">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-dark-500 mt-1">
              JPG, PNG, WebP, HEIC, MP4, MOV and more
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* File list */}
          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.file.name}</p>
                    <p className="text-xs text-dark-500">
                      {(entry.file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                    {entry.status === 'uploading' && (
                      <div className="mt-1 h-1.5 bg-dark-200 dark:bg-dark-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                    )}
                    {entry.status === 'error' && (
                      <p className="text-xs text-red-500 mt-0.5">{entry.error}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {entry.status === 'done' && (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    )}
                    {entry.status === 'error' && (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                    {entry.status === 'pending' && (
                      <button
                        onClick={() => removeEntry(idx)}
                        className="p-1 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
                      >
                        <XMarkIcon className="w-4 h-4 text-dark-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-dark-200 dark:border-dark-700">
          <p className="text-sm text-dark-500">
            {entries.length === 0
              ? 'No files selected'
              : `${entries.length} file(s) — ${doneCount} done`}
          </p>
          <div className="flex gap-2">
            <button onClick={close} className="btn-secondary">
              {doneCount > 0 && pendingCount === 0 ? 'Close' : 'Cancel'}
            </button>
            {pendingCount > 0 && (
              <button
                onClick={startUpload}
                disabled={isUploading}
                className="btn-primary flex items-center gap-2"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                {isUploading ? 'Uploading...' : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
