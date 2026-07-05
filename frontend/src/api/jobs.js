import api from './axios';

export const createJob = (data) => api.post('/jobs', data);
export const extractJob = (id) => api.post(`/jobs/${id}/extract`);
export const embedJob = (id) => api.post(`/jobs/${id}/embed`);
export const getJobs = () => api.get('/jobs');
export const getJobById = (id) => api.get(`/jobs/${id}`);
export const deleteJob = (id) => api.delete(`/jobs/${id}`);