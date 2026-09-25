import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

export default function MemberPatrolLocationsScreen() {
  const router = useRouter();
  const { id, name, employeeCode } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [visitedPoints, setVisitedPoints] = useState<any[]>([]);
  const [stats, setStats] = useState({ reported: 0, remaining: 0 });

  useEffect(() => {
    const fetchMemberLocations = async () => {
      if (!id) return;
      setLoading(true);

      try {
        const { data: memberProfile } = await supabase
          .from("users")
          .select("siteId")
          .eq("id", id)
          .single();

        if (!memberProfile?.siteId) return;

        const { data: allLocations } = await supabase
          .from("patrol_locations")
          .select("id, name")
          .eq("siteId", memberProfile.siteId);

        const totalLocations = allLocations?.length || 0;

        const todayDateOnly = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

        const { data: reports } = await supabase
          .from("patrols")
          .select("id, patrolLocationId, checkInTime")
          .eq("userId", id)
          .eq("date", todayDateOnly);

        if (allLocations && reports) {
          const visited = allLocations
            .map((loc) => {
              const locReports = reports.filter(
                (r) => r.patrolLocationId === loc.id,
              );

              if (locReports.length === 0) return null;

              const sortedReports = [...locReports].sort(
                (a, b) =>
                  new Date(b.checkInTime).getTime() -
                  new Date(a.checkInTime).getTime(),
              );

              const latestDate = new Date(sortedReports[0].checkInTime);
              const lastCheckedTime = latestDate.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });

              return {
                id: loc.id,
                locationName: loc.name,
                reportCount: locReports.length,
                lastChecked: lastCheckedTime,
              };
            })
            .filter(Boolean);

          setVisitedPoints(visited);
          setStats({
            reported: visited.length,
            remaining: Math.max(0, totalLocations - visited.length),
          });
        }
      } catch (error) {
        console.error("Error fetching member locations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberLocations();
  }, [id]);

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1 pt-12 px-5"
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
          >
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">
            Titik Dikunjungi
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
              <Ionicons name="person" size={18} color="#3b82f6" />
            </View>
            <View>
              <Text className="text-lg font-bold text-slate-800">{name}</Text>
              <Text className="text-slate-400 text-xs uppercase tracking-wider">
                {employeeCode}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between border-t border-slate-100 pt-3">
            <Text className="text-slate-500 text-xs font-medium">
              Selesai:{" "}
              <Text className="text-slate-900 font-bold">
                {stats.reported} Titik
              </Text>
            </Text>
            <Text className="text-slate-500 text-xs font-medium">
              Sisa:{" "}
              <Text className="text-slate-900 font-bold">
                {stats.remaining} Titik
              </Text>
            </Text>
          </View>
        </View>

        <Text className="text-slate-800 text-base font-bold mb-4 ml-1">
          Daftar Lokasi Hari Ini ({visitedPoints.length})
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : visitedPoints.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm border border-slate-100">
            <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="map-outline" size={40} color="#cbd5e1" />
            </View>
            <Text className="text-slate-700 text-lg font-bold text-center">
              Belum Keliling
            </Text>
            <Text className="text-slate-400 text-sm text-center mt-2">
              Anggota ini belum mengirim laporan dari titik manapun.
            </Text>
          </View>
        ) : (
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            {visitedPoints.map((item, index) => {
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.6}
                  // 💡 PERUBAHAN: Pindah ke folder baru sambil bawa ID user & Nama user
                  onPress={() =>
                    router.push({
                      pathname: `/patrol/member/detail/${item.id}` as any,
                      params: { userId: id, userName: name },
                    })
                  }
                  className={`flex-row items-center justify-between py-3 ${
                    index !== visitedPoints.length - 1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#16a34a"
                      />
                    </View>

                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold text-slate-800"
                        numberOfLines={1}
                      >
                        {item.locationName}
                      </Text>
                      <Text
                        className="text-slate-400 text-sm mt-0.5"
                        numberOfLines={1}
                      >
                        Terakhir di Check: {item.lastChecked} WIB
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-end shrink-0">
                    <View className="px-3 py-1 rounded-full mr-1 items-center justify-center bg-green-50">
                      <Text
                        className="text-xs font-bold text-green-600"
                        numberOfLines={1}
                      >
                        {item.reportCount} Report
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#cbd5e1"
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
