/**
 * PreloadIndicator Component
 * Shows progress during initial data preload at login
 * Now uses unified loading system - non-blocking!
 */

import React, { useEffect, useRef } from 'react';
import { usePreloadStatus } from '../stores/useDataStore';
import { useLoadingJob } from '../hooks/useLoadingJob';

const PreloadIndicator: React.FC = () => {
  const { isPreloading, progress, status } = usePreloadStatus();
  const { startLoading, updateProgress, completeLoading } = useLoadingJob();
  const jobIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPreloading && !jobIdRef.current) {
      // Start loading job when preload begins
      jobIdRef.current = startLoading('Loading your data...');
    }

    if (jobIdRef.current) {
      // Update progress as preload progresses
      updateProgress(jobIdRef.current, progress);

      // Complete when done
      if (!isPreloading && progress >= 100) {
        completeLoading(jobIdRef.current);
        jobIdRef.current = null;
      }
    }
  }, [isPreloading, progress, startLoading, updateProgress, completeLoading]);

  // No visible component needed - GlobalLoadingProgress handles it!
  return null;
};

export default PreloadIndicator;
