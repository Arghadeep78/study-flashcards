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

export const pdfNotesApi = {
  getAll: () => api.get('/pdf-notes'),
  getOne: (id) => api.get(`/pdf-notes/${id}`),
  createUpload: (formData) => api.post('/pdf-notes/upload', formData),
  createDrive: (body) => api.post('/pdf-notes/drive', body),
  refresh: (id) => api.post(`/pdf-notes/${id}/refresh`),
  update: (id, body) => api.put(`/pdf-notes/${id}`, body),
  remove: (id) => api.delete(`/pdf-notes/${id}`),
  // Section review
  getDueSections: () => api.get('/pdf-notes/sections/due'),
  getRandomSections: (count) => api.get('/pdf-notes/sections/random', { params: { count } }),
  getSelectiveSections: (body) => api.post('/pdf-notes/sections/selective', body),
  getWeakSections: () => api.get('/pdf-notes/sections/weak'),
  reviewSection: (sectionId, rating) => api.post(`/pdf-notes/sections/${sectionId}/review`, { rating }),
  toggleSectionWeak: (sectionId) => api.post(`/pdf-notes/sections/${sectionId}/weak`),
};
