import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import useAuthStore from '../store/useAuthStore';
import { queryClient } from '../main';
import { notifications } from '@mantine/notifications';
import { API_BASE_URL } from './baseUrl';
import { confirmNetworkFailure, isOffline, reportNetworkOk } from '../utils/netState';
import { networkErrorToast } from '../utils/netText';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipGlobalNotification?: boolean;
  }
}

export const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use((config) => {
  const { token, isExpired, logout } = useAuthStore.getState();

  if (token) {
    if (isExpired()) {
      logout();
      return Promise.reject(new Error('Token expired'));
    }

    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (res) => {
    // Javob keldi — internet bor (offline sahifasini yopadi).
    reportNetworkOk();
    return res;
  },
  (error) => {
    const status = error.response?.status;
    // Javob umuman kelmadi — aloqa tekshiriladi; internet yo'q bo'lsa butun ekranli «Internet aloqasi yo'q» sahifasi chiqadi.
    if (error?.code === 'ERR_NETWORK') confirmNetworkFailure();
    const cfg = error.config as InternalAxiosRequestConfig & { skipGlobalNotification?: boolean };

    if (!cfg?.skipGlobalNotification) {
      if (status === 403) {
        notifications.show({
          id: 'forbidden-notification',
          title: 'Ruxsat yo\'q',
          message: 'Sahifa mavjud emas',
          color: 'red',
        });
      } else if (networkErrorToast(error, isOffline())) {
        // Internet yo'q (butun ekranli sahifa aytadi) yoki server xatosi (5xx) — tushunarli xabar.
        const net = networkErrorToast(error, isOffline());
        if (net && !net.silent) {
          notifications.show({
            id: 'global-error-notification',
            title: net.title,
            message: net.message,
            color: 'red',
          });
        }
      } else {
        const errorMessage = error.response?.data?.message || error.message;
        notifications.show({
          id: 'global-error-notification',
          title: 'Xatolik',
          message: errorMessage || 'Noma\'lum xatolik yuz berdi',
          color: 'red',
        });
      }
    }

    if (status === 401) {
      logoutAndRedirect();
    }

    return Promise.reject(error);
  },
);

function logoutAndRedirect() {
  const { logout } = useAuthStore.getState();
  logout();

  queryClient?.clear();
  window.location.href = '/login';
}
