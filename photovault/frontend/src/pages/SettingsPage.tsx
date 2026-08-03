import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { usersApi, jobsApi } from '@/services/api';
import { UserSettings, Job } from '@/types';
import {
  Cog6ToothIcon,
  ServerIcon,
  CpuChipIcon,
  ArrowPathIcon,
  KeyIcon,
  UserCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import axios from 'axios';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { label: 'At least one uppercase letter (A–Z)', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'At least one lowercase letter (a–z)', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'At least one number (0–9)', test: (pw: string) => /[0-9]/.test(pw) },
];

function extractErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'An unexpected error occurred.';
  const data = error.response?.data;
  if (!data) return error.message || 'Request failed.';
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((e: { msg?: string; loc?: string[] }) => {
        const field = e.loc && e.loc.length > 1 ? `${e.loc[e.loc.length - 1]}: ` : '';
        return `${field}${e.msg ?? 'Invalid value'}`;
      })
      .join('\n');
  }
  if (typeof data.detail === 'string') return data.detail;
  return error.message || 'Request failed.';
}

type SettingsTab = 'profile' | 'nas' | 'ai' | 'indexing' | 'security';

interface NasTabProps {
  settings: UserSettings | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSettings: { mutate: (data: Partial<UserSettings>) => void; isPending: boolean };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  triggerScan: { mutate: () => void; isPending: boolean };
}

