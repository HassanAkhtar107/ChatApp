import axios from 'axios';

// Replace with your machine's local IP (e.g. 10.0.2.2 for Android Emulator)
export const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export default api;
