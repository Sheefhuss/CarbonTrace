import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:5000';

const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling']
});

export default socket;
