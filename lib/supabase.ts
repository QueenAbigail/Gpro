import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://zztjtnawtmasuacbhppt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6dGp0bmF3dG1hc3VhY2JocHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTM3ODYsImV4cCI6MjA5NjM4OTc4Nn0.1QP8YesOQPv_39M0ZDk4AnpNTJMiIXGr_lE0wKkr6Sg";

// 🛡️ Hybrid Secure Storage Adapter
// HP = SecureStore (Kunci Brankas), Web = AsyncStorage (Local Storage biasa)
const secureStorageAdapter = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null;
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined") return;
    if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === "undefined") return;
    if (Platform.OS === "web") return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorageAdapter, // 👈 Udah pake adapter Hybrid yang aman
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 💡 Manajemen refresh token otomatis saat aplikasi dibuka kembali dari background
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
