import axios, { isAxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_URL;
if (!baseURL) throw new Error("VITE_API_URL is missing. Copy .env.example to .env.");

const TOKEN_KEY = "chairly_token";
export const tokenStore = {
  get(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(token: string): void { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked: the person will log in again next visit */ } },
  clear(): void { try { localStorage.removeItem(TOKEN_KEY); } catch { /* nothing to clear */ } },
};

// 60 seconds: a sleeping free-tier server can need that long to wake up.
export const api = axios.create({ baseURL, timeout: 60_000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401 && tokenStore.get() !== null) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);
