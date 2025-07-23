'use client';

import { useEffect } from 'react';

/**
 * Hook to maintain mobile viewport stability when large content appears
 * Prevents mobile navbar displacement issues on iOS Safari and other browsers
 */
export function useMobileViewportStability() {
  useEffect(() => {
    // Only run on mobile devices
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;

    let rafId: number;
    let isStabilizing = false;

    const stabilizeViewport = () => {
      if (isStabilizing) return;
      isStabilizing = true;

      rafId = requestAnimationFrame(() => {
        // Force a layout recalculation to ensure mobile navbar positioning
        const mobileNavbar = document.querySelector('nav[class*="fixed bottom-0"]');
        if (mobileNavbar) {
          // Temporarily force re-render by toggling a style property
          const currentTransform = (mobileNavbar as HTMLElement).style.transform;
          (mobileNavbar as HTMLElement).style.transform = 'translateZ(0)';
          
          // Reset after a frame
          requestAnimationFrame(() => {
            (mobileNavbar as HTMLElement).style.transform = currentTransform;
            isStabilizing = false;
          });
        } else {
          isStabilizing = false;
        }
      });
    };

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(stabilizeViewport, 150);
    };

    // Scroll handler for iOS Safari viewport changes
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(stabilizeViewport, 100);
    };

    // Listen for viewport changes
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also listen for orientation changes (mobile specific)
    window.addEventListener('orientationchange', () => {
      setTimeout(stabilizeViewport, 500); // iOS needs more time for orientation
    });

    // Initial stabilization
    stabilizeViewport();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(resizeTimeout);
      clearTimeout(scrollTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('orientationchange', stabilizeViewport);
    };
  }, []);
}
