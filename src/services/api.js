// ye backend se baat karega

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://barber-app-backend-mebr.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// Har request mein automatically token lagao
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  sendOTP: ({ phone, email, role }) => api.post('/auth/send-otp', { phone, email, role }),
  verifyOTP: ({ phone, email, otp, name }) => api.post('/auth/verify-otp', { phone, email, otp, name }),
  getMe:     () => api.get('/auth/me'),
  updateProfile: (name) => api.put('/auth/update-profile', { name }),
  updateFcmToken: (fcmToken) => api.put('/auth/update-fcm', { fcmToken }),
  clearFcmToken: () => api.put('/auth/clear-fcm'),
};

export const shopAPI = {
  getNearby: (lat, lng) => api.get(`/shops/nearby?lat=${lat}&lng=${lng}&maxDistance=500000`),
  getById:    (id) => api.get(`/shops/${id}`),
  getMyShop:  () => api.get('/shops/my-shop'),
  update: (data) => api.put('/shops/update', data),
  register:   (data) => api.post('/shops/register', data),
  getUploadSignature: () => api.get('/shops/upload-signature'),
};

export const bookingAPI = {
  getSlots: (shopId, date, staffId) => api.get(`/bookings/slots?shopId=${shopId}&date=${date}${staffId ? `&staffId=${staffId}` : ''}`),
  create:     (data) => api.post('/bookings/create', data),
  getMyBookings: () => api.get('/bookings/my'),
  cancel:     (id, reason) => api.put(`/bookings/${id}/cancel`, { reason }),
  reschedule: (id, slotDate, slotTime) => api.put(`/bookings/${id}/reschedule`, { slotDate, slotTime }),
  getShopBookings: (shopId, date) => api.get(`/bookings/shop/${shopId}${date ? `?date=${date}` : ''}`),
  updateStatus:    (id, status) => api.put(`/bookings/${id}/status`, { status }),
};

export const paymentAPI = {
  createOrder: (bookingId) => api.post('/payments/create-order', { bookingId }),
  verify: (data) => api.post('/payments/verify', data),
};

export const serviceAPI = {
  getByShop: (shopId) => api.get(`/services/${shopId}`),
  add:    (data) => api.post('/services/add', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  remove: (id)   => api.delete(`/services/${id}`),
};

export const staffAPI = {
  getAll:    () => api.get('/staff'),
  add:       (data) => api.post('/staff/add', data),
  getByShop: (shopId) => api.get(`/staff/shop/${shopId}`),
  update:    (id, data) => api.put(`/staff/${id}`, data),
  remove:    (id) => api.delete(`/staff/${id}`),
};

export default api;