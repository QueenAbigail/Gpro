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
import { supabase } from "../../lib/supabase";

export default function MemberReportsScreen() {
  const router = useRouter();

  // States
  const [membersOnDuty, setMembersOnDuty] = useState<any[]>([]);
  const [totalLocations, setTotalLocations] = useState(0);
  const [isFetching, setIsFetching] = useState(true);

  const fetchMemberReports = async () => {
    setIsFetching(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sesi tidak ditemukan");

      // 1. Ambil Profil User Logged In buat dapet siteId
      const { data: myProfile } = await supabase
        .from("users")
        .select("siteId")
        .eq("id", authData.user.id)
        .single();

      if (!myProfile?.siteId) return;

      // Ambil tanggal hari ini format YYYY-MM-DD
      const now = new Date();
      const todayDateOnly = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // 2. Tarik Total Titik Pengecekan Patroli
      const { data: locationsData } = await supabase
        .from("patrol_locations")
        .select("id")
        .eq("siteId", myProfile.siteId);

      const totalPoints = locationsData?.length || 0;
      setTotalLocations(totalPoints);

      // 3. Tarik Data User di Site ini (Kecuali diri sendiri)
      // 💡 PERBAIKAN: Tarik kolom employeeCode dari database
      const { data: siteUsers } = await supabase
        .from("users")
        .select("id, name, employeeCode")
        .eq("siteId", myProfile.siteId)
        .neq("id", authData.user.id);

      if (!siteUsers || siteUsers.length === 0) {
        setMembersOnDuty([]);
        return;
      }

      const userIds = siteUsers.map((u) => u.id);

      // 4. Cek Siapa Aja Yang Sudah Absen Masuk Hari Ini
      const { data: attendancesToday } = await supabase
        .from("attendances")
        .select("userId")
        .eq("date", todayDateOnly)
        .in("userId", userIds);

      const presentUserIds = [
        ...new Set(attendancesToday?.map((a) => a.userId) || []),
      ];

      if (presentUserIds.length === 0) {
        setMembersOnDuty([]);
        return;
      }

      // 5. Tarik Data Laporan Patroli khusus HARI INI
      const { data: patrolsToday } = await supabase
        .from("patrols")
        .select("userId, patrolLocationId")
        .eq("date", todayDateOnly)
        .in("userId", presentUserIds);

      // 6. Mapping Data buat UI
      const processedData = siteUsers
        .filter((user) => presentUserIds.includes(user.id))
        .map((user) => {
          // Ambil semua laporan milik user ini
          const userReports =
            patrolsToday?.filter((p: any) => p.userId === user.id) || [];

          // Hitung TITIK UNIK yang sudah dilaporkan pakai Set
          const uniqueLocationsReported = new Set(
            userReports.map((p) => p.patrolLocationId),
          ).size;

          return {
            id: user.id,
            name: user.name,
            employeeCode: user.employeeCode || "-", // 💡 Simpan employeeCode ke state
            reported: uniqueLocationsReported,
            remaining: Math.max(0, totalPoints - uniqueLocationsReported),
          };
        });

      setMembersOnDuty(processedData);
    } catch (error) {
      console.error("Error tarik data laporan patroli anggota:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchMemberReports();
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-slate-50 pt-12 px-5"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Header Halaman */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">
          Laporan Anggota
        </Text>
      </View>

      {/* Card Ringkasan Info */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
        <Text className="text-slate-800 text-base font-bold mb-1">
          Status Personil Hari Ini
        </Text>
        <Text className="text-slate-500 text-sm">
          {membersOnDuty.length} Personil Hadir • Total {totalLocations} Titik
          Pengecekan
        </Text>
      </View>

      <Text className="text-slate-800 text-base font-bold mb-4 ml-1">
        Daftar Personil Standby
      </Text>

      {/* Loading State & Looping List Anggota */}
      {isFetching ? (
        <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
      ) : membersOnDuty.length === 0 ? (
        <View className="bg-white rounded-2xl p-8 items-center justify-center shadow-sm border border-slate-100">
          <Text className="text-slate-400 text-sm text-center">
            Belum ada personil yang melakukan Absen Masuk hari ini.
          </Text>
        </View>
      ) : (
        membersOnDuty.map((member) => {
          const isAllDone = member.remaining === 0;

          return (
            <TouchableOpacity
              key={member.id}
              activeOpacity={0.6}
              onPress={() =>
                router.push({
                  pathname: `/patrol/member/${member.id}` as any,
                  params: {
                    name: member.name,
                    employeeCode: member.employeeCode, // 💡 Passing ke halaman detail (jika butuh)
                    reported: member.reported,
                    remaining: member.remaining,
                  },
                })
              }
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4"
            >
              {/* Baris Atas: Nama & Employee Code */}
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <View className="flex-row items-center">
                  <View className="w-11 h-11 bg-slate-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person-outline" size={20} color="#64748b" />
                  </View>
                  <View>
                    <Text className="text-base font-bold text-slate-800">
                      {member.name}
                    </Text>
                    {/* 💡 PERBAIKAN: Tampilkan Employee Code di UI */}
                    <Text className="text-slate-400 text-xs mt-0.5 uppercase tracking-wider">
                      {member.employeeCode}
                    </Text>
                  </View>
                </View>

                {/* Badge Status Kerja & Icon Chevron */}
                <View className="flex-row items-center">
                  <View
                    className={`px-2.5 py-1 rounded-full mr-2 ${isAllDone ? "bg-green-50" : "bg-blue-50"}`}
                  >
                    <Text
                      className={`text-xs font-bold ${isAllDone ? "text-green-600" : "text-blue-600"}`}
                    >
                      {isAllDone ? "Patroli Selesai" : "On Duty"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </View>
              </View>

              {/* Baris Bawah: Statistik Titik */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  <Text className="text-slate-600 text-sm">
                    <Text className="font-bold text-slate-800">
                      {member.reported}
                    </Text>{" "}
                    Titik Dilaporkan
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className={`w-2 h-2 rounded-full mr-2 ${member.remaining > 0 ? "bg-orange-500" : "bg-slate-300"}`}
                  />
                  <Text className="text-slate-600 text-sm">
                    Sisa{" "}
                    <Text className="font-bold text-slate-800">
                      {member.remaining}
                    </Text>{" "}
                    Titik
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}
