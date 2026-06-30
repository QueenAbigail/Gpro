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
import { supabase } from "../../lib/supabase"; // Path disesuaikan dengan posisi file ini

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

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Mulai dari jam 00:00 hari ini

      // 2. Tarik Total Titik Pengecekan Patroli berdasarkan Site saat ini
      const { data: locationsData } = await supabase
        .from("patrol_locations")
        .select("id")
        .eq("siteId", myProfile.siteId);

      const totalPoints = locationsData?.length || 0;
      setTotalLocations(totalPoints);

      // 3. Tarik Data Utama: Semua User di Site ini beserta Pattern Jadwalnya (Nyontek Absen)
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(
          `
          id,
          name,
          role,
          employee_pattern_assignments (
            patternId,
            startDate,
            schedule_patterns ( id, name ) 
          )
        `,
        )
        .eq("siteId", myProfile.siteId)
        .neq("id", authData.user.id); // Kecualikan diri sendiri

      if (usersError) throw usersError;

      // 4. Tarik Data Shift Master
      const { data: shiftsData } = await supabase.from("shifts").select("*");

      // 5. Tarik Data Laporan Patroli khusus HARI INI
      const { data: patrolsData } = await supabase
        .from("patrols")
        .select("userId, locationId")
        .gte("createdAt", today.toISOString());

      // --- LOGIC PERHITUNGAN & SINKRONISASI SHIFT (Sama persis dengan Absen) ---
      const currentTime = new Date();
      let processedData: any[] = [];

      usersData?.forEach((user: any) => {
        const assignment = user.employee_pattern_assignments?.[0];
        if (!assignment) return; // Lewati jika tidak punya jadwal

        const startDate = new Date(assignment.startDate);
        const diffTime = Math.abs(today.getTime() - startDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Modulo Pattern Siklus 8 Hari
        const cycleDay = diffDays % 8;
        let shiftHariIni: any = null;

        if (cycleDay === 0 || cycleDay === 1) {
          shiftHariIni = shiftsData?.find((s) =>
            s.name.toLowerCase().includes("pagi"),
          );
        } else if (cycleDay === 2 || cycleDay === 3) {
          shiftHariIni = shiftsData?.find((s) =>
            s.name.toLowerCase().includes("sore"),
          );
        } else if (cycleDay === 4 || cycleDay === 5) {
          shiftHariIni = shiftsData?.find((s) =>
            s.name.toLowerCase().includes("malam"),
          );
        } else {
          return; // Day Off, skip dari daftar patroli
        }

        if (!shiftHariIni) return;

        // FILTER JENDELA SHIFT 2 JAM (Sama persis dengan Absen)
        const [shiftStartHour, shiftStartMinute] =
          shiftHariIni.startTime.split(":");
        const shiftStartDate = new Date(today);
        shiftStartDate.setHours(
          parseInt(shiftStartHour),
          parseInt(shiftStartMinute),
          0,
          0,
        );

        const [shiftEndHour, shiftEndMinute] = shiftHariIni.endTime.split(":");
        const shiftEndDate = new Date(today);
        shiftEndDate.setHours(
          parseInt(shiftEndHour),
          parseInt(shiftEndMinute),
          0,
          0,
        );

        if (shiftEndDate < shiftStartDate)
          shiftEndDate.setDate(shiftEndDate.getDate() + 1);

        const twoHoursBeforeStart = new Date(
          shiftStartDate.getTime() - 2 * 60 * 60 * 1000,
        );
        if (currentTime < twoHoursBeforeStart || currentTime > shiftEndDate) {
          return; // Lewati jika di luar radar shift aktif
        }

        // Hitung real-time jumlah titik yang sudah dilaporkan oleh user ini hari ini
        const reportedCount =
          patrolsData?.filter((p: any) => p.userId === user.id).length || 0;

        // Gabungkan data sesuai dengan kebutuhan komponen UI lu Can
        processedData.push({
          id: user.id,
          name: user.name,
          role: `${user.role || "Anggota"} - ${shiftHariIni.name}`,
          reported: reportedCount,
          remaining: Math.max(0, totalPoints - reportedCount),
        });
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
          Status Shift Pagi
        </Text>
        <Text className="text-slate-500 text-sm">
          {membersOnDuty.length} Personil Standby • Total {totalLocations} Titik
          Pengecekan
        </Text>
      </View>

      <Text className="text-slate-800 text-base font-bold mb-4 ml-1">
        Daftar Personil
      </Text>

      {/* Loading State & Looping List Anggota */}
      {isFetching ? (
        <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
      ) : membersOnDuty.length === 0 ? (
        <View className="bg-white rounded-2xl p-8 items-center justify-center shadow-sm border border-slate-100">
          <Text className="text-slate-400 text-sm text-center">
            Belum ada personel masuk radar shift patroli saat ini.
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
                    role: member.role,
                    reported: member.reported,
                    remaining: member.remaining,
                  },
                })
              }
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4"
            >
              {/* Baris Atas: Nama & Role */}
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <View className="flex-row items-center">
                  <View className="w-11 h-11 bg-slate-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person-outline" size={20} color="#64748b" />
                  </View>
                  <View>
                    <Text className="text-base font-bold text-slate-800">
                      {member.name}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                      {member.role}
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
