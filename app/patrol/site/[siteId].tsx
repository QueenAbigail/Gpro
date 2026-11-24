import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import ScreenHeader from "../../../components/ScreenHeader";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

export default function SitePatrolLocationsScreen() {
  const router = useRouter();
  const { siteId, siteName } = useLocalSearchParams<{
    siteId: string;
    siteName?: string;
  }>();

  const [resolvedSiteName, setResolvedSiteName] = useState<string>(
    siteName || "Memuat Site...",
  );
  const [patrolPoints, setPatrolPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSitePatrolPoints = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      // Ambil nama site jika tidak terkirim lewat params
      if (!siteName) {
        const { data: siteData } = await supabase
          .from("sites")
          .select("name")
          .eq("id", siteId)
          .maybeSingle();
        if (siteData?.name) setResolvedSiteName(siteData.name);
      }

      const { data: locations, error: locError } = await supabase
        .from("patrol_locations")
        .select("*")
        .eq("siteId", siteId)
        .order("name", { ascending: true });

      if (locError) throw locError;

      if (!locations || locations.length === 0) {
        setPatrolPoints([]);
        return;
      }

      const now = new Date();
      const todayDateOnly = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const locIds = locations.map((loc: any) => loc.id);

      // Tarik seluruh laporan hari ini untuk semua titik di site ini (semua petugas)
      const { data: todayPatrols, error: patrolError } = await supabase
        .from("patrols")
        .select("id, patrolLocationId, checkInTime")
        .eq("date", todayDateOnly)
        .in("patrolLocationId", locIds);

      if (patrolError) throw patrolError;

      const formattedPoints = locations.map((loc: any) => {
        const matchedReports =
          todayPatrols?.filter((p: any) => p.patrolLocationId === loc.id) || [];

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
      });

      setPatrolPoints(formattedPoints);
    } catch (error) {
      console.error("Error fetching site patrol locations:", error);
    } finally {
      setLoading(false);
    }
  }, [siteId, siteName]);

  useFocusEffect(
    useCallback(() => {
      fetchSitePatrolPoints();
    }, [fetchSitePatrolPoints]),
  );

  return (
    <View className="flex-1 bg-sky-50 pt-12">
      <ScreenHeader title={resolvedSiteName} />

      <ScrollView
        className="flex-1 px-5 pt-2"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Card Titik Patroli */}
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
              Tidak ada titik patroli yang terdaftar di site ini.
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
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#cbd5e1"
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

