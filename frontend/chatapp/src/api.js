import axios from 'axios';

//10.0.2.2 for Android Emulator
//IP address s used for android physical device
//localhost use for iphone
export const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export default api;
