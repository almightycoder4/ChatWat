import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL } from '../utils/constants';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline';
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setInitialized: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  isInitialized: false,
  login: async (username, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      
      if (res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        set({
          isAuthenticated: true,
          user: res.data.user,
          token: res.data.token
        });
        
        toast.success('Logged in successfully');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message || 'Failed to login');
      } else {
        toast.error('Failed to login');
      }
      throw error;
    }
  },
  register: async (username, email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { username, email, password });
      
      if (res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        set({
          isAuthenticated: true,
          user: res.data.user,
          token: res.data.token
        });
        
        toast.success('Registered successfully');
      }
    } catch (error) {
      console.error('Register error:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message || 'Failed to register');
      } else {
        toast.error('Failed to register');
      }
      throw error;
    }
  },
  logout: async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      set({
        isAuthenticated: false,
        user: null,
        token: null
      });
      
      toast.success('Logged out successfully');
    }
  },
  setInitialized: (value) => set({ isInitialized: value })
}));

export const initializeAuthStore = async () => {
  try {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      const user = JSON.parse(storedUser);
      
      // Verify token with the server
      try {
        await axios.get(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        useAuthStore.setState({
          isAuthenticated: true,
          user,
          token
        });
      } catch (error) {
        console.error('Token verification error:', error);
        // Token is invalid, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  } catch (error) {
    console.error('Auth initialization error:', error);
  } finally {
    useAuthStore.setState({ isInitialized: true });
  }
};