import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE = 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('lectureloop_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('lectureloop_token') || null);
  const [loading, setLoading] = useState(true);

  // Set default axios authorization header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('lectureloop_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('lectureloop_token');
    }
  }, [token]);

  // Check current profile on mount if token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE}/auth/me`);
        if (res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('lectureloop_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.warn('Session expired or invalid, logging out.');
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    if (res.data?.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('lectureloop_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
    throw new Error(res.data?.error || 'Login failed');
  };

  const register = async (name, email, password, roll = '') => {
    const res = await axios.post(`${API_BASE}/auth/register`, { name, email, password, roll });
    if (res.data?.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('lectureloop_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
    throw new Error(res.data?.error || 'Registration failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lectureloop_token');
    localStorage.removeItem('lectureloop_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
