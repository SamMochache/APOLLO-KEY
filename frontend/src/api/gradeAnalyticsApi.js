// Real API integration with caching
import api from '../api/axios';

const gradeAnalyticsApi = {
  getGradeStatistics: async (filters) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters to params
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.class) params.append('class', filters.class);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      
      const response = await api.get(`/academics/grades/statistics/?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch grade statistics:', error);
      throw error;
    }
  },
  
  getSubjects: async () => {
    try {
      const response = await api.get('/academics/subjects/');
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      return [];
    }
  },
  
  getClasses: async () => {
    try {
      const response = await api.get('/academics/classes/');
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      return [];
    }
  }
};

export default gradeAnalyticsApi;