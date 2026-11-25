import type { AuthResponse, AuthUser } from "../types/auth";
import { api } from "./api";

export interface RegisterInput { businessName: string; email: string; password: string; }
export const authService = {
  register: async (input: RegisterInput): Promise<AuthResponse> => (await api.post<AuthResponse>("/auth/register", input)).data,
  login: async (email: string, password: string): Promise<AuthResponse> => (await api.post<AuthResponse>("/auth/login", { email, password })).data,
  me: async (): Promise<AuthUser> => (await api.get<{ user: AuthUser }>("/auth/me")).data.user,
};
