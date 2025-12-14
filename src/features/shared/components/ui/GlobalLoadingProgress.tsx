import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface LoadingJob {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  timestamp: number;
  error?: string;
}

interface GlobalLoadingProgressProps {
  isVisible: boolean;
  jobs?: LoadingJob[];
  onCancel?: (jobId: string) => void;
  className?: string;
}

const GlobalLoadingProgress: React.FC<GlobalLoadingProgressProps> = ({
  isVisible,
  jobs = [],
  onCancel,
  className = ''
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Auto-dismiss when all jobs are completed
  useEffect(() => {
    if (jobs.length > 0 && jobs.every(job => job.status === 'completed')) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
      }, 1500); // Auto-dismiss after 1.5 seconds
      return () => clearTimeout(timer);
    } else {
      setIsDismissed(false);
    }
  }, [jobs]);

  // Reset dismissed state when new jobs come in
  useEffect(() => {
    if (jobs.some(job => job.status === 'pending' || job.status === 'processing')) {
      setIsDismissed(false);
    }
  }, [jobs]);

  if (!isVisible || isDismissed) return null;

  // Check status for icon
  const hasFailed = jobs.some(job => job.status === 'failed');
  const allCompleted = jobs.length > 0 && jobs.every(job => job.status === 'completed');
  const isProcessing = jobs.some(job => job.status === 'processing' || job.status === 'pending');

  return (
    <>
      {/* Non-blocking overlay - allows clicking through */}
      <div className="fixed inset-0 z-[9998] pointer-events-none" />
      
      {/* Minimal spinning loader - with pointer events only on itself */}
      <div 
        className={`fixed top-20 right-4 z-[9999] pointer-events-auto animate-in fade-in duration-200 ${className}`}
        title={jobs.length > 0 ? `${jobs.length} operation${jobs.length !== 1 ? 's' : ''} running` : 'Loading'}
      >
        <div className="relative">
          {/* Main spinner circle */}
          <div className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/50 flex items-center justify-center">
            {hasFailed ? (
              <XCircle className="w-6 h-6 text-red-500 animate-in zoom-in duration-200" />
            ) : allCompleted ? (
              <CheckCircle className="w-6 h-6 text-green-500 animate-in zoom-in duration-200" />
            ) : (
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            )}
          </div>
          
          {/* Outer ring animation for active loading */}
          {isProcessing && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
          )}
          
          {/* Success pulse effect */}
          {allCompleted && (
            <div className="absolute inset-0 rounded-full border-2 border-green-500/50 animate-ping" />
          )}
          
          {/* Error pulse effect */}
          {hasFailed && (
            <div className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping" />
          )}
        </div>
      </div>
      
      {/* Animation keyframes */}
      <style>{`
        @keyframes zoom-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-in.zoom-in {
          animation: zoom-in 0.3s ease-out;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-in.fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default GlobalLoadingProgress;
