import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import "../global.css";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. Cek sesi saat aplikasi pertama kali dibuka
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    // 2. Pantau terus kalau ada perubahan (misal user tiba-tiba logout/login)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Bersihin listener pas komponen hancur
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Jangan ngapa-ngapain kalau belum selesai ngecek sesi awal
    if (!isInitialized) return;

    // Cek apakah user lagi di halaman login
    const inAuthGroup = segments[0] === "login";

    if (!session && !inAuthGroup) {
      // Satpam: Belum login? Tendang ke halaman login!
      router.replace("/login");
    } else if (session && inAuthGroup) {
      // Satpam: Udah login ngapain ke sini lagi? Balik ke beranda!
      router.replace("/(tabs)");
    }
  }, [session, isInitialized, segments]);

  return (
    <Stack>
      {/* Tambahin halaman login ke Stack biar headernya bisa diilangin */}
      <Stack.Screen name="login" options={{ headerShown: false }} />

      {/* Tab utama */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Folder lain yang udah aman */}
      <Stack.Screen name="patrol" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="leave" options={{ headerShown: false }} />

      {/* Header Beranda Hilang */}
      <Stack.Screen name="beranda" options={{ headerShown: false }} />

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
