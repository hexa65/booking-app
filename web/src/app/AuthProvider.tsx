import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/auth";
import type { RegisterInput } from "../services/auth";
import { tokenStore } from "../services/api";
import type { AuthUser } from "../types/auth";

// Context = a shared notice board any component can read, so we avoid passing "user" down through every layer.
type Status = "loading" | "authed" | "anon";
interface AuthValue {
  user: AuthUser | null; status: Status;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>(tokenStore.get() ? "loading" : "anon");

  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    authService.me().then((u) => { if (!cancelled) { setUser(u); setStatus("authed"); } })
      .catch(() => { if (!cancelled) { tokenStore.clear(); setStatus("anon"); } });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    tokenStore.set(res.token); setUser(res.user); setStatus("authed");
  }, []);
  const register = useCallback(async (input: RegisterInput) => {
    const res = await authService.register(input);
    tokenStore.set(res.token); setUser(res.user); setStatus("authed");
  }, []);
  const logout = useCallback(() => { tokenStore.clear(); setUser(null); setStatus("anon"); qc.clear(); }, [qc]);

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
