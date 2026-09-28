import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const updatePushTokenInSupabase = async (
  userId: string,
  tokenOrStatus: string,
) => {
  try {
    const { error } = await supabase
      .from("users")
      .update({ expoPushToken: tokenOrStatus })
      .eq("id", userId);

    if (error) {
      console.error(
        "🔴 [PUSH DEBUG] Gagal update status ke Supabase:",
        error.message,
      );
    } else {
      console.log(`🟢 [PUSH DEBUG] Supabase Updated: "${tokenOrStatus}"`);
    }
  } catch (err) {
    console.error("🔴 [PUSH DEBUG] Error DB update:", err);
  }
};

export async function registerForPushNotificationsAsync(userId: string) {
  if (!userId) return null;

  // 💡 PERBAIKAN 1: Filter Web Browser biar gak kena error VAPID
  if (Platform.OS === "web") {
    console.log("⚠️ [PUSH] Push Notification dilewati untuk Web Browser");
    await updatePushTokenInSupabase(userId, "Login via Web Browser");
    return null;
  }

  // 💡 PERBAIKAN 2: Filter Emulator
  if (!Device.isDevice) {
    console.log("⚠️ [PUSH] Harus pakai device fisik untuk Push Notification");
    await updatePushTokenInSupabase(userId, "Bukan Perangkat Fisik (Emulator)");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7A",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("⚠️ [PUSH] Gagal mendapatkan token: Izin ditolak oleh user!");
    await updatePushTokenInSupabase(userId, "Izin Notifikasi Ditolak");
    return null;
  }

  try {
    const projectId =
      process.env.EXPO_PUBLIC_PROJECT_ID ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error("🔴 [PUSH] Project ID tidak ditemukan!");
      await updatePushTokenInSupabase(userId, "Gagal: Missing Project ID");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data;

    console.log("🟢 Expo Push Token didapat:", token);

    if (token) {
      await updatePushTokenInSupabase(userId, token);
      return token;
    } else {
      await updatePushTokenInSupabase(userId, "Gagal: Token Kosong");
      return null;
    }
  } catch (error: any) {
    console.error("🔴 Error saat registrasi push token:", error);
    // Potong pesan error biar rapi di database
    const errorMessage = error?.message
      ? `Error: ${error.message.slice(0, 50)}...`
      : "Error Tidak Diketahui";
    await updatePushTokenInSupabase(userId, errorMessage);
    return null;
  }
}
