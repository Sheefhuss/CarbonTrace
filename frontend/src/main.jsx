import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios'; 
import './index.css';
import App from './App';
import useAuthStore from './context/authStore';
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
useAuthStore.getState().initialize().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
      <App />
  );
});
