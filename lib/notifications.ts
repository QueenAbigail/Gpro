import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase'; // Sesuaikan path config Supabase lu

// Konfigurasi cara notifikasi muncul kalau aplikasi lagi dibuka (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  // 1. Notifikasi remote wajib pakai device asli (bukan emulator bawaan laptop)
  if (!Device.isDevice) {
    console.log('Harus pakai device fisik untuk Push Notification');
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

  // Jika ditolak sama user, hentikan proses
  if (finalStatus !== 'granted') {
    console.log('Gagal mendapatkan token: Izin ditolak oleh user!');
    return null;
  }

  try {
    // 4. Ambil Project ID otomatis dari config Expo lu
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID ?? ''; 
    
    // 5. Generate Expo Push Token
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Expo Push Token didapat:', token);

    // 6. Simpan token ke database Supabase lu
    if (token) {
      const { error } = await supabase
        .from('users') // ⚠️ Sesuaikan nama tabel user lu (misal: 'users' atau 'profiles')
        .update({ expoPushToken: token }) 
        .eq('id', userId); // Menggunakan userId yang dikirim dari halaman login/beranda

      if (error) {
        console.error('Gagal menyimpan token ke Supabase:', error.message);
      } else {
        console.log('Token berhasil disinkronkan ke Supabase!');
      }
    }
  } catch (error) {
    console.error('Error saat registrasi push token:', error);
  }

  return token;
}