import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import useAuthStore from './context/authStore';

useAuthStore.getState().initialize().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
      <App />
  );
});