import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router"; 
import { useCallback, useEffect, useState, useRef } from "react"; 
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
import { registerForPushNotificationsAsync } from "../../lib/notifications"; 

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 

  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<any>(null);
  const [dbAttendance, setDbAttendance] = useState<any>(null);
  const [isSuccessToastVisible, setIsSuccessToastVisible] = useState(false);
  
  // Ref untuk nampung timer biar nggak bentrok
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const setupPushNotifications = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await registerForPushNotificationsAsync(authData.user.id);
        }
      } catch (error: any) {
        console.error("Gagal setup notifikasi:", error);
      }
    };
    setupPushNotifications();
  }, []);

  useEffect(() => {
    // 1. Cuma jalanin kalau bener-bener "success"
    if (params?.showToast === "success") {
      setIsSuccessToastVisible(true);

      // 2. Set timer 5 detik
      timerRef.current = setTimeout(() => {
        setIsSuccessToastVisible(false);
        
        // 3. Hapus params TEPAT pas toast mau ilang
        router.setParams({ showToast: undefined } as any);
      }, 2000);
    }

    // Cleanup: bakal jalan pas komponen unmount atau params berubah
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [params?.showToast]);

  const today = new Date();
  const formattedToday = today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const fetchHomeData = async (isManual = false) => {
    if (!isManual && dbUser && dbAttendance !== null) return;

    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("Debug: Sesi sudah tidak ada, fetch dibatalkan.");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("AUTH_SESSION_MISSING");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (userError) throw new Error("DB_FETCH_USER_FAILED");

      const todayString = today.toISOString().split("T")[0];
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendances")
        .select("*")
        .eq("userId", authData.user.id)
        .eq("date", todayString) 
        .maybeSingle();

      if (attendanceError) throw new Error("DB_FETCH_ATTENDANCE_FAILED");

      setDbUser(userData);
      setDbAttendance(attendanceData || {});
      
    } catch (error: any) {
      Alert.alert("DEBUG INFO", error.message || "Unknown Error");
      if (error.message === "Gagal ambil sesi user" || error.message === "AUTH_SESSION_MISSING") return;
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHomeData();
    }, [])
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

  if (loading && !dbUser) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-sky-50">
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

      <ScrollView className="flex-1 pt-14 px-5" showsVerticalScrollIndicator={false}>
        <View className="flex-row justify-between items-center mb-8">
          <View className="flex-row items-center">
            <Image
              source={{ uri: dbUser?.photoUrl || `https://ui-avatars.com/api/?name=${firstName}&background=0b5394&color=fff&size=128` }}
              className="w-12 h-12 rounded-full mr-3 border-2 border-white shadow-sm"
            />
            <View>
              <Text className="text-gray-600 text-sm font-medium">Selamat Pagi,</Text>
              <Text className="text-xl font-extrabold text-gray-950">{fullName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/profile/notifications")} className="bg-white p-2 rounded-full shadow-sm border border-gray-200">
            <Ionicons name="notifications-outline" size={22} color="#1f2937" />
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-gray-800 text-base font-bold">Status Kehadiran</Text>
            <View className="bg-sky-50 px-3 py-1 rounded-full"><Text className="text-blue-600 font-semibold text-xs">{formattedToday}</Text></View>
          </View>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-gray-500 text-xs mb-1">Jam Masuk</Text>
              <Text className={`text-3xl font-extrabold ${jamMasuk ? "text-gray-950" : "text-gray-400"}`}>{jamMasuk || "--:--"}</Text>
            </View>
            <View className="h-10 w-[1px] bg-gray-200" />
            <View className="items-end">
              <Text className="text-gray-500 text-xs mb-1">Jam Pulang</Text>
              <Text className={`text-3xl font-extrabold ${jamPulang ? "text-gray-950" : "text-gray-400"}`}>{jamPulang || "--:--"}</Text>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-10">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-gray-900 font-bold text-lg">Menu Utama</Text>
          </View>
          <View className="flex-row flex-wrap items-start">
            <TouchableOpacity onPress={() => router.push("/beranda/absen/masuk")} className="w-1/4 items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2"><Ionicons name="log-in" size={24} color="#3b82f6" /></View>
              <Text className="text-gray-600 text-xs text-center leading-tight">Absen{"\n"}Masuk</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/beranda/absen/pulang")} className="w-1/4 items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2"><Ionicons name="log-out" size={24} color="#3b82f6" /></View>
              <Text className="text-gray-600 text-xs text-center leading-tight">Absen{"\n"}Pulang</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/beranda/bko" as any)} className="w-1/4 items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-amber-50 items-center justify-center mb-2"><Ionicons name="briefcase" size={24} color="#f59e0b" /></View>
              <Text className="text-gray-600 text-xs text-center leading-tight">Ambil{"\n"}Backup</Text>
            </TouchableOpacity>
            {dbUser?.role !== "STAFF" && (
              <TouchableOpacity onPress={() => router.push("/beranda/absen-anggota" as any)} className="w-1/4 items-center mb-4">
                <View className="w-12 h-12 rounded-full bg-violet-50 items-center justify-center mb-2"><Ionicons name="people" size={24} color="#8b5cf6" /></View>
                <Text className="text-gray-600 text-xs text-center leading-tight">Absen{"\n"}Anggota</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}