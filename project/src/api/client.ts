import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 20000, // 20 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle 401
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // GET request
  async get<T>(url: string): Promise<T> {
    const response = await this.instance.get<T>(url);
    return response.data;
  }

  // POST request with JSON
  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.post<T>(url, data);
    return response.data;
  }

  // POST request with form-urlencoded
  async postForm<T>(url: string, data: Record<string, string>): Promise<T> {
    const formData = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await this.instance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  }

  // Check if server is available
  async healthCheck(): Promise<boolean> {
    try {
      await this.instance.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();