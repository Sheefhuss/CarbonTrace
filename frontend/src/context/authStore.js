
import { create } from 'zustand';
import axios from 'axios';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isLoading: false,
  isInitializing: true, // FIX: starts true, set to false after initialize() completes

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isInitializing: false });
      return;
    }
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user: res.data.user, token, isInitializing: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isInitializing: false });
    }
  },

  login: async (identifier, password) => {
    set({ isLoading: true });
    try {
      const res = await axios.post('/api/auth/login', { identifier, password });
      localStorage.setItem('token', res.data.token);
      set({ user: res.data.user, token: res.data.token, isLoading: false });
      return { ok: true };
    } catch (err) {
      set({ isLoading: false });
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Invalid credentials';
      return { ok: false, error: message };
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await axios.post('/api/auth/register', data);
      localStorage.setItem('token', res.data.token);
      set({ user: res.data.user, token: res.data.token, isLoading: false });
      return { ok: true };
    } catch (err) {
      set({ isLoading: false });
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Registration failed';
      return { ok: false, error: message };
    }
  },

  updateUser: (patch) => {
    set(state => ({ user: state.user ? { ...state.user, ...patch } : state.user }));
  },

  logout: async () => {
    try {
      const token = get().token;
      if (token) {
        await axios.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));

export default useAuthStore;