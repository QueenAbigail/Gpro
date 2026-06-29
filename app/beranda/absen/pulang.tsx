import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

// Rumus Haversine buat hitung jarak radius geofence
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p))) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

export default function AbsenPulangScreen() {
  const router = useRouter();

  // State Waktu & Loading
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // State Validasi Lokasi (GPS)
  const [isLocationValid, setIsLocationValid] = useState(false);
  const [locationMessage, setLocationMessage] = useState("Mendapatkan Koordinat...");
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  // State Aturan Absen & Data DB
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);
  const [dbJamMasuk, setDbJamMasuk] = useState<string | null>(null);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [scheduleOutTime, setScheduleOutTime] = useState<Date | null>(null);

  // State Menu Debug (Khusus SUPER_ADMIN)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [bypassWaktuPulang, setBypassWaktuPulang] = useState(false);

  const validateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("Izin akses lokasi (GPS) ditolak.");

      setLocationMessage("Mengambil data GPS kamu...");
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({ lat: location.coords.latitude, lon: location.coords.longitude });

      setLocationMessage("Memeriksa profil & jadwal...");
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Gagal mengambil sesi.");

      const { data: userData } = await supabase
        .from("users")
        .select("siteId, allowMobileAttendance, role")
        .eq("id", authData.user.id)
        .maybeSingle();

      // Kunci role khusus SUPER_ADMIN
      if (userData?.role === "SUPER_ADMIN") {
        setIsSuperAdmin(true);
      }

      const todayString = new Date().toISOString().split("T")[0];
      const { data: attData } = await supabase
        .from("attendances")
        .select("id, actualCheckIn, actualCheckOut, scheduledEnd") // ✅ Sesuai nama kolom asli lu
        .eq("userId", authData.user.id)
        .eq("date", todayString)
        .maybeSingle();

      if (attData) {
        setCurrentAttendanceId(attData.id);
        if (attData.actualCheckIn) setDbJamMasuk(attData.actualCheckIn);
        if (attData.actualCheckOut) setHasCheckedOut(true);
        
        if (attData.scheduledEnd) {
          const [h, m, s] = attData.scheduledEnd.split(":");
          const tempDate = new Date();
          tempDate.setHours(parseInt(h), parseInt(m), parseInt(s || "0"), 0);
          setScheduleOutTime(tempDate);
        }
      }

      setIsLocationValid(true);
      setLocationMessage("Lokasi Valid");
    } catch (error: any) {
      setIsLocationValid(false);
      setLocationMessage(error.message || "Gagal memvalidasi lokasi.");
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    validateLocation();
    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours().toString().padStart(2, "0");
  const minutes = currentTime.getMinutes().toString().padStart(2, "0");
  const seconds = currentTime.getSeconds().toString().padStart(2, "0");

  const day = currentTime.getDate().toString().padStart(2, "0");
  const month = (currentTime.getMonth() + 1).toString().padStart(2, "0");
  const year = currentTime.getFullYear();

  // Hitung Durasi Shift
  const getDurasiKerja = () => {
    if (!dbJamMasuk) return "--j --m";
    const checkInTime = new Date(dbJamMasuk);
    const diffMs = currentTime.getTime() - checkInTime.getTime();
    if (diffMs < 0) return "0j 0m";
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}j ${diffMins}m`;
  };

  const getTeksJamMasuk = () => {
    if (!dbJamMasuk) return "--:--";
    const d = new Date(dbJamMasuk);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m} WIB`;
  };

  // Validasi Aturan Tombol Utama
  const isTooEarly = scheduleOutTime && !bypassWaktuPulang ? currentTime < scheduleOutTime : false;
  const isButtonDisabled = !isLocationValid || hasCheckedOut || !dbJamMasuk || isTooEarly || isLoading;

  let buttonTitle = "CATAT ABSEN PULANG";
  let buttonSubtitle = "Hanya validasi GPS lokasi";
  let buttonIcon = "log-out";

  if (!dbJamMasuk) {
    buttonTitle = "BELUM ABSEN MASUK";
    buttonSubtitle = "Wajib absen masuk terlebih dahulu";
    buttonIcon = "alert-circle";
  } else if (hasCheckedOut) {
    buttonTitle = "SUDAH PULANG";
    buttonSubtitle = "Shift kerja hari ini selesai";
    buttonIcon = "checkmark-done";
  } else if (isTooEarly) {
    buttonTitle = "BELUM WAKTUNYA PULANG";
    const outH = scheduleOutTime!.getHours().toString().padStart(2, "0");
    const outM = scheduleOutTime!.getMinutes().toString().padStart(2, "0");
    buttonSubtitle = `Jadwal pulangmu hari ini pukul ${outH}:${outM}`;
    buttonIcon = "time";
  }

  // Kirim Data Pulang ke Supabase
  const submitAbsenPulang = async () => {
    if (isButtonDisabled) return;
    setIsLoading(true);

    try {
      const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;

      const { error } = await supabase
        .from("attendances")
        .update({
          actualCheckOut: localDateTime,
          gpsLatPulang: userLocation?.lat,
          gpsLngPulang: userLocation?.lon,
        })
        .eq("id", currentAttendanceId);

      if (error) throw error;

      setHasCheckedOut(true);
      setIsLoading(false);
      Alert.alert("Absen Pulang Berhasil", "Selamat beristirahat!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert("Gagal Absen Pulang", error.message || "Terjadi kesalahan server.");
    }
  };

  return (
    <View className="flex-1 bg-sky-50">
      {/* Header */}
      <View className="pt-16 pb-4 px-6 bg-white flex-row items-center border-b border-sky-100 shadow-sm z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-sky-50 rounded-full items-center justify-center mr-4 active:bg-sky-100"
        >
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-gray-900">Absen Pulang</Text>
          <Text className="text-gray-500 text-xs mt-0.5">Selesaikan shift kerjamu hari ini</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Card Waktu */}
        <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-6 items-center">
          <Text className="text-gray-500 font-medium mb-2">Waktu Saat Ini</Text>
          <View className="flex-row items-end mb-4">
            <Text className="text-5xl font-extrabold text-gray-900 tracking-tight">{hours}:{minutes}</Text>
            <Text className="text-2xl font-bold text-gray-400 ml-1 mb-1">:{seconds}</Text>
          </View>

          <View className={`flex-row items-center px-4 py-2 rounded-full ${isLocationValid ? "bg-emerald-50" : "bg-amber-50"}`}>
            {isLocationValid ? (
              <>
                <Ionicons name="location" size={16} color="#10b981" />
                <Text className="text-emerald-700 text-xs font-bold ml-2">{locationMessage}</Text>
              </>
            ) : (
              <>
                {userLocation ? <Ionicons name="warning" size={16} color="#f59e0b" /> : <ActivityIndicator size="small" color="#f59e0b" />}
                <Text className="text-amber-700 text-xs font-bold ml-2">{locationMessage}</Text>
              </>
            )}
          </View>
        </View>

        {/* Ringkasan Shift */}
        <View className="bg-blue-600 rounded-3xl p-5 shadow-md mb-8">
          <Text className="text-blue-100 font-medium text-sm mb-4">Ringkasan Shift Hari Ini</Text>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-blue-200 text-xs mb-1">Jam Masuk</Text>
              <Text className="text-white text-xl font-bold">{getTeksJamMasuk()}</Text>
            </View>
            <View className="h-8 w-[1px] bg-blue-400" />
            <View className="items-end">
              <Text className="text-blue-200 text-xs mb-1">Durasi Kerja</Text>
              <Text className="text-white text-xl font-bold">{getDurasiKerja()}</Text>
            </View>
          </View>
        </View>

        {/* Tombol Catat Absen Pulang */}
        <TouchableOpacity
          onPress={submitAbsenPulang}
          disabled={isButtonDisabled}
          className={`w-full py-5 rounded-3xl items-center flex-row justify-center shadow-lg ${
            isButtonDisabled ? "bg-slate-300" : "bg-rose-600 active:bg-rose-700"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
                <Ionicons name={buttonIcon as any} size={24} color="white" />
              </View>
              <View className="items-start">
                <Text className="text-white font-extrabold text-lg tracking-wide">{buttonTitle}</Text>
                <Text className={isButtonDisabled ? "text-slate-100 text-xs" : "text-rose-100 text-xs"}>{buttonSubtitle}</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* ✅ MENU DEBUG UNGU KHUSUS SUPER_ADMIN (Selalu Bisa Dipencet) */}
        {isSuperAdmin && (
          <View className="mt-6 p-4 border border-purple-200 bg-purple-50 rounded-2xl items-center">
            <Text className="text-purple-700 font-bold mb-3 text-xs uppercase tracking-wider">🛠️ Menu Debug Admin (Selalu Aktif)</Text>
            <View className="flex-row flex-wrap justify-center gap-2 w-full">
              <TouchableOpacity
                onPress={() => setHasCheckedOut(!hasCheckedOut)}
                className="px-3 py-2 rounded-lg bg-purple-600 active:bg-purple-700"
              >
                <Text className="text-white font-semibold text-[10px] text-center">
                  Status Pulang ({hasCheckedOut ? "Sudah" : "Belum"})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBypassWaktuPulang(!bypassWaktuPulang)}
                className="px-3 py-2 rounded-lg bg-purple-600 active:bg-purple-700"
              >
                <Text className="text-white font-semibold text-[10px] text-center">
                  Bypass Waktu ({bypassWaktuPulang ? "ON" : "OFF"})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDbJamMasuk(dbJamMasuk ? null : new Date().toISOString())}
                className="px-3 py-2 rounded-lg bg-purple-600 active:bg-purple-700"
              >
                <Text className="text-white font-semibold text-[10px] text-center">
                  Data Masuk ({dbJamMasuk ? "Ada" : "Gak Ada"})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}