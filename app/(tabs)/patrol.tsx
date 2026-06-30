import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase"; // Sesuaikan path Supabase lu Can

export default function PatrolScreen() {
  const router = useRouter();

  // States untuk data dinamis
  const [patrolPoints, setPatrolPoints] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPatrolData = async () => {
    setLoading(true);
    try {
      // 1. Ambil ID User yang login
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      // 2. Ambil Profil User (Role dan siteId)
      const { data: profile } = await supabase
        .from("users")
        .select("role, siteId")
        .eq("id", authData.user.id)
        .single();

      if (!profile) return;
      setUserRole(profile.role); // Simpan role untuk masking fitur

      // 3. Ambil seluruh titik lokasi patroli di Site ini
      const { data: locations, error: locError } = await supabase
        .from("patrol_locations")
        .select("*")
        .eq("siteId", profile.siteId);

      if (locError) throw locError;

      // 4. Ambil data patroli khusus hari ini untuk hitung counter & jam terakhir check
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayPatrols } = await supabase
        .from("patrols")
        .select("id, locationId, createdAt")
        .gte("createdAt", todayStart.toISOString());

      // 5. Mapping data gabungan ke bentuk state layout
      const formattedPoints =
        locations?.map((loc: any) => {
          // Cari report hari ini yang cocok dengan ID lokasi ini
          const matchedReports =
            todayPatrols?.filter((p: any) => p.locationId === loc.id) || [];

          let lastCheckedTime = null;
          if (matchedReports.length > 0) {
            // Urutkan paling baru untuk dapet jam check terakhir
            const sortedReports = [...matchedReports].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );
            const latestDate = new Date(sortedReports[0].createdAt);
            lastCheckedTime = latestDate.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });
          }

          return {
            id: loc.id,
            location: loc.name || loc.location, // Mengantisipasi nama kolom name/location di DB lu
            lastChecked: lastCheckedTime,
            reportCount: matchedReports.length,
          };
        }) || [];

      setPatrolPoints(formattedPoints);
    } catch (error) {
      console.error("Error fetching patrol data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatrolData();
  }, []);

  return (
    <ScrollView className="flex-1 bg-slate-50 pt-12 px-5">
      {/* 1. Card Laporan Patroli — MASKING: Selain Staff yang bisa lihat */}
      {userRole !== "STAFF" && userRole !== "" && (
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-5">
          <Text className="text-slate-500 text-sm font-semibold mb-3">
            Pantau Aktivitas
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/patrol/member-reports")}
            className="bg-blue-500 flex-row items-center justify-center py-4 rounded-xl shadow-sm active:bg-blue-600"
          >
            <Ionicons name="clipboard" size={24} color="white" />
            <Text className="text-white font-bold text-base ml-3">
              Laporan Patroli Anggota
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Card List Titik Patroli */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-slate-800 text-lg font-bold">
            Titik Patroli Hari Ini
          </Text>
          <Text className="text-blue-500 text-sm font-semibold">
            {patrolPoints.length} Titik
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#3b82f6" className="py-4" />
        ) : patrolPoints.length === 0 ? (
          <Text className="text-slate-400 text-center py-4 text-sm">
            Tidak ada titik patroli yang terdaftar di lokasi ini.
          </Text>
        ) : (
          /* Looping data dinamis dari Supabase */
          patrolPoints.map((item, index) => {
            const hasReport = item.reportCount > 0;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.6}
                onPress={() => router.push(`/patrol/${item.id}`)}
                className={`flex-row items-center justify-between py-3 ${
                  index !== patrolPoints.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                      hasReport ? "bg-green-100" : "bg-slate-100"
                    }`}
                  >
                    <Ionicons
                      name={hasReport ? "checkmark-circle" : "location"}
                      size={20}
                      color={hasReport ? "#16a34a" : "#94a3b8"}
                    />
                  </View>

                  <View className="flex-1 pr-2">
                    <Text
                      className={`text-base font-semibold ${
                        hasReport ? "text-slate-800" : "text-slate-600"
                      }`}
                      numberOfLines={1}
                    >
                      {item.location}
                    </Text>
                    <Text className="text-slate-400 text-sm mt-0.5">
                      Terakhir di Check:{" "}
                      {item.lastChecked ? `${item.lastChecked} WIB` : "Belum"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <View
                    className={`px-3 py-1 rounded-full mr-1 ${
                      hasReport ? "bg-green-50" : "bg-orange-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        hasReport ? "text-green-600" : "text-orange-500"
                      }`}
                    >
                      {item.reportCount} Report
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* 3. TOMBOL TESTING / BACKDOOR — MASKING: Hanya SUPER_ADMIN yang bisa lihat */}
      {userRole === "SUPER_ADMIN" && (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/patrol/input" as any,
              params: { locationId: "1" },
            })
          }
          className="bg-indigo-100 border border-indigo-200 py-4 rounded-xl items-center justify-center mb-10 flex-row border-dashed"
        >
          <Ionicons name="bug-outline" size={20} color="#4338ca" />
          <Text className="text-indigo-700 font-bold ml-2">
            [DEV] Simulasi Scan QR
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
