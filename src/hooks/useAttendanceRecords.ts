import { useState, useEffect, useRef } from 'react';
import { employeeService } from '../services/employeeService';
import { AttendanceRecord } from '../stores/useDataStore';
import { useAttendanceRecordsData } from '../stores/useDataStore';

// Cache for attendance records data to prevent unnecessary refetches
const attendanceRecordsDataCache = new Map<string, {
  data: AttendanceRecord[];
  timestamp: number;
}>();

// Cache timeout (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

interface UseAttendanceRecordsOptions {
  employeeId?: string;
  days?: number;
  autoFetch?: boolean;
  cacheKey?: string;
}

interface UseAttendanceRecordsReturn {
  attendanceRecords: AttendanceRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAttendanceRecords(options: UseAttendanceRecordsOptions = {}): UseAttendanceRecordsReturn {
  const { employeeId, days = 30, autoFetch = true, cacheKey = 'default' } = options;

  const preloadedAttendanceRecords = useAttendanceRecordsData();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAttendanceRecords = async (forceRefresh = false) => {
    if (!isMountedRef.current) return;

    const cacheKeyWithParams = `${cacheKey}_${employeeId || 'all'}_${days}`;

    // Check preloaded data first (unless force refresh)
    if (!forceRefresh && preloadedAttendanceRecords.length > 0) {
      let filteredRecords = preloadedAttendanceRecords;

      // Filter by employee if specified
      if (employeeId) {
        filteredRecords = filteredRecords.filter(record => record.employeeId === employeeId);
      }

      // Filter by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffString = cutoffDate.toISOString().split('T')[0];
      filteredRecords = filteredRecords.filter(record => record.attendanceDate >= cutoffString);

      console.log(`✅ Using preloaded attendance records: ${filteredRecords.length} records`);
      setAttendanceRecords(filteredRecords);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = attendanceRecordsDataCache.get(cacheKeyWithParams);
      if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        setAttendanceRecords(cached.data);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Fetch from API
    try {
      setLoading(true);
      setError(null);

      const data = await employeeService.getAllAttendanceRecords();

      // Filter by employee if specified
      let filteredData = data;
      if (employeeId) {
        filteredData = data.filter(record => record.employeeId === employeeId);
      }

      // Filter by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffString = cutoffDate.toISOString().split('T')[0];
      filteredData = filteredData.filter(record => record.attendanceDate >= cutoffString);

      // Update cache
      attendanceRecordsDataCache.set(cacheKeyWithParams, {
        data: filteredData,
        timestamp: Date.now()
      });

      if (isMountedRef.current) {
        setAttendanceRecords(filteredData);
        setLoading(false);
        setError(null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance records';

      if (isMountedRef.current) {
        console.error('❌ Error fetching attendance records:', errorMessage);
        setError(errorMessage);
        setLoading(false);
      }
    }
  };

  const refetch = async () => {
    await fetchAttendanceRecords(true);
  };

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchAttendanceRecords();
    }
  }, [autoFetch, employeeId, days, cacheKey]);

  return {
    attendanceRecords,
    loading,
    error,
    refetch
  };
}
