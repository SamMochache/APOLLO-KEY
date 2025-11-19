// frontend/src/hooks/useAnalytics.js
import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsService from '../api/analyticsService';

/**
 * Custom hook for managing student analytics data
 * @param {number} studentId - Student ID to fetch analytics for
 * @param {boolean} autoFetch - Whether to fetch automatically on mount
 */
export function useAnalytics(studentId, autoFetch = true) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (refresh = false) => {
    if (!studentId) return;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getStudentPerformance(studentId, refresh);
      
      if (mountedRef.current) {
        setAnalytics(data);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current && err.name !== 'AbortError') {
        setError(err.message || 'Failed to load analytics');
        setAnalytics(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [studentId]);

  // Refresh analytics (clear cache and refetch)
  const refresh = useCallback(() => {
    analyticsService.clearCache();
    fetchAnalytics(true);
  }, [fetchAnalytics]);

  // Export analytics as PDF
  const exportPDF = useCallback(async (filename) => {
    if (!studentId) return { success: false, error: 'No student selected' };
    
    try {
      await analyticsService.exportAnalyticsPDF(studentId, filename);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [studentId]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && studentId) {
      fetchAnalytics();
    }
  }, [studentId, autoFetch, fetchAnalytics]);

  // Computed values
  const hasData = analytics !== null;
  const isEmpty = analytics && Object.keys(analytics).length === 0;
  const isStale = lastUpdated && (Date.now() - lastUpdated.getTime()) > 5 * 60 * 1000; // 5 min

  return {
    // Data
    analytics,
    loading,
    error,
    lastUpdated,
    
    // Actions
    fetchAnalytics,
    refresh,
    exportPDF,
    
    // Computed
    hasData,
    isEmpty,
    isStale,
    isLoading: loading
  };
}

/**
 * Custom hook for class analytics
 * @param {number} classId - Class ID to fetch analytics for
 */
export function useClassAnalytics(classId) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    if (!classId) return;
    
    setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getClassAnalytics(classId);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load class analytics');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (classId) {
      fetchAnalytics();
    }
  }, [classId, fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
    hasData: analytics !== null
  };
}

// Export both hooks as default for convenience
export default useAnalytics;