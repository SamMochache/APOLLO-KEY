/// <reference types="vite/client" />

declare module '../api/axios' {
  import axios from 'axios';
  const api: typeof axios;
  export default api;
}

declare module '*.js';
declare module '*.jsx';
