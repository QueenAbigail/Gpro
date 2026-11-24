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
  const [siteList, setSiteList] = useState<any[]>([]);
  const [isHOUser, setIsHOUser] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPatrolData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("role, siteId, sites(id, name, code)")
        .eq("id", authData.user.id)
        .single();

      if (!profile) return;
      setUserRole(profile.role);

      const siteObj = Array.isArray(profile.sites)
        ? profile.sites[0]
        : profile.sites;
      const siteName = siteObj?.name || "";
      const siteCode = siteObj?.code || "";

      const isHO =
        siteName.toLowerCase().includes("head office") || siteCode === "HO";
      setIsHOUser(isHO);

      const now = new Date();
      const todayDateOnly = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      if (isHO) {
        // --- MODE HEAD OFFICE: Tampilkan daftar semua Site beserta ringkasan patrolinya hari ini ---
        const [sitesRes, allLocsRes, allPatrolsRes] = await Promise.all([
          supabase.from("sites").select("id, name, code").order("name"),
          supabase.from("patrol_locations").select("id, siteId"),
          supabase
            .from("patrols")
            .select("id, siteId, patrolLocationId, checkInTime")
            .eq("date", todayDateOnly),
        ]);

        if (sitesRes.error) throw sitesRes.error;
        if (allLocsRes.error) throw allLocsRes.error;
        if (allPatrolsRes.error) throw allPatrolsRes.error;

        const sites = sitesRes.data || [];
        const allLocs = allLocsRes.data || [];
        const allPatrols = allPatrolsRes.data || [];

        const locationToSiteMap = new Map<string, string>();
        allLocs.forEach((loc: any) => {
          if (loc.id && loc.siteId) {
            locationToSiteMap.set(loc.id, loc.siteId);
          }
        });

        const formattedSites = sites.map((site: any) => {
          const siteLocations = allLocs.filter(
            (loc: any) => loc.siteId === site.id,
          );
          const matchedReports = allPatrols.filter(
            (p: any) =>
              p.siteId === site.id ||
              locationToSiteMap.get(p.patrolLocationId) === site.id,
          );

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
            id: site.id,
            name: site.name,
            code: site.code,
            locationCount: siteLocations.length,
            reportCount: matchedReports.length,
            lastChecked: lastCheckedTime,
          };
        });

        // Urutkan agar Head Office tampil paling atas, sisanya urut abjad
        formattedSites.sort((a: any, b: any) => {
          const aIsHO =
            a.name?.toLowerCase().includes("head office") || a.code === "HO";
          const bIsHO =
            b.name?.toLowerCase().includes("head office") || b.code === "HO";
          if (aIsHO && !bIsHO) return -1;
          if (!aIsHO && bIsHO) return 1;
          return (a.name || "").localeCompare(b.name || "");
        });

        setSiteList(formattedSites);
        return;
      }

      // --- MODE SITE OPERASIONAL BIASA (NON-HO) ---
      const { data: locations, error: locError } = await supabase
        .from("patrol_locations")
        .select("*")
        .eq("siteId", profile.siteId);

      if (locError) throw locError;

      // Ambil laporan milik user yang login
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
      className="flex-1 bg-sky-50 pt-14 px-5"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="mb-6">
        <Text className="text-2xl font-extrabold text-slate-950">
          Laporan Patroli
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
            {isHOUser ? "Monitoring Patroli Site" : "Titik Patroli Hari Ini"}
          </Text>
          <Text className="text-blue-500 text-sm font-semibold">
            {isHOUser
              ? `${siteList.length} Site`
              : `${patrolPoints.length} Titik`}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#3b82f6" className="py-4" />
        ) : isHOUser ? (
          siteList.length === 0 ? (
            <Text className="text-slate-400 text-center py-4 text-sm">
              Tidak ada site yang terdaftar.
            </Text>
          ) : (
            siteList.map((item, index) => {
              const hasReport = item.reportCount > 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.6}
                  onPress={() =>
                    router.push({
                      pathname: `/patrol/site/${item.id}` as any,
                      params: { siteName: item.name },
                    })
                  }
                  className={`flex-row items-center justify-between py-3 ${
                    index !== siteList.length - 1
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
                        name={hasReport ? "checkmark-circle" : "business"}
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
                        {item.name}
                      </Text>
                      <Text
                        className="text-slate-400 text-xs mt-0.5"
                        numberOfLines={1}
                      >
                        {item.locationCount} Titik •{" "}
                        {item.lastChecked
                          ? `Terakhir: ${item.lastChecked} WIB`
                          : "Belum ada laporan"}
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
          )
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
