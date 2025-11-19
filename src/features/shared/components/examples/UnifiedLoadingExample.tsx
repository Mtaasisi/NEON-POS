/**
 * Unified Loading System - Example Component
 * 
 * This component demonstrates how to use the unified loading system
 * in various scenarios throughout your app.
 */

import React, { useState } from 'react';
import { useLoadingJob } from '../../../../hooks/useLoadingJob';
import toast from 'react-hot-toast';

const UnifiedLoadingExample: React.FC = () => {
  const { startLoading, updateProgress, completeLoading, failLoading, withLoading } = useLoadingJob();
  const [result, setResult] = useState<string>('');

  // Example 1: Simple operation with manual progress tracking
  const handleSimpleOperation = async () => {
    const jobId = startLoading('Processing simple operation...');
    
    try {
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateProgress(jobId, 50);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateProgress(jobId, 100);
      
      completeLoading(jobId);
      setResult('Simple operation completed!');
      toast.success('Operation successful!');
    } catch (error: any) {
      failLoading(jobId, error.message);
      toast.error('Operation failed!');
    }
  };

  // Example 2: Using withLoading wrapper (cleaner code)
  const handleAutoOperation = async () => {
    try {
      await withLoading('Processing with auto-loading...', async (updateProgress) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateProgress(33);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateProgress(66);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateProgress(100);
      });
      
      setResult('Auto operation completed!');
      toast.success('Operation successful!');
    } catch (error: any) {
      toast.error('Operation failed!');
    }
  };

  // Example 3: Multiple parallel operations
  const handleMultipleOperations = async () => {
    const job1 = startLoading('Uploading files...');
    const job2 = startLoading('Processing images...');
    const job3 = startLoading('Updating database...');
    
    try {
      // Simulate parallel operations
      await Promise.all([
        // Job 1
        (async () => {
          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            updateProgress(job1, i);
          }
          completeLoading(job1);
        })(),
        
        // Job 2
        (async () => {
          for (let i = 0; i <= 100; i += 20) {
            await new Promise(resolve => setTimeout(resolve, 300));
            updateProgress(job2, i);
          }
          completeLoading(job2);
        })(),
        
        // Job 3
        (async () => {
          for (let i = 0; i <= 100; i += 25) {
            await new Promise(resolve => setTimeout(resolve, 400));
            updateProgress(job3, i);
          }
          completeLoading(job3);
        })()
      ]);
      
      setResult('All operations completed!');
      toast.success('All operations successful!');
    } catch (error: any) {
      toast.error('Some operations failed!');
    }
  };

  // Example 4: Operation that fails
  const handleFailingOperation = async () => {
    const jobId = startLoading('Processing operation that will fail...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateProgress(jobId, 50);
      
      // Simulate an error
      throw new Error('Simulated error - something went wrong!');
    } catch (error: any) {
      failLoading(jobId, error.message);
      setResult('Operation failed: ' + error.message);
      toast.error('Operation failed!');
    }
  };

  // Example 5: File upload simulation
  const handleFileUpload = async () => {
    const files = ['file1.jpg', 'file2.jpg', 'file3.jpg', 'file4.jpg', 'file5.jpg'];
    const jobId = startLoading(`Uploading ${files.length} files...`);
    
    try {
      for (let i = 0; i < files.length; i++) {
        // Simulate file upload
        await new Promise(resolve => setTimeout(resolve, 800));
        const progress = ((i + 1) / files.length) * 100;
        updateProgress(jobId, progress);
      }
      
      completeLoading(jobId);
      setResult(`Successfully uploaded ${files.length} files!`);
      toast.success('All files uploaded!');
    } catch (error: any) {
      failLoading(jobId, error.message);
      toast.error('Upload failed!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Unified Loading System Examples
        </h1>
        <p className="text-gray-600 mb-6">
          Test different loading scenarios. The loading indicator appears in the top-right corner
          and doesn't block page interactions!
        </p>

        {/* Example Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <button
            onClick={handleSimpleOperation}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Simple Operation
          </button>

          <button
            onClick={handleAutoOperation}
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            Auto Loading
          </button>

          <button
            onClick={handleMultipleOperations}
            className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            Multiple Operations
          </button>

          <button
            onClick={handleFailingOperation}
            className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          >
            Failing Operation
          </button>

          <button
            onClick={handleFileUpload}
            className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
          >
            File Upload
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Result:</p>
            <p className="text-sm text-blue-700">{result}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            💡 Try These:
          </h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Click any button to start a loading operation</li>
            <li>Notice the loading indicator in the top-right corner</li>
            <li>Try clicking multiple buttons - they all work simultaneously!</li>
            <li>Click "Details" in the loading indicator to see all active jobs</li>
            <li>Click "Minimize" to collapse the loading indicator</li>
            <li>Try interacting with other parts of the page while loading</li>
            <li>The loading indicator auto-dismisses when complete</li>
          </ul>
        </div>

        {/* Code Examples */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg text-white overflow-x-auto">
          <h3 className="text-sm font-semibold mb-2">📝 Code Example:</h3>
          <pre className="text-xs">
{`import { useLoadingJob } from '@/hooks/useLoadingJob';

const MyComponent = () => {
  const { startLoading, updateProgress, completeLoading } = useLoadingJob();
  
  const handleSave = async () => {
    const jobId = startLoading('Saving data...');
    
    try {
      await saveData();
      updateProgress(jobId, 50);
      
      await updateCache();
      updateProgress(jobId, 100);
      
      completeLoading(jobId);
    } catch (error) {
      failLoading(jobId, error.message);
    }
  };
  
  return <button onClick={handleSave}>Save</button>;
};`}
          </pre>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Non-Blocking</h3>
              <p className="text-sm text-gray-600">
                Users can continue clicking and interacting with the page while operations are loading
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Multi-Operation</h3>
              <p className="text-sm text-gray-600">
                Track multiple loading operations simultaneously with individual progress bars
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Auto-Dismiss</h3>
              <p className="text-sm text-gray-600">
                Automatically disappears when operations complete, keeping the UI clean
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Minimizable</h3>
              <p className="text-sm text-gray-600">
                Can be minimized to a small icon to save screen space while still showing status
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedLoadingExample;

