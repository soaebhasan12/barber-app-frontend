import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { onForceLogout } from '../services/authEvents';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // App open hone pe check karo already logged in hai?
  useEffect(() => {
    checkLogin();
    const unsubscribe = onForceLogout(() => logout(true)); // token already invalid — skip server call
    return unsubscribe;
  }, []);

  const checkLogin = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      const savedUser  = await AsyncStorage.getItem('user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        registerForPushNotificationsAsync();
      }
    } catch (err) {
      console.log('checkLogin error:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (tokenValue, userData) => {
    await AsyncStorage.setItem('token', tokenValue);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
    registerForPushNotificationsAsync(); // fire-and-forget, login flow block nahi hogi
  };

  const logout = async (skipServerCall = false) => {
    // skipServerCall=true jab token expire ho chuka ho (interceptor se) —
    // clearFcmToken khud ek authenticated call hai, expired token pe woh bhi
    // 401 dega aur dobara logout trigger karega (infinite loop se bachne ke liye)
    if (!skipServerCall) {
      try { await authAPI.clearFcmToken(); } catch (err) { console.log('clearFcmToken error:', err); }
    }
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updatedUserData) => {
    await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
    setUser(updatedUserData);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);