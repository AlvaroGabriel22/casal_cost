import { api, type ApiSuccess } from '../api/client';
import type { User } from '../types/finance';

type AuthPayload = {
  accessToken: string;
  user: User;
};

export const authService = {
  async login(username: string, password: string) {
    const { data } = await api.post<ApiSuccess<AuthPayload>>('/auth/login', {
      username,
      password,
    });
    return data.data;
  },

  async register(body: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) {
    const { data } = await api.post<ApiSuccess<AuthPayload>>('/auth/register', body);
    return data.data;
  },

  async me() {
    const { data } = await api.get<ApiSuccess<User>>('/auth/me');
    return data.data;
  },
};
