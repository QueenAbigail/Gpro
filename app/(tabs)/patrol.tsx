import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function PatrolScreen() {
  const router = useRouter();

  const [patrolPoints, setPatrolPoints] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPatrolData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("role, siteId")
        .eq("id", authData.user.id)
        .single();

      if (!profile) return;
      setUserRole(profile.role);

      const { data: locations, error: locError } = await supabase
        .from("patrol_locations")
        .select("*")
        .eq("siteId", profile.siteId);

      if (locError) throw locError;

      const now = new Date();
      const todayDateOnly = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // 💡 PERBAIKAN UTAMA: Tambahkan eq("userId") agar hanya mengambil laporan milik user yang login
      const { data: todayPatrols, error: patrolError } = await supabase
        .from("patrols")
        .select("id, patrolLocationId, checkInTime")
        .eq("date", todayDateOnly)
        .eq("userId", authData.user.id);

      if (patrolError) throw patrolError;

      const formattedPoints =
        locations?.map((loc: any) => {
          const matchedReports =
            todayPatrols?.filter((p: any) => p.patrolLocationId === loc.id) ||
            [];

          let lastCheckedTime = null;
          if (matchedReports.length > 0) {
            const sortedReports = [...matchedReports].sort(
              (a, b) =>
                new Date(b.checkInTime).getTime() -
                new Date(a.checkInTime).getTime(),
            );
            const latestDate = new Date(sortedReports[0].checkInTime);
            lastCheckedTime = latestDate.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
          }

          return {
            id: loc.id,
            location: loc.name || loc.location,
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

  useFocusEffect(
    useCallback(() => {
      fetchPatrolData();
    }, []),
  );

  return (
    <ScrollView
      className="flex-1 bg-slate-50 pt-14 px-5"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="mb-6">
        <Text className="text-2xl font-extrabold text-slate-950">
          Laporan Patroli
        </Text>
        <Text className="text-slate-500 text-xs mt-1">
          Pantau status titik lokasi & laporan patroli harian
        </Text>
      </View>

      {userRole !== "STAFF" && userRole !== "" && (
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-5">
          <Text className="text-slate-500 text-sm font-semibold mb-3">
            Pantau Aktivitas
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/patrol/member-reports" as any)}
            className="bg-blue-500 flex-row items-center justify-center py-4 rounded-xl shadow-sm active:bg-blue-600"
          >
            <Ionicons name="clipboard" size={24} color="white" />
            <Text className="text-white font-bold text-base ml-3">
              Laporan Patroli Anggota
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
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
          patrolPoints.map((item, index) => {
            const hasReport = item.reportCount > 0;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.6}
                onPress={() => router.push(`/patrol/${item.id}` as any)}
                className={`flex-row items-center justify-between py-3 ${
                  index !== patrolPoints.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <View className="flex-row items-center flex-1 pr-3">
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

                  <View className="flex-1">
                    <Text
                      className={`text-base font-semibold ${
                        hasReport ? "text-slate-800" : "text-slate-600"
                      }`}
                      numberOfLines={1}
                    >
                      {item.location}
                    </Text>
                    <Text
                      className="text-slate-400 text-sm mt-0.5"
                      numberOfLines={1}
                    >
                      Terakhir di Check:{" "}
                      {item.lastChecked ? `${item.lastChecked} WIB` : "Belum"}
                    </Text>
                  </View>
                </View>

                {/* Counter Report (Sudah aman ukurannya) */}
                <View className="flex-row items-center justify-end shrink-0">
                  <View
                    className={`px-3 py-1 rounded-full mr-1 items-center justify-center ${
                      hasReport ? "bg-green-50" : "bg-orange-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        hasReport ? "text-green-600" : "text-orange-500"
                      }`}
                      numberOfLines={1}
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

      {userRole === "SUPER_ADMIN" && (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/patrol/input" as any,
              params: {
                locationId: "cmudsezk5000110d9yqtxubmp",
                isSimulated: "true",
              },
            })
          }
          className="bg-indigo-100 border border-indigo-200 py-4 rounded-xl items-center justify-center mb-6 flex-row border-dashed"
        >
          <Ionicons name="bug-outline" size={20} color="#4338ca" />
          <Text className="text-indigo-700 font-bold ml-2">
            [DEV] Simulasi Scan QR (Head Office)
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
