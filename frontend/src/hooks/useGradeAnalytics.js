// frontend/src/hooks/useGradeAnalytics.js
import { useState, useEffect, useCallback, useRef } from 'react';
import gradeAnalyticsService from '../api/gradeService';

/**
 * Custom hook for grade analytics with automatic data fetching,
 * caching, and error handling
 * 
 * @param {Object} initialFilters - Initial filter values
 * @param {boolean} autoFetch - Whether to fetch data automatically on mount
 * @returns {Object} Analytics data and control functions
 */
export function useGradeAnalytics(initialFilters = {}, autoFetch = true) {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    subject: '',
    class: '',
    startDate: '',
    endDate: '',
    ...initialFilters
  });

  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Fetch statistics
  const fetchStatistics = useCallback(async (customFilters = null) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {
      const filterData = customFilters || filters;
      const data = await gradeAnalyticsService.getStatistics(filterData);
      
      if (mountedRef.current) {
        setStatistics(data);
        
        // Show info if no data
        if (!data.overview || data.overview.totalAssessments === 0) {
          setError({
            type: 'info',
            message: 'No grade data available for the selected filters'
          });
        }
      }
    } catch (err) {
      if (mountedRef.current && err.name !== 'AbortError') {
        setError({
          type: 'error',
          message: err.message || 'Failed to load statistics'
        });
        setStatistics(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  // Update filters and optionally refetch
  const updateFilters = useCallback((newFilters, shouldFetch = true) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    if (shouldFetch) {
      fetchStatistics({ ...filters, ...newFilters });
    }
  }, [filters, fetchStatistics]);

  // Clear specific filter
  const clearFilter = useCallback((filterKey) => {
    updateFilters({ [filterKey]: '' });
  }, [updateFilters]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const clearedFilters = {
      subject: '',
      class: '',
      startDate: '',
      endDate: ''
    };
    setFilters(clearedFilters);
    fetchStatistics(clearedFilters);
  }, [fetchStatistics]);

  // Refresh data (clear cache and refetch)
  const refresh = useCallback(() => {
    gradeAnalyticsService.clearCache();
    fetchStatistics();
  }, [fetchStatistics]);

  // Export report
  const exportReport = useCallback(async () => {
    try {
      await gradeAnalyticsService.exportStatistics(filters);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to export report'
      };
    }
  }, [filters]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchStatistics();
    }
  }, []); // Only on mount

  return {
    // Data
    statistics,
    loading,
    error,
    filters,
    
    // Actions
    fetchStatistics,
    updateFilters,
    clearFilter,
    clearAllFilters,
    refresh,
    exportReport,
    
    // Computed values
    hasData: statistics && statistics.overview && statistics.overview.totalAssessments > 0,
    isEmpty: statistics && statistics.overview && statistics.overview.totalAssessments === 0,
    hasError: error !== null,
    isLoading: loading
  };
}

// Helper hook for fetching reference data (subjects, classes)
export function useGradeAnalyticsReferenceData() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [subjectsData, classesData] = await Promise.all([
          gradeAnalyticsService.getSubjects(),
          gradeAnalyticsService.getClasses()
        ]);
        
        setSubjects(subjectsData);
        setClasses(classesData);
      } catch (err) {
        setError(err.message || 'Failed to load reference data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    subjects,
    classes,
    loading,
    error
  };
}

// Example usage:
/*
function GradeAnalyticsDashboard() {
  const {
    statistics,
    loading,
    error,
    filters,
    updateFilters,
    clearAllFilters,
    refresh,
    exportReport,
    hasData,
    isEmpty
  } = useGradeAnalytics();

  const {
    subjects,
    classes,
    loading: refLoading
  } = useGradeAnalyticsReferenceData();

  if (loading) return <Spinner />;
  if (error) return <ErrorAlert message={error.message} />;
  if (isEmpty) return <EmptyState />;

  return (
    <div>
      <Filters
        filters={filters}
        subjects={subjects}
        classes={classes}
        onChange={updateFilters}
        onClear={clearAllFilters}
        onRefresh={refresh}
      />
      
      <Overview data={statistics.overview} />
      <Charts data={statistics} />
      
      <ExportButton onClick={exportReport} />
    </div>
  );
}
*/