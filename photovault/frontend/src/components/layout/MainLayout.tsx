import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '@/store/uiStore';
import Lightbox from '@/components/media/Lightbox';
import UploadModal from '@/components/media/UploadModal';
import clsx from 'clsx';

export default function MainLayout() {
  const location = useLocation();
  const { sidebarCollapsed, lightboxOpen, uploadModalOpen } = useUIStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);
  
  return (
    <div className="min-h-screen app-dot-grid">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      
      {/* Main content */}
      <div
        className={clsx(
          'transition-all duration-300 min-h-screen',
          sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'
        )}
      >
        {/* Header */}
        <Header onOpenMobileMenu={() => setMobileSidebarOpen(true)} />
        
        {/* Page content */}
        <main className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-[1480px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
      
      {/* Lightbox */}
      {lightboxOpen && <Lightbox />}

      {/* Upload modal */}
      {uploadModalOpen && <UploadModal />}
    </div>
  );
}
