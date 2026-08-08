import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Helper untuk deteksi apakah web dibuka dari browser HP (Mobile Web) atau Laptop/Desktop
const checkIsMobileWeb = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
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

// 2. Fungsi Utama untuk Validasi & Binding Device
export const handleDeviceVerification = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    // 🌐 SKENARIO 1: AKSES VIA WEB BROWSER
    if (Platform.OS === 'web') {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, allowWebAppAccess')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error('Error checking web access:', userError);
        return {
          success: false,
          message: 'Gagal memverifikasi izin akses web pada akun Anda.',
        };
      }

      if (!userData) {
        return {
          success: false,
          message: 'Data pengguna tidak ditemukan.',
        };
      }

      const isSuperAdmin = userData.role === 'SUPER_ADMIN';
      const hasWebAccess = userData.allowWebAppAccess === true;
      const isMobileWeb = checkIsMobileWeb();

      // 👑 1. Jika SUPER_ADMIN: Bebas login di Web Mobile maupun Web Desktop
      if (isSuperAdmin) {
        return {
          success: true,
          message: 'Akses web diizinkan.',
        };
      }

      // 🛑 2. Jika bukan SUPER_ADMIN tapi allowWebAppAccess = false / null: Ditolak
      if (!hasWebAccess) {
        return {
          success: false,
          message: 'Akun Anda tidak memiliki izin untuk akses via Web Browser.',
        };
      }

      // 📱💻 3. Jika allowWebAppAccess = true: Cek jenis browser-nya
      if (isMobileWeb) {
        // Lolos jika dari Mobile Web Browser
        return {
          success: true,
          message: 'Akses web mobile diizinkan.',
        };
      } else {
        // Ditolak jika dibuka dari Desktop Web Browser
        return {
          success: false,
          message: 'Akses via Web Desktop hanya diperuntukkan bagi Admin.',
        };
      }
    }

    // 📱 SKENARIO 2: AKSES VIA NATIVE APP (ANDROID / IOS)
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
      const { data: userBinding, error: userError } = await supabase
        .from(NAMA_TABEL)
        .select('*')
        .eq('userId', userId)
        .maybeSingle();

      if (userError) throw userError;

      if (userBinding && userBinding.deviceId !== deviceId) {
        return {
          success: false,
          message: 'Akun anda sudah terdaftar di perangkat lain. Silahkan hubungi admin HRIS untuk reset Device ID.',
        };
      }

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
            onConflict: 'userId, deviceType',
          }
        );

      if (upsertError) throw upsertError;

      return { success: true, message: 'Perangkat baru berhasil didaftarkan!' };
    }

    // --- SKENARIO B: DEVICE INI SUDAH TERDAFTAR DI DATABASE ---
    if (deviceBinding.userId === userId) {
      await supabase
        .from(NAMA_TABEL)
        .update({ lastUsed: new Date().toISOString() })
        .eq('deviceId', deviceId);

      return { success: true, message: 'Device terverifikasi.' };
    } else {
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