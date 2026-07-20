import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router"; 
import { useCallback, useEffect, useState, useRef } from "react"; 
import {
  ActivityIndicator,
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
  const [unreadCount, setUnreadCount] = useState(0); 
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Fetch data User & Attendance
  const fetchHomeData = async (isManual = false) => {
    // Kalau cuma mau update manual (misal pas focus), kita bypass check null
    if (!isManual && dbUser && dbAttendance !== null) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [userRes, attendanceRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("attendances").select("*").eq("userId", user.id).eq("date", new Date().toISOString().split("T")[0]).maybeSingle()
      ]);

      setDbUser(userRes.data);
      setDbAttendance(attendanceRes.data || {});
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Badge Count (Terpisah biar fokus)
  const fetchUnreadCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadCount(count || 0);
  };

  // 3. Setup Realtime Listener & Initial Load
  useEffect(() => {
    // Push Notification Setup
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await registerForPushNotificationsAsync(user.id);
      
      // Fetch data awal
      fetchHomeData();
      fetchUnreadCount();
    };
    setup();

    // Channel Subscription
    const channel = supabase
      .channel("badge_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          // Setiap ada perubahan di notif, kita re-fetch biar akurat
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 4. Re-fetch data saat layar difokuskan (Jaminan Anti-Stuck)
  useFocusEffect(
    useCallback(() => {
      fetchHomeData(true);
      fetchUnreadCount();
    }, [])
  );

  // 5. Toast Timer
  useEffect(() => {
    if (params?.showToast === "success") {
      setIsSuccessToastVisible(true);
      timerRef.current = setTimeout(() => {
        setIsSuccessToastVisible(false);
        router.setParams({ showToast: undefined } as any);
      }, 2000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [params?.showToast]);

  const fullName = dbUser?.name || "Karyawan";
  const firstName = dbUser?.name ? dbUser.name.split(" ")[0] : "Karyawan";

  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    const d = new Date(timeString);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
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
          
          <TouchableOpacity 
            onPress={() => router.push("/profile/notifications")} 
            className="relative bg-white p-2 rounded-full shadow-sm border border-gray-200"
          >
            <Ionicons name="notifications-outline" size={22} color="#1f2937" />
            {unreadCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2 border-white">
                <Text className="text-white text-[10px] font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* --- Konten Lainnya Sama --- */}
        <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-gray-800 text-base font-bold">Status Kehadiran</Text>
            <View className="bg-sky-50 px-3 py-1 rounded-full"><Text className="text-blue-600 font-semibold text-xs">{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</Text></View>
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
          <Text className="text-gray-900 font-bold text-lg mb-6">Menu Utama</Text>
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
            <TouchableOpacity onPress={() => router.push("/beranda/payroll/payroll-page" as any)} className="w-1/4 items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-green-50 items-center justify-center mb-2"><Ionicons name="receipt" size={24} color="#59dd7a" /></View>
              <Text className="text-gray-600 text-xs text-center leading-tight">Slip{"\n"}Gaji</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}