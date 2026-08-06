import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native"; // 💡 Tambah StyleSheet & Platform di sini
import "../global.css";
import { handleDeviceVerification } from "../lib/device";
import { supabase } from "../lib/supabase";

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

  // 📱 LOGIKA FORCE MOBILE UNTUK WEB
  const renderContent = () => (
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

  // Jika dibuka di browser web, bungkus dengan container simulasi HP di tengah layar
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webWrapper}>
        <View style={styles.mobileContainer}>
          {renderContent()}
        </View>
      </View>
    );
  }

  // Jika di Android asli, tampilkan penuh tanpa pembungkus ekstra
  return renderContent();
}

// 🎨 STYLING KHUSUS TAMPILAN WEB / DESKTOP
const styles = {
  webWrapper: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  mobileContainer: {
    width: '100%' as const,
    maxWidth: 450,
    height: '100%' as const,
    maxHeight: '100%' as const, // 💡 Menggunakan '100%' menggantikan '100vh' agar tipenya valid
    backgroundColor: '#ffffff',
    
    // Properti bayangan standar
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
};
