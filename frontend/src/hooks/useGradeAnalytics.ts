import { useState, useEffect, useCallback, useRef } from 'react';
import gradeAnalyticsService from '../api/gradeAnalyticsService';
import { Attendance, Grade, PaginatedResponse } from '@types';

type Filters = Record<string, any>;

export function useGradeAnalytics(initialFilters: Filters = {}, autoFetch = true) {
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [filters, setFilters] = useState<Filters>({
    subject: '',
    class: '',
    startDate: '',
    endDate: '',
    ...initialFilters,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchStatistics = useCallback(async (customFilters: Filters | null = null) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const filterData = customFilters || filters;
      const data = await gradeAnalyticsService.getStatistics(filterData);
      if (mountedRef.current) {
        setStatistics(data);
        if (!data?.overview || data.overview.totalAssessments === 0) {
          setError({ type: 'info', message: 'No grade data available for the selected filters' });
        }
      }
    } catch (err: any) {
      if (mountedRef.current && err?.name !== 'AbortError') {
        setError({ type: 'error', message: err.message || 'Failed to load statistics' });
        setStatistics(null);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters: Filters, shouldFetch = true) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    if (shouldFetch) fetchStatistics({ ...filters, ...newFilters });
  }, [filters, fetchStatistics]);

  const clearFilter = useCallback((filterKey: string) => {
    updateFilters({ [filterKey]: '' });
  }, [updateFilters]);

  const clearAllFilters = useCallback(() => {
    const clearedFilters = { subject: '', class: '', startDate: '', endDate: '' };
    setFilters(clearedFilters);
    fetchStatistics(clearedFilters);
  }, [fetchStatistics]);

  const refresh = useCallback(() => {
    gradeAnalyticsService.clearCache?.();
    fetchStatistics();
  }, [fetchStatistics]);

  const exportReport = useCallback(async () => {
    try {
      await gradeAnalyticsService.exportStatistics(filters);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to export report' };
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    statistics,
    loading,
    error,
    filters,
    fetchStatistics,
    updateFilters,
    clearFilter,
    clearAllFilters,
    refresh,
    exportReport,
    hasData: Boolean(statistics?.overview && statistics.overview.totalAssessments > 0),
    isEmpty: Boolean(statistics?.overview && statistics.overview.totalAssessments === 0),
    hasError: error !== null,
    isLoading: loading,
  };
}

export function useGradeAnalyticsReferenceData() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [subjectsData, classesData] = await Promise.all([
          gradeAnalyticsService.getSubjects(),
          gradeAnalyticsService.getClasses(),
        ]);
        setSubjects(subjectsData);
        setClasses(classesData);
      } catch (err: any) {
        setError(err.message || 'Failed to load reference data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { subjects, classes, loading, error };
}
