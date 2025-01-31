import axios from 'axios';

let connectionId = '';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  if (connectionId) {
    config.headers['X-Connection-ID'] = connectionId;
  }
  return config;
});

export const setConnectionId = (newConnectionId: string) => {
  connectionId = newConnectionId;
};

export const clearConnectionId = () => {
  connectionId = '';
};

export default api;
