import { apiClient } from './client';
import { TokenResponse, AuthCredentials } from '@/types';

export const authApi = {
  async signup(credentials: AuthCredentials): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>('/auth/signup', credentials);
  },

  async login(credentials: AuthCredentials): Promise<TokenResponse> {
    return apiClient.postForm<TokenResponse>('/auth/login', credentials);
  },
};