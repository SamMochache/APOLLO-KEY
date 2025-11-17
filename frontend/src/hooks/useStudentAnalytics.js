// frontend/src/hooks/useStudentAnalytics.js - FIXED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsService from '../api/analyticsService';

/**
 * Custom hook for student analytics - FIXED to prevent infinite loops
 */
export function useStudentAnalytics(studentId = null, initialFilters = {}, autoFetch = true) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    ...initialFilters
  });

  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);
  
  // ✅ FIX: Track if we've fetched already to prevent re-fetching on every render
  const hasFetchedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // ✅ FIX: Wrap fetchAnalytics in useCallback to stabilize its reference
  const fetchAnalytics = useCallback(async (customFilters = null) => {
    if (!studentId) {
      console.log('⚠️ No student ID provided, skipping fetch');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {
      const filterData = customFilters || filters;
      console.log(`📊 Fetching analytics for student ${studentId} with filters:`, filterData);
      
      const data = await analyticsService.getStudentPerformance(studentId, filterData);
      
      if (mountedRef.current) {
        setAnalytics(data);
        hasFetchedRef.current = true;
        
        // Show info if no data
        if (!data.analytics || Object.keys(data.analytics).length === 0) {
          setError({
            type: 'info',
            message: 'No analytics data available for the selected filters'
          });
        }
      }
    } catch (err) {
      if (mountedRef.current && err.name !== 'AbortError') {
        console.error('❌ Analytics fetch error:', err);
        setError({
          type: 'error',
          message: err.message || 'Failed to load analytics'
        });
        setAnalytics(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [studentId, filters]); // ✅ Only depend on studentId and filters

  // Update filters and optionally refetch
  const updateFilters = useCallback((newFilters, shouldFetch = true) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    if (shouldFetch) {
      fetchAnalytics({ ...filters, ...newFilters });
    }
  }, [filters, fetchAnalytics]);

  // Clear specific filter
  const clearFilter = useCallback((filterKey) => {
    updateFilters({ [filterKey]: '' });
  }, [updateFilters]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const clearedFilters = {
      startDate: '',
      endDate: ''
    };
    setFilters(clearedFilters);
    fetchAnalytics(clearedFilters);
  }, [fetchAnalytics]);

  // Refresh data (clear cache and refetch)
  const refresh = useCallback(() => {
    analyticsService.clearCache();
    hasFetchedRef.current = false;
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Export PDF report
  const exportPDF = useCallback(async () => {
    try {
      const result = await analyticsService.exportAnalyticsPDF(studentId, filters);
      return { success: true, ...result };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to export report'
      };
    }
  }, [studentId, filters]);

  // ✅ FIX: Auto-fetch only once when conditions are met
  useEffect(() => {
    if (autoFetch && studentId && !hasFetchedRef.current) {
      console.log(`🚀 Auto-fetching analytics for student ID: ${studentId}`);
      fetchAnalytics();
    }
    // ✅ CRITICAL: Only depend on autoFetch and studentId
    // Don't include fetchAnalytics because it changes on every render
  }, [autoFetch, studentId]); // ✅ Removed fetchAnalytics from dependencies

  return {
    // Data
    analytics,
    loading,
    error,
    filters,
    
    // Actions
    fetchAnalytics,
    updateFilters,
    clearFilter,
    clearAllFilters,
    refresh,
    exportPDF,
    
    // Computed values
    hasData: analytics && analytics.analytics && Object.keys(analytics.analytics).length > 0,
    isEmpty: analytics && analytics.analytics && Object.keys(analytics.analytics).length === 0,
    hasError: error !== null,
    isLoading: loading
  };
}