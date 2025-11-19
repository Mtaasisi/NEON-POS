/**
 * Custom hook for managing loading jobs in the unified loading system
 * 
 * Usage:
 * ```tsx
 * import { useLoadingJob } from '@/hooks/useLoadingJob';
 * 
 * function MyComponent() {
 *   const { startLoading, updateProgress, completeLoading, failLoading } = useLoadingJob();
 *   
 *   const handleOperation = async () => {
 *     const jobId = startLoading('Saving product...');
 *     
 *     try {
 *       // Your async operation
 *       await someAsyncOperation();
 *       updateProgress(jobId, 50);
 *       
 *       await anotherAsyncOperation();
 *       updateProgress(jobId, 100);
 *       
 *       completeLoading(jobId);
 *     } catch (error) {
 *       failLoading(jobId, error.message);
 *     }
 *   };
 * }
 * ```
 */

import { useCallback } from 'react';
import { useLoading } from '../context/LoadingContext';

export const useLoadingJob = () => {
  const { addJob, updateJob, removeJob } = useLoading();

  /**
   * Start a new loading job
   * @param title - The title/description of the loading job
   * @returns The job ID to use for updating/completing the job
   */
  const startLoading = useCallback((title: string): string => {
    const jobId = addJob(title);
    // Immediately mark as processing
    updateJob(jobId, { status: 'processing', progress: 0 });
    return jobId;
  }, [addJob, updateJob]);

  /**
   * Update the progress of a loading job
   * @param jobId - The job ID returned from startLoading
   * @param progress - Progress percentage (0-100)
   */
  const updateProgress = useCallback((jobId: string, progress: number) => {
    updateJob(jobId, { 
      status: 'processing', 
      progress: Math.min(100, Math.max(0, progress)) 
    });
  }, [updateJob]);

  /**
   * Mark a loading job as completed
   * @param jobId - The job ID returned from startLoading
   */
  const completeLoading = useCallback((jobId: string) => {
    updateJob(jobId, { status: 'completed', progress: 100 });
    // Auto-remove after 2 seconds
    setTimeout(() => {
      removeJob(jobId);
    }, 2000);
  }, [updateJob, removeJob]);

  /**
   * Mark a loading job as failed
   * @param jobId - The job ID returned from startLoading
   * @param error - Error message to display
   */
  const failLoading = useCallback((jobId: string, error: string) => {
    updateJob(jobId, { status: 'failed', error });
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeJob(jobId);
    }, 5000);
  }, [updateJob, removeJob]);

  /**
   * Execute an async operation with automatic loading management
   * @param title - The title/description of the loading job
   * @param operation - The async operation to execute
   * @returns The result of the operation
   */
  const withLoading = useCallback(async <T,>(
    title: string,
    operation: (updateProgress: (progress: number) => void) => Promise<T>
  ): Promise<T> => {
    const jobId = startLoading(title);
    
    try {
      const result = await operation((progress) => updateProgress(jobId, progress));
      completeLoading(jobId);
      return result;
    } catch (error: any) {
      failLoading(jobId, error?.message || 'Operation failed');
      throw error;
    }
  }, [startLoading, updateProgress, completeLoading, failLoading]);

  return {
    startLoading,
    updateProgress,
    completeLoading,
    failLoading,
    withLoading
  };
};

export default useLoadingJob;

