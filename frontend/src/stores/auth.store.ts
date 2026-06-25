import { create } from 'zustand';
import { resetChatSessionBinding } from '../lib/chatSession';
import { authService } from '../services/auth.service';
import { useChatStore } from './chat.store';
import type { User } from '../types/finance';

type AuthState = {
  token: string | null;
  user: User | null;
  booting: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (body: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  recover: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  booting: true,
  isAuthenticated: Boolean(localStorage.getItem('token')),

  async login(username, password) {
    const data = await authService.login(username, password);
    localStorage.setItem('token', data.accessToken);
    set({
      token: data.accessToken,
      user: data.user,
      isAuthenticated: true,
      booting: false,
    });
  },

  async register(body) {
    const data = await authService.register(body);
    localStorage.setItem('token', data.accessToken);
    set({
      token: data.accessToken,
      user: data.user,
      isAuthenticated: true,
      booting: false,
    });
  },

  async recover() {
    if (!get().token) {
      set({ booting: false, isAuthenticated: false, user: null });
      return;
    }
    try {
      const user = await authService.me();
      set({ user, isAuthenticated: true, booting: false });
    } catch {
      get().logout();
      set({ booting: false });
    }
  },

  logout() {
    localStorage.removeItem('token');
    useChatStore.getState().reset();
    resetChatSessionBinding();
    set({ token: null, user: null, isAuthenticated: false, booting: false });
  },
}));

window.addEventListener('auth:unauthorized', () => {
  useAuthStore.getState().logout();
});
