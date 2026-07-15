import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "../global.css";
import { supabase } from "../lib/supabase";
import { handleDeviceVerification } from "../lib/device"; 

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Fungsi untuk cek session + device
  const checkAuthAndDevice = async (currentSession: Session | null) => {
    if (!currentSession) {
      setSession(null);
      setIsInitialized(true);
      return;
    }

    try {
      // 🛡️ Satpam ngecek device dulu sebelum set session
      const verification = await handleDeviceVerification(currentSession.user.id);
      
      if (verification.success) {
        setSession(currentSession);
      } else {
        // Kalau device nggak valid, paksa logout dan hapus session
        await supabase.auth.signOut();
        setSession(null);
      }
    } catch (error) {
      console.error("Error saat verifikasi device:", error);
      setSession(null);
    } finally {
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    // 1. Cek sesi awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuthAndDevice(session);
    });

    // 2. Pantau perubahan auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAuthAndDevice(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Jangan ngapa-ngapain kalau aplikasi masih loading/inisialisasi
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === "login";

    if (!session && !inAuthGroup) {
      router.replace("/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, isInitialized, segments]);

  // 🌟 LOADING SCREEN (Kunci biar nggak flash)
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f9ff" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="patrol" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="leave" options={{ headerShown: false }} />
      <Stack.Screen name="beranda" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}