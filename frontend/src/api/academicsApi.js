import api from "./axios";

export const getClasses = async () => {
  const res = await api.get("/academics/classes/");
  return res.data;
};

export const getSubjects = async () => {
  const res = await api.get("/academics/subjects/");
  return res.data;
};

export const getTimetable = async () => {
  const res = await api.get("/academics/timetable/");
  return res.data;
};