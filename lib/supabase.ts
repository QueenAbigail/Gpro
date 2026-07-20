import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Nanti URL dan Key ini kita ganti pakai punya web kamu ya
const supabaseUrl = "https://zztjtnawtmasuacbhppt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6dGp0bmF3dG1hc3VhY2JocHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTM3ODYsImV4cCI6MjA5NjM4OTc4Nn0.1QP8YesOQPv_39M0ZDk4AnpNTJMiIXGr_lE0wKkr6Sg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
