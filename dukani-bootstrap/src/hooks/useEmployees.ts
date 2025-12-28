import { useState, useEffect, useRef } from 'react';
import { employeeService } from '../services/employeeService';
import { Employee } from '../stores/useDataStore';
import { useEmployeesData } from '../stores/useDataStore';

// Cache for employee data to prevent unnecessary refetches
const employeeDataCache = new Map<string, {
  data: Employee[];
  timestamp: number;
}>();

// Cache timeout (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

interface UseEmployeesOptions {
  autoFetch?: boolean;
  cacheKey?: string;
  activeOnly?: boolean;
}

interface UseEmployeesReturn {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEmployees(options: UseEmployeesOptions = {}): UseEmployeesReturn {
  const { autoFetch = true, cacheKey = 'default', activeOnly = true } = options;

  const preloadedEmployees = useEmployeesData();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchEmployees = async (forceRefresh = false) => {
    if (!isMountedRef.current) return;

    const cacheKeyWithType = `${cacheKey}_${activeOnly ? 'active' : 'all'}`;

    // Check preloaded data first (unless force refresh)
    if (!forceRefresh && preloadedEmployees.length > 0) {
      let filteredEmployees = preloadedEmployees;
      if (activeOnly) {
        filteredEmployees = preloadedEmployees.filter(emp => emp.status === 'active');
      }
      console.log(`✅ Using preloaded employees: ${filteredEmployees.length} employees`);
      setEmployees(filteredEmployees);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = employeeDataCache.get(cacheKeyWithType);
      if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        setEmployees(cached.data);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Fetch from API
    try {
      setLoading(true);
      setError(null);

      const data = await employeeService.getAllEmployees();

      // Filter if needed
      let filteredData = data;
      if (activeOnly) {
        filteredData = data.filter(emp => emp.status === 'active');
      }

      // Update cache
      employeeDataCache.set(cacheKeyWithType, {
        data: filteredData,
        timestamp: Date.now()
      });

      if (isMountedRef.current) {
        setEmployees(filteredData);
        setLoading(false);
        setError(null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employees';

      if (isMountedRef.current) {
        console.error('❌ Error fetching employees:', errorMessage);
        setError(errorMessage);
        setLoading(false);
      }
    }
  };

  const refetch = async () => {
    await fetchEmployees(true);
  };

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchEmployees();
    }
  }, [autoFetch, cacheKey, activeOnly]);

  return {
    employees,
    loading,
    error,
    refetch
  };
}
