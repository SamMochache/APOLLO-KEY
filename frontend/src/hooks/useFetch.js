// frontend/src/hooks/useFetch.js - IMPROVED VERSION
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for handling async data fetching with automatic cancellation
 * 
 * @param {Function} asyncFn - Async function to execute
 * @param {Array} deps - Dependencies array (like useEffect)
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Execute on mount (default: true)
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 * @param {number} options.retryCount - Number of retries on failure (default: 0)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * 
 * @returns {Object} - { data, loading, error, refetch, cancel }
 */
export default function useFetch(asyncFn, deps = [], options = {}) {
  const { 
    immediate = true,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async (...args) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      // Pass abort signal to async function
      const result = await asyncFn({ signal: controller.signal }, ...args);
      
      // Only update state if component is still mounted and request wasn't cancelled
      if (mountedRef.current && !controller.signal.aborted) {
        setData(result);
        setError(null);
        onSuccess?.(result);
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        console.log('Request was cancelled');
        return;
      }

      if (mountedRef.current && !controller.signal.aborted) {
        // Retry logic
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++;
          console.log(`Retrying... Attempt ${retryCountRef.current}/${retryCount}`);
          
          setTimeout(() => {
            if (mountedRef.current) {
              execute(...args);
            }
          }, retryDelay);
          return;
        }

        setError(err);
        setData(null);
        onError?.(err);
        retryCountRef.current = 0; // Reset retry count
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [asyncFn, onSuccess, onError, retryCount, retryDelay]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    
    // Cleanup on dependency change
    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { 
    data, 
    loading, 
    error, 
    refetch: execute,
    cancel
  };
}


// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Basic usage
/*
function StudentList() {
  const { data: students, loading, error, refetch } = useFetch(
    async ({ signal }) => {
      const response = await api.get('/academics/classes/1/students/', { signal });
      return response.data;
    },
    [], // dependencies
    { immediate: true }
  );

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {students?.map(s => <div key={s.id}>{s.name}</div>)}
    </div>
  );
}
*/

// Example 2: With callbacks and retry
/*
function AttendanceRecords() {
  const { data, loading, error, refetch, cancel } = useFetch(
    async ({ signal }) => {
      const response = await api.get('/academics/attendance/', { signal });
      return response.data;
    },
    [],
    {
      immediate: true,
      retryCount: 3,
      retryDelay: 2000,
      onSuccess: (data) => {
        console.log('Loaded attendance:', data);
        toast.success('Data loaded successfully!');
      },
      onError: (err) => {
        console.error('Failed to load:', err);
        toast.error('Failed to load data');
      }
    }
  );

  return (
    <div>
      <button onClick={refetch}>Reload</button>
      <button onClick={cancel}>Cancel</button>
      {loading && <Spinner />}
      {error && <ErrorAlert message={error.message} />}
      {data && <DataTable data={data} />}
    </div>
  );
}
*/

// Example 3: With dependencies (refetch when filters change)
/*
function FilteredAttendance() {
  const [classId, setClassId] = useState(null);
  const [date, setDate] = useState(new Date());

  const { data, loading, error } = useFetch(
    async ({ signal }) => {
      if (!classId) return null;
      const params = new URLSearchParams({ class_id: classId, date });
      const response = await api.get(`/academics/attendance/?${params}`, { signal });
      return response.data;
    },
    [classId, date], // Refetch when these change
    { immediate: false } // Don't fetch until classId is set
  );

  return (
    <div>
      <select onChange={(e) => setClassId(e.target.value)}>
        <option value="">Select Class</option>
        <option value="1">Class A</option>
      </select>
      <input type="date" onChange={(e) => setDate(e.target.value)} />
      {loading && <Spinner />}
      {data && <AttendanceTable data={data} />}
    </div>
  );
}
*/