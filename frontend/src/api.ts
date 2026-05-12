import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const TOKEN_KEY = "cs_auth_token";

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {}
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {}
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const tokenStorage = {
  async get() {
    return await storage.getItem(TOKEN_KEY);
  },
  async set(token: string) {
    await storage.setItem(TOKEN_KEY, token);
  },
  async clear() {
    await storage.removeItem(TOKEN_KEY);
  },
};

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
}

export const api: AxiosInstance = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${_token}`;
  }
  return config;
});

export type User = {
  id: string;
  email: string;
  full_name: string;
  tier: "student" | "professional";
  is_admin: boolean;
  biometric_enabled: boolean;
  created_at: string;
};

export type Lab = {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  long_description: string;
  docker_image: string;
  target_port: number;
  thumbnail: string;
  tier_required: "student" | "professional";
  points: number;
  completed?: boolean;
  attempts?: number;
  progress?: number;
  locked?: boolean;
  instance?: LabInstance | null;
};

export type LabInstance = {
  id: string;
  lab_id: string;
  container_id: string;
  status: "provisioning" | "running" | "stopped" | "error";
  ip: string;
  port: number;
  started_at: string;
  expires_at: string;
};

export type ServerMetrics = {
  cpu_percent: number;
  ram_percent: number;
  network_in_kbps: number;
  network_out_kbps: number;
  running_containers: number;
  total_users: number;
  uptime_seconds: number;
  history: { t: number; cpu: number; ram: number }[];
};

export const BACKEND_BASE = BACKEND_URL;
