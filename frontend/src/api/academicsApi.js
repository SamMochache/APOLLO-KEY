// frontend/src/api/academicsApi.js
import api from "./axios";

// Classes
export const getClasses = async () => {
  const res = await api.get("/academics/classes/");
  return res.data;
};

export const getClass = async (id) => {
  const res = await api.get(`/academics/classes/${id}/`);
  return res.data;
};

export const createClass = async (data) => {
  const res = await api.post("/academics/classes/", data);
  return res.data;
};

export const updateClass = async (id, data) => {
  const res = await api.put(`/academics/classes/${id}/`, data);
  return res.data;
};

export const deleteClass = async (id) => {
  const res = await api.delete(`/academics/classes/${id}/`);
  return res.data;
};

export const getClassTimetable = async (id) => {
  const res = await api.get(`/academics/classes/${id}/timetable/`);
  return res.data;
};

// Subjects
export const getSubjects = async () => {
  const res = await api.get("/academics/subjects/");
  return res.data;
};

export const getSubject = async (id) => {
  const res = await api.get(`/academics/subjects/${id}/`);
  return res.data;
};

export const createSubject = async (data) => {
  const res = await api.post("/academics/subjects/", data);
  return res.data;
};

export const updateSubject = async (id, data) => {
  const res = await api.put(`/academics/subjects/${id}/`, data);
  return res.data;
};

export const deleteSubject = async (id) => {
  const res = await api.delete(`/academics/subjects/${id}/`);
  return res.data;
};

// Timetable
export const getTimetable = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const res = await api.get(`/academics/timetable/${queryString ? `?${queryString}` : ""}`);
  return res.data;
};

export const getTimetableEntry = async (id) => {
  const res = await api.get(`/academics/timetable/${id}/`);
  return res.data;
};

export const createTimetableEntry = async (data) => {
  const res = await api.post("/academics/timetable/", data);
  return res.data;
};

export const updateTimetableEntry = async (id, data) => {
  const res = await api.put(`/academics/timetable/${id}/`, data);
  return res.data;
};

export const deleteTimetableEntry = async (id) => {
  const res = await api.delete(`/academics/timetable/${id}/`);
  return res.data;
};

// Bulk operations
export const bulkCreateTimetable = async (entries) => {
  const res = await api.post("/academics/timetable/bulk_create/", { entries });
  return res.data;
};

export const bulkUpdateTimetable = async (entries) => {
  const res = await api.post("/academics/timetable/bulk_update/", { entries });
  return res.data;
};

export const bulkDeleteTimetable = async (ids) => {
  const res = await api.delete("/academics/timetable/bulk_delete/", { data: { ids } });
  return res.data;
};

// Conflict checking
export const checkTimetableConflicts = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const res = await api.get(`/academics/timetable/conflicts/${queryString ? `?${queryString}` : ""}`);
  return res.data;
};