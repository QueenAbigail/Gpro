import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase'; // Sesuaikan dengan path file supabase lu

// Helper untuk generate UUID v4 manual secara aman tanpa library tambahan
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// 1. Fungsi untuk mengambil ID unik hardware HP secara aman
export const getUniqueDeviceId = async (): Promise<string> => {
  if (Platform.OS === 'android') {
    return Application.getAndroidId();
  } else if (Platform.OS === 'ios') {
    const iosId = await Application.getIosIdForVendorAsync();
    return iosId ?? 'UNKNOWN_IOS_ID';
  }
  return 'UNKNOWN_DEVICE_ID';
};

// 2. Fungsi Utama untuk Validasi & Binding Device ke Supabase
export const handleDeviceVerification = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const deviceId = await getUniqueDeviceId();
    const deviceName = Device.modelName || Device.designName || 'Unknown Device';
    const deviceType = Platform.OS;
    const appVersion = Application.nativeApplicationVersion || '1.0.0';
    const now = new Date().toISOString();

    // Cek apakah user ini udah punya device yang terikat di tabel device_bindings
    const { data: existingBinding, error: fetchError } = await supabase
      .from('device_bindings')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // KONDISI A: User BELUM PERNAH mengikatkan HP sama sekali (Pertama kali login)
    if (!existingBinding) {
      const { error: insertError } = await supabase
        .from('device_bindings')
        .insert({
          id: generateUUID(), // 🚀 FIX ERROR 23502: Sekarang ID dapet UUID otomatis dari aplikasi
          userId,
          deviceId,
          deviceName,
          deviceType,
          appVersion,
          bindDate: now,
          lastUsed: now,
          isActive: true, // Otomatis aktif di HP pertama
        });

      if (insertError) throw insertError;
      return { success: true, message: 'Perangkat berhasil didaftarkan untuk pertama kali!' };
    }

    // KONDISI B: Device ID di HP sekarang BEDA dengan yang terdaftar di database (Mau bajak/pindah HP)
    if (existingBinding.deviceId !== deviceId) {
      return { 
        success: false, 
        message: `Akun Anda sudah terikat di perangkat lain (${existingBinding.deviceName}). Silakan hubungi admin untuk reset perangkat.` 
      };
    }

    // KONDISI C: Device ID sama, tapi statusnya dimatikan (false) oleh admin dari web dashboard
    if (!existingBinding.isActive) {
      return { 
        success: false, 
        message: 'Perangkat Anda telah dinonaktifkan oleh admin. Anda tidak dapat mengakses aplikasi.' 
      };
    }

    // KONDISI D: Device ID cocok dan aktif (Akses aman, tinggal update lastUsed & versi aplikasi)
    const { error: updateError } = await supabase
      .from('device_bindings')
      .update({ 
        lastUsed: now,
        appVersion: appVersion // Update juga kalau sewaktu-waktu user abis update app
      })
      .eq('id', existingBinding.id);

    if (updateError) throw updateError;
    return { success: true, message: 'Verifikasi perangkat berhasil!' };

  } catch (error: any) {
    console.error('Error device verification:', error);
    return { success: false, message: error.message || 'Gagal melakukan verifikasi perangkat.' };
  }
};