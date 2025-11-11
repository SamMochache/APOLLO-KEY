// frontend/src/api/reportService.js
import api from './axios';

class ReportService {
  /**
   * Generate and download a single student report card
   * @param {Object} params - Report parameters
   * @param {number} params.student_id - Student ID
   * @param {number} params.class_id - Optional class ID
   * @param {string} params.term - Optional term (e.g., "Term 1", "Semester 1")
   * @param {string} params.academic_year - Optional academic year (e.g., "2024-2025")
   */
  async generateReport({ student_id, class_id, term, academic_year }) {
    try {
      const response = await api.post(
        '/academics/grades/generate-report/',
        {
          student_id,
          class_id,
          term,
          academic_year
        },
        {
          responseType: 'blob' // Important for file download
        }
      );

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `report_card_${student_id}_${academic_year || 'current'}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Report downloaded successfully' };
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw new Error(
        error.response?.data?.error || 
        'Failed to generate report card'
      );
    }
  }

  /**
   * Generate bulk report cards for a class
   * @param {Object} params - Report parameters
   * @param {number} params.class_id - Class ID
   * @param {string} params.term - Optional term
   * @param {string} params.academic_year - Optional academic year
   */
  async generateBulkReports({ class_id, term, academic_year }) {
    try {
      const response = await api.post(
        '/academics/grades/generate-bulk-reports/',
        {
          class_id,
          term,
          academic_year
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to generate bulk reports:', error);
      throw new Error(
        error.response?.data?.error || 
        'Failed to generate bulk reports'
      );
    }
  }

  /**
   * Preview report data before generating (useful for validation)
   * @param {number} student_id - Student ID
   * @param {number} class_id - Optional class ID
   */
  async previewReportData(student_id, class_id) {
    try {
      const response = await api.get('/academics/grades/student-report/', {
        params: { student_id, class_id }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to preview report data:', error);
      throw new Error('Failed to load report preview');
    }
  }
}

const reportService = new ReportService();

export default reportService;
export const {
  generateReport,
  generateBulkReports,
  previewReportData
} = reportService;