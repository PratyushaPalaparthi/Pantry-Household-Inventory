import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import { useUIStore } from '@/store/uiStore';
import Lightbox from '@/components/media/Lightbox';
import UploadModal from '@/components/media/UploadModal';

export default function MainLayout() {
  const { lightboxOpen, uploadModalOpen } = useUIStore();

  // Every app here is a subdomain of the launcher, so dropping the first label
  // of the host points back at it. Nothing renders when there is no parent
  // domain, which leaves standalone deployments unchanged.
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  useEffect(() => {
    const labels = window.location.hostname.split('.');
    if (labels.length > 1) {
      setPortalUrl(`${window.location.protocol}//${labels.slice(1).join('.')}`);
    }
  }, []);

  return (
    <div className="min-h-screen app-dot-grid">
      <TopBar portalUrl={portalUrl} />

      {/* Bottom padding clears the mobile tab bar, so the last row of content
          is never trapped underneath it. */}
      <main className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-28 md:pb-8 max-w-[1480px] mx-auto w-full">
        <Outlet />
      </main>

      {lightboxOpen && <Lightbox />}
      {uploadModalOpen && <UploadModal />}
    </div>
  );
}
