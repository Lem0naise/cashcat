'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current viewport is desktop size (lg breakpoint and above)
 * Handles SSR properly and provides responsive breakpoint detection
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Function to check if we're on desktop
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
    };

    // Check on mount
    checkIsDesktop();

    // Add resize listener
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkIsDesktop, 100); // Debounce for performance
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isDesktop;
}
