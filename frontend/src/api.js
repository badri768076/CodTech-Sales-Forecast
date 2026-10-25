import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getMeta = () => api.get('/meta').then((r) => r.data);
export const getStats = (params) => api.get('/stats', { params }).then((r) => r.data);
export const getData = (params) => api.get('/data', { params }).then((r) => r.data);
export const loadSample = () => api.get('/sample').then((r) => r.data);
export const uploadCsv = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api
    .post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
};
export const runForecast = (payload) => api.post('/forecast', payload).then((r) => r.data);

export default api;
