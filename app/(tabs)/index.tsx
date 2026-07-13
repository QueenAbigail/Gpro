import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router"; 
import { useCallback, useEffect, useState } from "react"; 
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase"; 
import { registerForPushNotificationsAsync } from "../../lib/notifications"; // 👈 1. IMPORT HELPER NOTIFIKASI LU

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 

  // State untuk data dan loading
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<any>(null);
  const [dbAttendance, setDbAttendance] = useState<any>(null);
  
  // State buat ngontrol transisi Top Toast
  const [isSuccessToastVisible, setIsSuccessToastVisible] = useState(false);

  // 🚀 2. EFFECT UTAMA: REGISTRASI PUSH NOTIFICATION (Hanya jalan 1x pas aplikasi dibuka)
  useEffect(() => {
    const setupPushNotifications = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          // Picu izin notifikasi dan simpan tokennya ke kolom 'expoPushToken' di DB
          await registerForPushNotificationsAsync(authData.user.id);
        }
      } catch (error) {
        console.error("Gagal setup notifikasi pada mount:", error);
      }
    };

    setupPushNotifications();
  }, []);

  // EFFECT UNTUK MENANGKAP KIRIMAN TOAST DARI LOGIN PAGE
  useEffect(() => {
    if (params?.showToast === "success") {
      setIsSuccessToastVisible(true);

      // Langsung bersihin parameter di URL supaya gak ketrigger lagi pas pindah tab/back
      router.setParams({ showToast: undefined } as any);

      // Durasi toast muncul sebelum menghilang halus
      const timer = setTimeout(() => {
        setIsSuccessToastVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [params?.showToast]);

  // Bikin tanggal hari ini (Format: 26 Juni 2026)
  const today = new Date();
  const formattedToday = today.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Fungsi fetch data Beranda
  const fetchHomeData = async (isManual = false) => {
    if (!isManual && dbUser && dbAttendance !== null) {
      return;
    }

    try {
      setLoading(true);
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) throw new Error("Gagal ambil sesi user");

      // 1. Tarik Data User (Buat Nama, Role & Foto)
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (userError) throw userError;

      // 2. Tarik Data Absen Hari Ini
      const todayString = today.toISOString().split("T")[0];

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendances")
        .select("*")
        .eq("userId", authData.user.id)
        .eq("date", todayString)
        .maybeSingle();

      if (attendanceError && attendanceError.code !== "PGRST116") {
        console.error("Error fetch attendance:", attendanceError);
      }

      setDbUser(userData);
      setDbAttendance(attendanceData || {});
    } catch (error: any) {
      Alert.alert("Error", error.message || "Gagal memuat data beranda.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHomeData();
    }, [dbUser, dbAttendance]),
  );

  const fullName = dbUser?.name || "Karyawan";
  const firstName = dbUser?.name ? dbUser.name.split(" ")[0] : "Karyawan";

  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    const d = new Date(timeString);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const jamMasuk = formatTime(dbAttendance?.actualCheckIn);
  const jamPulang = formatTime(dbAttendance?.actualCheckOut);

  return (
    <View className="flex-1 bg-sky-50">
      
      {/* 🟢 TOP TOAST / SONNER EFFECT */}
      {isSuccessToastVisible && (
        <View className="absolute top-14 left-6 right-6 bg-white border border-emerald-100 p-4 rounded-2xl flex-row items-center shadow-lg z-50">
          <View className="w-8 h-8 bg-emerald-50 rounded-full items-center justify-center mr-3">
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          </View>
          <View className="flex-1">
            <Text className="text-slate-800 font-bold text-sm">Berhasil masuk!</Text>
            <Text className="text-slate-400 text-xs">Selamat bekerja kembali.</Text>
          </View>
        </View>
      )}

      {/* Sisa konten utama dimasukkan ke dalam ScrollView pendamping */}
      <ScrollView className="flex-1 pt-14 px-5" showsVerticalScrollIndicator={false}>
        {/* --- BAGIAN HEADER PROFIL --- */}
        <View className="flex-row justify-between items-center mb-8">
          <View className="flex-row items-center">
            {loading ? (
              <View className="w-12 h-12 rounded-full mr-3 border-2 border-white shadow-sm bg-gray-200 items-center justify-center">
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : (
              <Image
                source={{
                  uri:
                    dbUser?.photoUrl ||
                    `https://ui-avatars.com/api/?name=${firstName}&background=0b5394&color=fff&size=128`,
                }}
                className="w-12 h-12 rounded-full mr-3 border-2 border-white shadow-sm"
              />
            )}
            <View>
              <Text className="text-gray-600 text-sm font-medium">
                Selamat Pagi,
              </Text>
              {loading ? (
                <View className="h-6 w-32 bg-gray-200 rounded mt-1" />
              ) : (
                <Text className="text-xl font-extrabold text-gray-950">
                  {fullName}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/profile/notifications")}
            className="bg-white p-2 rounded-full shadow-sm border border-gray-200"
          >
            <Ionicons name="notifications-outline" size={22} color="#1f2937" />
          </TouchableOpacity>
        </View>
        {/* --- AKHIR HEADER PROFIL --- */}

        {/* --- BAGIAN CARD STATUS KEHADIRAN --- */}
        <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-gray-800 text-base font-bold">
              Status Kehadiran
            </Text>
            <View className="bg-sky-50 px-3 py-1 rounded-full">
              <Text className="text-blue-600 font-semibold text-xs">
                {formattedToday}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-gray-500 text-xs mb-1">Jam Masuk</Text>
              <Text
                className={`text-3xl font-extrabold ${jamMasuk ? "text-gray-950" : "text-gray-400"}`}
              >
                {loading ? "..." : jamMasuk || "--:--"}
              </Text>
            </View>
            <View className="h-10 w-[1px] bg-gray-200" />
            <View className="items-end">
              <Text className="text-gray-500 text-xs mb-1">Jam Pulang</Text>
              <Text
                className={`text-3xl font-extrabold ${jamPulang ? "text-gray-950" : "text-gray-400"}`}
              >
                {loading ? "..." : jamPulang || "--:--"}
              </Text>
            </View>
          </View>
        </View>
        {/* --- AKHIR CARD STATUS --- */}

        {/* --- BAGIAN MENU UTAMA --- */}
        <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-10">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-gray-900 font-bold text-lg">Menu Utama</Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-blue-500 font-semibold text-sm mr-1">
                Atur
              </Text>
              <Ionicons name="options-outline" size={16} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap items-start">
            <TouchableOpacity
              onPress={() => router.push("/beranda/absen/masuk")}
              className="w-1/4 items-center mb-4"
            >
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
                <Ionicons name="log-in" size={24} color="#3b82f6" />
              </View>
              <Text className="text-gray-600 text-xs text-center leading-tight">
                Absen{"\n"}Masuk
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/beranda/absen/pulang")}
              className="w-1/4 items-center mb-4"
            >
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
                <Ionicons name="log-out" size={24} color="#3b82f6" />
              </View>
              <Text className="text-gray-600 text-xs text-center leading-tight">
                Absen{"\n"}Pulang
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/beranda/bko" as any)}
              className="w-1/4 items-center mb-4"
            >
              <View className="w-12 h-12 rounded-full bg-amber-50 items-center justify-center mb-2">
                <Ionicons name="briefcase" size={24} color="#f59e0b" />
              </View>
              <Text className="text-gray-600 text-xs text-center leading-tight">
                Ambil{"\n"}Backup
              </Text>
            </TouchableOpacity>

            {dbUser?.role !== "STAFF" && (
              <TouchableOpacity
                onPress={() => router.push("/beranda/absen-anggota" as any)}
                className="w-1/4 items-center mb-4"
              >
                <View className="w-12 h-12 rounded-full bg-violet-50 items-center justify-center mb-2">
                  <Ionicons name="people" size={24} color="#8b5cf6" />
                </View>
                <Text className="text-gray-600 text-xs text-center leading-tight">
                  Absen{"\n"}Anggota
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* --- AKHIR MENU UTAMA --- */}

        {/* --- BAGIAN BANNER PENGUMUMAN --- */}
        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-900 font-bold text-lg">
              Informasi Perusahaan
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="overflow-visible"
          >
            <View className="bg-blue-600 w-72 p-5 rounded-3xl mr-4 shadow-md">
              <View className="bg-blue-500/50 self-start px-2 py-1 rounded-md mb-3">
                <Text className="text-white text-[10px] font-bold tracking-wider">
                  INFO APLIKASI
                </Text>
              </View>
              <Text className="text-white font-bold text-base mb-1">
                Sistem ESS Terintegrasi
              </Text>
              <Text className="text-blue-100 text-xs">
                Selamat datang di aplikasi Employee Self Service (ESS). Kelola
                data absensi, patroli, and administrasi Anda dengan lebih mudah.
              </Text>
            </View>

            <View className="bg-emerald-500 w-72 p-5 rounded-3xl mr-4 shadow-md">
              <View className="bg-emerald-400/50 self-start px-2 py-1 rounded-md mb-3">
                <Text className="text-white text-[10px] font-bold tracking-wider">
                  PENGINGAT
                </Text>
              </View>
              <Text className="text-white font-bold text-base mb-1">
                Jangan Lupa Absen & Patroli
              </Text>
              <Text className="text-emerald-50 text-xs">
                Pastikan Anda selalu melakukan absen tepat waktu dan menyelesaikan
                jadwal patroli sesuai SOP area penempatan.
              </Text>
            </View>
          </ScrollView>
        </View>
        {/* --- AKHIR BANNER PENGUMUMAN --- */}

        {/* Extra spacing bawah */}
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}