import * as Application from "expo-application";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// 🛠️ HELPER: Penerjemah Pesan Error PostgreSQL / Supabase ke Bahasa User
const getFriendlyErrorMessage = (error: any): string => {
  if (!error) return "Terjadi kesalahan sistem yang tidak diketahui.";

  const rawMessage = (
    error.message ||
    error.details ||
    error.toString() ||
    ""
  ).toLowerCase();

  // 1. Error Foreign Key Constraint (User belum di-input ke tabel database/profiles)
  if (rawMessage.includes("fkey") || rawMessage.includes("foreign key")) {
    return "Akun Anda belum terkonfigurasi di sistem HRIS. Silakan hubungi Admin/HRD.";
  }

  // 2. Data tidak ditemukan (Row Level / Not Found)
  if (rawMessage.includes("pgrst116") || rawMessage.includes("not found")) {
    return "Data pengguna tidak ditemukan di sistem HRIS.";
  }

  // 3. Kendala Jaringan / Network
  if (
    rawMessage.includes("fetch") ||
    rawMessage.includes("network") ||
    rawMessage.includes("connection")
  ) {
    return "Gagal terhubung ke server. Periksa koneksi internet Anda.";
  }

  // Fallback jika ada error lain
  return (
    error.message ||
    "Gagal melakukan verifikasi perangkat akibat kendala sistem."
  );
};

// Helper untuk deteksi apakah web dibuka dari browser HP (Mobile Web) atau Laptop/Desktop
const checkIsMobileWeb = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera || "";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent,
  );
};

// 1. Fungsi untuk mengambil ID unik hardware HP secara aman
export const getUniqueDeviceId = async (): Promise<string> => {
  if (Platform.OS === "android") {
    return Application.getAndroidId();
  } else if (Platform.OS === "ios") {
    const iosId = await Application.getIosIdForVendorAsync();
    return iosId ?? "UNKNOWN_IOS_ID";
  }
  return "UNKNOWN_DEVICE_ID";
};

// 2. Fungsi Utama untuk Validasi & Binding Device
export const handleDeviceVerification = async (
  userId: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    // 🌐 SKENARIO 1: AKSES VIA WEB BROWSER
    if (Platform.OS === "web") {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, allowWebAppAccess")
        .eq("id", userId)
        .maybeSingle();

      if (userError) {
        console.error("🔴 [DEV DEBUG] Web check error:", userError);
        return {
          success: false,
          message: getFriendlyErrorMessage(userError),
        };
      }

      if (!userData) {
        return {
          success: false,
          message: "Data pengguna tidak ditemukan di sistem HRIS.",
        };
      }

      const isSuperAdmin = userData.role === "SUPER_ADMIN";
      const hasWebAccess = userData.allowWebAppAccess === true;
      const isMobileWeb = checkIsMobileWeb();

      // 👑 1. Jika SUPER_ADMIN: Bebas login di Web Mobile maupun Web Desktop
      if (isSuperAdmin) {
        return {
          success: true,
          message: "Akses web diizinkan.",
        };
      }

      // 🛑 2. Jika bukan SUPER_ADMIN tapi allowWebAppAccess = false / null: Ditolak
      if (!hasWebAccess) {
        return {
          success: false,
          message: "Akun Anda tidak memiliki izin untuk akses via Web Browser.",
        };
      }

      // 📱💻 3. Jika allowWebAppAccess = true: Cek jenis browser-nya
      if (isMobileWeb) {
        return {
          success: true,
          message: "Akses web mobile diizinkan.",
        };
      } else {
        return {
          success: false,
          message: "Akun Anda tidak memiliki izin untuk akses via Web Browser.",
        };
      }
    }

    // 📱 SKENARIO 2: AKSES VIA NATIVE APP (ANDROID / IOS)
    const deviceId = await getUniqueDeviceId();
    const deviceName =
      Device.modelName || Device.designName || "Unknown Device";
    const deviceType = Platform.OS;
    const appVersion = Application.nativeApplicationVersion || "1.0.0";

    if (
      !deviceId ||
      deviceId === "UNKNOWN_DEVICE_ID" ||
      deviceId === "UNKNOWN_IOS_ID"
    ) {
      return {
        success: false,
        message: "Gagal membaca Device ID pada perangkat ini.",
      };
    }

    const NAMA_TABEL = "device_bindings";

    // KONDISI AWAL: Cek apakah DEVICE ID HP ini udah terikat dengan akun manapun?
    const { data: deviceBinding, error: deviceError } = await supabase
      .from(NAMA_TABEL)
      .select("*")
      .eq("deviceId", deviceId)
      .maybeSingle();

    if (deviceError) throw deviceError;

    // --- SKENARIO A: DEVICE INI BELUM TERDAFTAR SAMA SEKALI ---
    if (!deviceBinding) {
      const { data: userBinding, error: userError } = await supabase
        .from(NAMA_TABEL)
        .select("*")
        .eq("userId", userId)
        .maybeSingle();

      if (userError) throw userError;

      if (userBinding && userBinding.deviceId !== deviceId) {
        return {
          success: false,
          message:
            "Akun Anda sudah terdaftar di perangkat lain. Silakan hubungi admin HRIS untuk reset Device ID.",
        };
      }

      const { error: upsertError } = await supabase.from(NAMA_TABEL).upsert(
        {
          userId: userId,
          deviceId: deviceId,
          deviceName: deviceName,
          deviceType: deviceType,
          appVersion: appVersion,
          lastUsed: new Date().toISOString(),
        },
        {
          onConflict: "userId, deviceType",
        },
      );

      if (upsertError) throw upsertError;

      return { success: true, message: "Perangkat baru berhasil didaftarkan!" };
    }

    // --- SKENARIO B: DEVICE INI SUDAH TERDAFTAR DI DATABASE ---
    if (deviceBinding.userId === userId) {
      // 💡 UPDATE TERBARU: appVersion dan deviceName ikut di-update tiap login rutin
      await supabase
        .from(NAMA_TABEL)
        .update({
          lastUsed: new Date().toISOString(),
          appVersion: appVersion,
          deviceName: deviceName,
        })
        .eq("deviceId", deviceId);

      return { success: true, message: "Device terverifikasi." };
    } else {
      return {
        success: false,
        message:
          "Perangkat ini sudah digunakan oleh akun lain. Satu perangkat hanya diizinkan untuk satu akun karyawan.",
      };
    }
  } catch (error: any) {
    console.error("🔴 [DEV DEBUG] Error device verification raw:", error);

    return {
      success: false,
      message: getFriendlyErrorMessage(error),
    };
  }
};

// ============================================================================
// 💡 Helper untuk ngerakit format User Agent API Tracker
// ============================================================================
export const getDeviceMetadataString = (): string => {
  const platform = Platform.OS === "ios" ? "iOS" : "Android";
  const modelName = Device.modelName || "Unknown Device";
  const osVersion = `${platform} ${Device.osVersion || "Unknown"}`;
  const appVersion = `App ${Application.nativeApplicationVersion || "1.0.0"}`;

  return `${platform} · ${modelName} · ${osVersion} · ${appVersion}`;
};
