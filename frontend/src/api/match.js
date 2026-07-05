import api from './axios';

export const createMatch = (data) => api.post('/match', data);
export const analyzeMatch = (id) => api.post(`/match/${id}/analyze`);
export const getMatches = () => api.get('/match');
export const getMatchById = (id) => api.get(`/match/${id}`);
export const deleteMatch = (id) => api.delete(`/match/${id}`);