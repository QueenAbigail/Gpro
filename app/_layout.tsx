import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, View, useWindowDimensions } from "react-native";
import NotificationPermissionModal from "../components/NotificationPermissionModal";
import UpdateModal from "../components/UpdateModal";
import "../global.css";
import { handleDeviceVerification } from "../lib/device";
import * as Notifications from "expo-notifications";
import {
  clearAttendanceRemindersAsync,
  registerForPushNotificationsAsync,
} from "../lib/notifications"; // 💡 1. Import helper notifikasi
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const lastHandledNotifIdRef = useRef<string | null>(null);
  const pendingNotifResponseRef =
    useRef<Notifications.NotificationResponse | null>(null);

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

        // 🔔 2. TAMBAHAN DI SINI: Panggil pendaftaran token tiap kali user berhasil terverifikasi/login
        registerForPushNotificationsAsync(currentSession.user.id);
      } else {
        // Kalau device nggak valid, paksa logout dan hapus session
        await clearAttendanceRemindersAsync();
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
  }, [session, isInitialized, segments, router]);

  // 🔔 Deep Linking: Listener saat user klik banner Push Notification dari status bar HP (Warm & Cold Start)
  useEffect(() => {
    if (Platform.OS === "web") return;

    const handleNotificationResponse = (
      response: Notifications.NotificationResponse | null,
    ) => {
      if (!response) return;
      try {
        // Jika app belum siap (Cold Start sebelum Stack ter-mount), tahan dulu responsnya
        if (!isInitialized || !session) {
          pendingNotifResponseRef.current = response;
          return;
        }

        const respId = response.notification.request.identifier;
        if (lastHandledNotifIdRef.current === respId) return;
        lastHandledNotifIdRef.current = respId;
        pendingNotifResponseRef.current = null;

        const data = response?.notification?.request?.content?.data;
        const notifType = String(data?.type || "").toLowerCase();

        if (notifType === "sos") {
          router.push({
            pathname: "/profile/notifications",
            params: { openSosLatest: "true" },
          } as any);
          return;
        }

        if (notifType === "bko" || Boolean(data?.bkoId)) {
          router.push({
            pathname: "/profile/notifications",
            params: {
              openBkoLatest: "true",
              openBkoId: data?.bkoId ? String(data.bkoId) : "",
            },
          } as any);
          return;
        }

        if (
          notifType === "leave" ||
          notifType === "approval" ||
          Boolean(data?.leaveId)
        ) {
          router.push({
            pathname: "/profile/notifications",
            params: {
              openLeaveLatest: "true",
              openLeaveId: data?.leaveId ? String(data.leaveId) : "",
            },
          } as any);
          return;
        }

        if (notifType === "payroll" || Boolean(data?.payrollId)) {
          router.push("/beranda/payroll/payroll-page" as any);
          return;
        }

        if (notifType === "announcement" || Boolean(data?.announcementId)) {
          if (data?.announcementId) {
            router.push(
              `/beranda/announcement/${String(data.announcementId)}` as any,
            );
          } else if (data?.route && typeof data.route === "string") {
            router.push(data.route as any);
          } else {
            router.push("/beranda/announcement" as any);
          }
          return;
        }

        if (notifType === "attendance_reminder") {
          router.push("/beranda/absen/masuk" as any);
          return;
        }

        const targetRoute = data?.route;
        if (targetRoute && typeof targetRoute === "string") {
          if (targetRoute.startsWith("/(tabs)")) {
            router.navigate(targetRoute as any);
          } else if (targetRoute.startsWith("/patrol/") && data?.patrolId) {
            router.push({
              pathname: targetRoute,
              params: { patrolId: String(data.patrolId) },
            } as any);
          } else {
            router.push(targetRoute as any);
          }
        } else if (data?.type) {
          if (notifType === "patrol") {
            router.push("/(tabs)/patrol" as any);
          } else if (notifType === "payroll") {
            router.push("/beranda/payroll/payroll-page" as any);
          }
        }
      } catch (err) {
        console.error("Error handling notification click:", err);
      }
    };

    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse,
      );

    // Cold Start support: jalankan antrean notifikasi / getLastNotificationResponseAsync setelah Stack siap
    let coldStartTimer: ReturnType<typeof setTimeout> | null = null;
    if (isInitialized && session) {
      coldStartTimer = setTimeout(() => {
        if (pendingNotifResponseRef.current) {
          handleNotificationResponse(pendingNotifResponseRef.current);
          return;
        }
        Notifications.getLastNotificationResponseAsync()
          .then((lastResp) => {
            if (lastResp) {
              handleNotificationResponse(lastResp);
            }
          })
          .catch(() => {});
      }, 150);
    }

    return () => {
      subscription.remove();
      if (coldStartTimer) clearTimeout(coldStartTimer);
    };
  }, [router, isInitialized, session]);

  // 🌟 LOADING SCREEN (Kunci biar nggak flash)
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f9ff" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // 📱 LOGIKA RENDER STACK
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
      <NotificationPermissionModal userId={session?.user?.id} />
    </>
  );

  if (Platform.OS === 'web' && width > 500) {
    return (
      <View style={styles.webWrapper}>
        <View style={styles.mobileContainer}>
          {renderContent()}
        </View>
      </View>
    );
  }

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