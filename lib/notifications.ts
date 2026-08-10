import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase'; // Sesuaikan path config Supabase lu

// 🔔 Konfigurasi cara notifikasi muncul kalau aplikasi lagi dibuka (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 🛠️ Helper internal untuk update Token / Status Debug ke Supabase
const updatePushTokenInSupabase = async (userId: string, tokenOrStatus: string) => {
  try {
    const { error } = await supabase
      .from('users') // ⚠️ Sesuaikan nama tabel user lu jika beda
      .update({ expoPushToken: tokenOrStatus })
      .eq('id', userId);

    if (error) {
      console.error('🔴 [PUSH DEBUG] Gagal update status ke Supabase:', error.message);
    } else {
      console.log(`🟢 [PUSH DEBUG] Supabase Updated: "${tokenOrStatus}"`);
    }
  } catch (err) {
    console.error('🔴 [PUSH DEBUG] Error DB update:', err);
  }
};

export async function registerForPushNotificationsAsync(userId: string) {
  if (!userId) return null;

  // 1. Notifikasi remote wajib pakai device asli (bukan emulator bawaan laptop)
  if (!Device.isDevice) {
    console.log('⚠️ [PUSH] Harus pakai device fisik untuk Push Notification');
    await updatePushTokenInSupabase(userId, 'Bukan Perangkat Fisik (Emulator)');
    return null;
  }

  // 2. Setup channel khusus Android (Wajib dari Android 8.0 ke atas)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7A',
    });
  }

  // 3. Cek izin/permission dari user
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Jika belum diizinkan, minta izin ke user
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Jika ditolak sama user, catat status "Izin Notifikasi Ditolak" ke Supabase
  if (finalStatus !== 'granted') {
    console.log('⚠️ [PUSH] Gagal mendapatkan token: Izin ditolak oleh user!');
    await updatePushTokenInSupabase(userId, 'Izin Notifikasi Ditolak');
    return null;
  }

  try {
    // 4. Ambil Project ID (Mendukung .env maupun config EAS Expo)
    const projectId =
      process.env.EXPO_PUBLIC_PROJECT_ID ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error('🔴 [PUSH] Project ID tidak ditemukan!');
      await updatePushTokenInSupabase(userId, 'Gagal: Missing Project ID');
      return null;
    }

    // 5. Generate Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data;

    console.log('🟢 Expo Push Token didapat:', token);

    // 6. Simpan token asli atau status error ke Supabase
    if (token) {
      await updatePushTokenInSupabase(userId, token);
      return token;
    } else {
      await updatePushTokenInSupabase(userId, 'Gagal: Token Kosong');
      return null;
    }
  } catch (error: any) {
    console.error('🔴 Error saat registrasi push token:', error);
    const errorMessage = error?.message
      ? `Error: ${error.message.slice(0, 50)}`
      : 'Error Tidak Diketahui';
    await updatePushTokenInSupabase(userId, errorMessage);
    return null;
  }
}