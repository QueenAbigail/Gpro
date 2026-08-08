import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View, useWindowDimensions } from "react-native";
import "../global.css";
import UpdateModal from "../components/UpdateModal"; // 💡 1. Tambah Import Modal
import { handleDeviceVerification } from "../lib/device";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();

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

  // 📱 LOGIKA RENDER STACK
  // 💡 2. Dibungkus React Fragment (<> ... </>) biar bisa nampung Modal di luar Stack
  const renderContent = () => (
    <>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="patrol" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="leave" options={{ headerShown: false }} />
        <Stack.Screen name="beranda" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>

      {/* Modal update otomatis ditaruh di sini */}
      <UpdateModal />
    </>
  );

  // 💡 PERBAIKAN: Hanya pakai frame HP jika dibuka di WEB DESKTOP/LAPTOP (lebar layar > 500px).
  // Jika dibuka di browser HP (width <= 500px) atau Native Android/iOS, langsung full screen!
  if (Platform.OS === 'web' && width > 500) {
    return (
      <View style={styles.webWrapper}>
        <View style={styles.mobileContainer}>
          {renderContent()}
        </View>
      </View>
    );
  }

  // Tampilan 100% Full Screen untuk Mobile Browser & Native App
  return renderContent();
}

// 🎨 STYLING KHUSUS TAMPILAN WEB DESKTOP
const styles = {
  webWrapper: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    minHeight: '100vh' as any,
  },
  mobileContainer: {
    width: '100%' as const,
    maxWidth: 450,
    height: '100vh' as any,
    maxHeight: 900,
    backgroundColor: '#ffffff',
    overflow: 'hidden' as const,
    position: 'relative' as const,
    
    // Properti bayangan standar
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
};