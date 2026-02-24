import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
 const ctx = useContext(AuthContext);
 if (!ctx) throw new Error('useAuth must be used within AuthProvider');
 return ctx;
};

export const AuthProvider = ({ children }) => {
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(true);

 const getAuthErrorMessage = (err, fallback) => {
 if (err.response?.data?.message) return err.response.data.message;
 if (err.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
 if (err.message === 'Network Error') return 'Cannot reach server. Check API URL/CORS/backend status.';
 return fallback;
 };

 useEffect(() => {
 const token = localStorage.getItem('token');
 if (token) loadUser();
 else setLoading(false);
 }, []);

 const loadUser = async () => {
 try {
 const res = await authAPI.getMe();
 setUser(res.data.user);
 } catch {
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 } finally {
 setLoading(false);
 }
 };

 const login = async (email, password) => {
 try {
 const res = await authAPI.login({ email, password });
 localStorage.setItem('token', res.data.token);
 localStorage.setItem('user', JSON.stringify(res.data.user));
 setUser(res.data.user);
 return { success: true, user: res.data.user };
 } catch (err) {
 return { success: false, message: getAuthErrorMessage(err, 'Login failed') };
 }
 };

 const register = async (userData) => {
 try {
 const res = await authAPI.register(userData);
 localStorage.setItem('token', res.data.token);
 localStorage.setItem('user', JSON.stringify(res.data.user));
 setUser(res.data.user);
 return { success: true, user: res.data.user };
 } catch (err) {
 return { success: false, message: getAuthErrorMessage(err, 'Registration failed') };
 }
 };

 const logout = () => {
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 setUser(null);
 window.location.href = '/login';
 };

 const updateUser = (updated) => setUser((prev) => ({ ...prev, ...updated }));

 return (
 <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAuthenticated: !!user }}>
 {children}
 </AuthContext.Provider>
 );
};