function NasTab({ settings, updateSettings, triggerScan }: NasTabProps) {
  const [paths, setPaths] = useState<string[]>(settings?.nas_paths ?? []);
  const [newPath, setNewPath] = useState('');

  const addPath = () => {
    const trimmed = newPath.trim();
    if (!trimmed || paths.includes(trimmed)) return;
    setPaths((prev) => [...prev, trimmed]);
    setNewPath('');
  };

  const removePath = (index: number) => {
    setPaths((prev) => prev.filter((_, i) => i !== index));
  };

  const savePaths = () => {
    updateSettings.mutate({ nas_paths: paths });
  };

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold">NAS Storage</h2>

      <div>
        <label className="block text-sm font-medium mb-1">NAS Paths</label>
        <p className="text-sm text-dark-500 mb-3">
          Folders on your NAS that will be scanned for photos
        </p>

        {paths.length === 0 && (
          <p className="text-dark-400 italic mb-3">No paths configured</p>
        )}

        <div className="space-y-2 mb-3">
          {paths.map((path, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => {
                  const updated = [...paths];
                  updated[index] = e.target.value;
                  setPaths(updated);
                }}
                className="input flex-1"
              />
              <button
                onClick={() => removePath(index)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Remove path"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPath()}
            placeholder="/nas/photos"
            className="input flex-1"
          />
          <button
            onClick={addPath}
            className="btn-secondary flex items-center gap-1"
          >
            <PlusIcon className="w-4 h-4" />
            Add
          </button>
        </div>

        <button
          onClick={savePaths}
          disabled={updateSettings.isPending}
          className="btn-primary mt-4"
        >
          {updateSettings.isPending ? 'Saving...' : 'Save Paths'}
        </button>
      </div>

      <div className="pt-4 border-t border-dark-200 dark:border-dark-700">
        <h3 className="font-medium mb-2">Manual Scan</h3>
        <p className="text-sm text-dark-500 mb-4">
          Trigger a manual scan of your NAS folders
        </p>
        <button
          onClick={() => triggerScan.mutate()}
          disabled={triggerScan.isPending}
          className="btn-primary flex items-center gap-2"
        >
          <ArrowPathIcon className={clsx('w-5 h-5', triggerScan.isPending && 'animate-spin')} />
          {triggerScan.isPending ? 'Scanning...' : 'Start Scan'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  
  // Fetch settings
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const response = await usersApi.getSettings();
      return response.data;
    },
  });
  
  // Fetch jobs
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await jobsApi.list({ limit: 5 });
      return response.data;
    },
    refetchInterval: 5000,
  });
  
  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      await usersApi.updateSettings(newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });
  
  // Profile update mutation
  const updateProfile = useMutation({
    mutationFn: async (data: { full_name?: string }) => {
      await usersApi.updateProfile(data);
    },
    onSuccess: (_, data) => {
      updateUser(data);
      toast.success('Profile updated');
    },
  });
  
  // Trigger scan mutation
  const triggerScan = useMutation({
    mutationFn: async () => {
      await jobsApi.triggerScan();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Scan started');
    },
  });
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const allPwRulesMet = PASSWORD_RULES.every((r) => r.test(newPassword));

  const changePassword = useMutation({
    mutationFn: async () => {
      await usersApi.changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNewPasswordTouched(false);
      setPwError(null);
      toast.success('Password changed successfully');
    },
    onError: (error: unknown) => {
      setPwError(extractErrorMessage(error));
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!allPwRulesMet) {
      setPwError('Please satisfy all password requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    changePassword.mutate();
  };
  
  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'nas', name: 'NAS Storage', icon: ServerIcon },
    { id: 'ai', name: 'AI Features', icon: CpuChipIcon },
    { id: 'indexing', name: 'Indexing', icon: ArrowPathIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
  ];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Cog6ToothIcon className="w-7 h-7" />
        Settings
      </h1>
      
      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-dark-100 dark:hover:bg-dark-800'
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold">Profile Settings</h2>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input bg-dark-50 dark:bg-dark-700"
                />
                <p className="text-xs text-dark-500 mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  defaultValue={user?.full_name || ''}
                  onBlur={(e) => {
                    if (e.target.value !== user?.full_name) {
                      updateProfile.mutate({ full_name: e.target.value });
                    }
                  }}
                  className="input"
                />
              </div>
            </div>
          )}
          
          {/* NAS Tab */}
          {activeTab === 'nas' && (
            <NasTab settings={settings} updateSettings={updateSettings} triggerScan={triggerScan} />
          )}
          
          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold">AI Features</h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Face Recognition</p>
                    <p className="text-sm text-dark-500">Detect and group faces in your photos</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.face_recognition_enabled ?? true}
                    onChange={(e) => updateSettings.mutate({ face_recognition_enabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">CLIP Tagging</p>
                    <p className="text-sm text-dark-500">Auto-tag photos using AI semantic understanding</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.clip_enabled ?? true}
                    onChange={(e) => updateSettings.mutate({ clip_enabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Object Detection (YOLO)</p>
                    <p className="text-sm text-dark-500">Detect objects in your photos</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.yolo_enabled ?? true}
                    onChange={(e) => updateSettings.mutate({ yolo_enabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>
              
              <div className="pt-4 border-t border-dark-200 dark:border-dark-700">
                <h3 className="font-medium mb-4">Re-process AI</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => jobsApi.triggerFaceProcessing()}
                    className="btn-secondary"
                  >
                    Process Faces
                  </button>
                  <button
                    onClick={() => jobsApi.triggerClipProcessing()}
                    className="btn-secondary"
                  >
                    Process CLIP
                  </button>
                  <button
                    onClick={() => jobsApi.triggerYoloProcessing()}
                    className="btn-secondary"
                  >
                    Process YOLO
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Indexing Tab */}
          {activeTab === 'indexing' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold">Indexing Settings</h2>
              
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-index</p>
                  <p className="text-sm text-dark-500">Automatically scan for new photos</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings?.auto_index ?? true}
                  onChange={(e) => updateSettings.mutate({ auto_index: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </label>
              
              <div>
                <label className="block text-sm font-medium mb-1">Scan Interval (hours)</label>
                <input
                  type="number"
                  value={settings?.index_interval_hours ?? 24}
                  onChange={(e) => updateSettings.mutate({ index_interval_hours: parseInt(e.target.value) })}
                  min={1}
                  max={168}
                  className="input w-32"
                />
              </div>
              
              {/* Recent jobs */}
              {jobs && jobs.length > 0 && (
                <div className="pt-4 border-t border-dark-200 dark:border-dark-700">
                  <h3 className="font-medium mb-4">Recent Jobs</h3>
                  <div className="space-y-2">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-700 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{job.job_type}</p>
                          <p className="text-sm text-dark-500">
                            {job.processed_items} / {job.total_items} items
                          </p>
                        </div>
                        <span
                          className={clsx(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            job.status === 'completed' && 'bg-green-100 text-green-700',
                            job.status === 'running' && 'bg-blue-100 text-blue-700',
                            job.status === 'failed' && 'bg-red-100 text-red-700',
                            job.status === 'pending' && 'bg-yellow-100 text-yellow-700'
                          )}
                        >
                          {job.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold">Security</h2>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <h3 className="font-medium">Change Password</h3>

                {pwError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    {pwError.split('\n').map((line, i) => (
                      <p key={i} className="text-sm text-red-700 flex items-start gap-1.5">
                        <XCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (!newPasswordTouched) setNewPasswordTouched(true);
                    }}
                    className="input"
                    required
                  />
                  {newPasswordTouched && (
                    <ul className="mt-2 space-y-1">
                      {PASSWORD_RULES.map((rule) => {
                        const met = rule.test(newPassword);
                        return (
                          <li key={rule.label} className="flex items-center gap-1.5 text-xs">
                            {met ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
                            )}
                            <span className={met ? 'text-green-700' : 'text-dark-500'}>{rule.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {!newPasswordTouched && (
                    <p className="text-xs text-dark-500 mt-1">
                      Must be 8+ characters with uppercase, lowercase, and a number.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    required
                  />
                  {confirmPassword.length > 0 && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                      {newPassword === confirmPassword ? (
                        <><CheckCircleIcon className="w-3.5 h-3.5" /> Passwords match</>
                      ) : (
                        <><XCircleIcon className="w-3.5 h-3.5" /> Passwords do not match</>
                      )}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={changePassword.isPending}
                  className="btn-primary"
                >
                  {changePassword.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
