import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (token: string, username: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      token: null,
      username: null,
      isAuthenticated: false,

      login: (token: string, username: string) => {
        set({ 
          token, 
          username, 
          isAuthenticated: true 
        });
      },

      logout: () => {
        set({ 
          token: null, 
          username: null, 
          isAuthenticated: false 
        });
      },

      loadFromStorage: () => {
        const state = get();
        if (state.token) {
          set({ isAuthenticated: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        username: state.username 
      }),
    }
  )
);