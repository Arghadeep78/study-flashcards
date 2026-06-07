import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const cardsApi = {
  getAll: (params) => api.get('/cards', { params }),
  getOne: (id) => api.get(`/cards/${id}`),
  create: (data) => api.post('/cards', data),
  update: (id, data) => api.put(`/cards/${id}`, data),
  remove: (id) => api.delete(`/cards/${id}`),
  duplicate: (id) => api.post(`/cards/${id}/duplicate`),
  review: (id, rating) => api.post(`/cards/${id}/review`, { rating }),
  toggleWeak: (id) => api.post(`/cards/${id}/weak`),
  getDue: () => api.get('/cards/due'),
  getTopics: () => api.get('/cards/topics'),
  getRandom: (count) => api.get('/cards/random', { params: { count } }),
  getSelective: (body) => api.post('/cards/selective', body),
  getWeak: () => api.get('/cards/weak'),
  export: () => api.get('/cards/export'),
  import: (cards) => api.post('/cards/import', { cards }),
};

export const statsApi = {
  get: () => api.get('/stats'),
};
