import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, tokenStorage, setAuthToken, User } from "./api";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await tokenStorage.get();
      if (token) {
        setAuthToken(token);
        try {
          const res = await api.get<User>("/auth/me");
          setUser(res.data);
        } catch {
          await tokenStorage.clear();
          setAuthToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    await tokenStorage.set(res.data.access_token);
    setAuthToken(res.data.access_token);
    setUser(res.data.user);
  }

  async function signUp(email: string, password: string, full_name: string) {
    const res = await api.post("/auth/register", { email, password, full_name });
    await tokenStorage.set(res.data.access_token);
    setAuthToken(res.data.access_token);
    setUser(res.data.user);
  }

  async function signOut() {
    await tokenStorage.clear();
    setAuthToken(null);
    setUser(null);
  }

  async function refresh() {
    try {
      const res = await api.get<User>("/auth/me");
      setUser(res.data);
    } catch {
      // ignore
    }
  }

  return (
    <Ctx.Provider value={{ user, loading, signIn, signUp, signOut, refresh, setUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
