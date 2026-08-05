import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase'; // Sesuaikan dengan path file supabase kamu

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

// 2. Fungsi Utama untuk Validasi & Binding Device (Pure Client-Side Query)
export const handleDeviceVerification = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const deviceId = await getUniqueDeviceId();
    const deviceName = Device.modelName || Device.designName || 'Unknown Device';
    const deviceType = Platform.OS;
    const appVersion = Application.nativeApplicationVersion || '1.0.0';

    if (!deviceId || deviceId === 'UNKNOWN_DEVICE_ID' || deviceId === 'UNKNOWN_IOS_ID') {
      return { success: false, message: 'Gagal membaca Device ID pada perangkat ini.' };
    }

    const NAMA_TABEL = 'device_bindings';

    // KONDISI AWAL: Cek apakah DEVICE ID HP ini udah terikat dengan akun manapun?
    const { data: deviceBinding, error: deviceError } = await supabase
      .from(NAMA_TABEL)
      .select('*')
      .eq('deviceId', deviceId)
      .maybeSingle();

    if (deviceError) throw deviceError;

    // --- SKENARIO A: DEVICE INI BELUM TERDAFTAR SAMA SEKALI ---
    if (!deviceBinding) {
      // Cek dulu, apakah USER ID yang mau login ini sebenernya udah punya HP lain yang terikat?
      const { data: userBinding, error: userError } = await supabase
        .from(NAMA_TABEL)
        .select('*')
        .eq('userId', userId)
        .maybeSingle();

      if (userError) throw userError;

      if (userBinding && userBinding.deviceId !== deviceId) {
        // User mau selingkuh pake HP baru, padahal akunnya udah nyangkut di HP lama
        return {
          success: false,
          message: 'Akun anda sudah terdaftar di perangkat lain. Silahkan hubungi admin HRIS untuk reset Device ID.',
        };
      }

      // ✅ DIGANTI KE .upsert() BIAR AMAN DARI RACE CONDITION (ERROR 23505)
      const { error: upsertError } = await supabase
        .from(NAMA_TABEL)
        .upsert(
          {
            userId: userId,
            deviceId: deviceId,
            deviceName: deviceName,
            deviceType: deviceType,
            appVersion: appVersion,
            lastUsed: new Date().toISOString(),
          },
          {
            onConflict: 'userId, deviceType', // Sesuaikan dengan unique constraint di Supabase
          }
        );

      if (upsertError) throw upsertError;

      return { success: true, message: 'Perangkat baru berhasil didaftarkan!' };
    }

    // --- SKENARIO B: DEVICE INI SUDAH TERDAFTAR DI DATABASE ---
    // Cek apakah pemilik device terdaftar ini MATCH dengan USER ID yang lagi login?
    if (deviceBinding.userId === userId) {
      // Update lastUsed agar mencatat aktivitas login terbaru
      await supabase
        .from(NAMA_TABEL)
        .update({ lastUsed: new Date().toISOString() })
        .eq('deviceId', deviceId);

      return { success: true, message: 'Device terverifikasi.' };
    } else {
      // 🛑 HP ini udah dipakai/terikat sama akun karyawan lain!
      return {
        success: false,
        message: 'Perangkat ini sudah digunakan oleh akun lain. Satu perangkat hanya diizinkan untuk satu akun karyawan.',
      };
    }

  } catch (error: any) {
    console.error('Error device verification:', error);
    return { 
      success: false, 
      message: error.message || 'Gagal melakukan verifikasi perangkat akibat kendala database.' 
    };
  }
};