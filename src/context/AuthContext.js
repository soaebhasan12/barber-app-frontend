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
        refreshUser(); // cached user turant dikhao, fresh data peeche se aa jayega
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
    refreshUser();
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

  // Merge karta hai (replace nahi), taaki payAtShopBlocked jaise fields partial update se na jayein
  const updateUser = async (updatedUserData) => {
    let saved = {};
    try {
      saved = JSON.parse((await AsyncStorage.getItem('user')) || '{}');
    } catch (err) {
      console.log('updateUser parse error:', err);
    }
    const merged = { ...saved, ...updatedUserData };
    await AsyncStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  // Server se fresh user lao. payAtShopBlocked server-side badalta hai, cache purana ho jata hai.
  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      const fresh = res.data?.data;
      if (!fresh || typeof fresh !== 'object') return;
      const stillLoggedIn = await AsyncStorage.getItem('token'); // beech mein logout hua ho to user wapas na jodo
      if (!stillLoggedIn) return;
      await updateUser(fresh);
    } catch (err) {
      console.log('refreshUser error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, refreshUser, payAtShopBlocked: !!user?.payAtShopBlocked }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);