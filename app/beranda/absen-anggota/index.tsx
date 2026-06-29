import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { supabase } from "../../../lib/supabase"; // Sesuaikan path Supabase lu

export default function AbsenAnggotaScreen() {
  const router = useRouter();

  // States
  const [daftarAnggota, setDaftarAnggota] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // States Modal
  const [selectedAnggota, setSelectedAnggota] = useState<any>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSelfieModal, setShowSelfieModal] = useState(false);

  // Fungsi Pembantu: Format Jam (HH:mm)
  const formatTime = (dateString: string) => {
    if (!dateString) return "--:--";
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const fetchDataAbsen = async () => {
    setIsFetching(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sesi tidak ditemukan");

      // 1. Ambil Profil Danru buat dapet siteId
      const { data: myProfile } = await supabase
        .from("users")
        .select("siteId")
        .eq("id", authData.user.id)
        .single();

      if (!myProfile?.siteId) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Mulai dari jam 00:00 hari ini

      // 2. Tarik Data Utama: Semua User di Site ini beserta Patern Jadwalnya
      // Note: Pastikan relasi tabel lu di Supabase udah ke-set up buat query join ini
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          id,
          name,
          employee_pattern_assignments (
            patternId,
            startDate,
            schedule_patterns ( id, name ) 
          )
        `)
        .eq("siteId", myProfile.siteId)
        .neq("id", authData.user.id); // Kecualikan diri sendiri

      if (usersError) throw usersError;

      // 3. Tarik Data Shift Master
      const { data: shiftsData } = await supabase.from("shifts").select("*");

      // 4. Tarik Data Absensi Hari Ini
      const { data: attendancesData } = await supabase
        .from("attendances")
        .select("userId, actualCheckIn, actualCheckOut, selfieCheckIn")
        .gte("actualCheckIn", today.toISOString());

      // 5. Tarik Data Cuti/Sakit & BKO Hari Ini
      const { data: leavesData } = await supabase
        .from("leaves")
        .select("userId, leaveType, id")
        .lte("startDate", today.toISOString())
        .gte("endDate", today.toISOString());

      const { data: bkoData } = await supabase
        .from("bko_assignments")
        .select("leaveId")
        .eq("status", "Aktif");

      const lakuBKO = bkoData?.map(b => b.leaveId) || [];

      // --- LOGIC PERHITUNGAN & PENGGABUNGAN DATA ---
      const currentTime = new Date();
      let processedData: any[] = [];

      usersData?.forEach((user: any) => {
        // Ambil assignment yang aktif
        const assignment = user.employee_pattern_assignments?.[0]; 
        if (!assignment) return; // Lewati kalau gak punya jadwal

        // KARENA POLA SHIFT (2 Hari Shift 1, 2 Hari Shift 2, dll), 
        // kita cari shift hari ini pakai selisih hari dari startDate
        const startDate = new Date(assignment.startDate);
        const diffTime = Math.abs(today.getTime() - startDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // --- CONTOH LOGIC MODULO PATTERN (Sesuaikan sama urutan pattern DB lu ya Can) ---
        // Misal pattern berulang per 8 hari (2 Pagi, 2 Sore, 2 Malam, 2 Off)
        const cycleDay = diffDays % 8; 
        let shiftHariIni: any = null;

        if (cycleDay === 0 || cycleDay === 1) {
          shiftHariIni = shiftsData?.find(s => s.name.toLowerCase().includes("pagi"));
        } else if (cycleDay === 2 || cycleDay === 3) {
          shiftHariIni = shiftsData?.find(s => s.name.toLowerCase().includes("sore"));
        } else if (cycleDay === 4 || cycleDay === 5) {
          shiftHariIni = shiftsData?.find(s => s.name.toLowerCase().includes("malam"));
        } else {
          return; // Day Off, tidak perlu dimasukkan ke list
        }

        if (!shiftHariIni) return;

        // --- FILTER SHIFT JARAK 2 JAM & LEWAT ---
        // Pecah jam mulai shift (misal "08:00:00")
        const [shiftStartHour, shiftStartMinute] = shiftHariIni.startTime.split(":");
        const shiftStartDate = new Date(today);
        shiftStartDate.setHours(parseInt(shiftStartHour), parseInt(shiftStartMinute), 0, 0);

        const [shiftEndHour, shiftEndMinute] = shiftHariIni.endTime.split(":");
        const shiftEndDate = new Date(today);
        shiftEndDate.setHours(parseInt(shiftEndHour), parseInt(shiftEndMinute), 0, 0);
        
        // Kalau shift malam tembus besok hari
        if (shiftEndDate < shiftStartDate) shiftEndDate.setDate(shiftEndDate.getDate() + 1);

        // Filter: Cuma tampilin kalau (Sekarang >= 2 Jam sebelum mulai) DAN (Sekarang < Jam Selesai Shift)
        const twoHoursBeforeStart = new Date(shiftStartDate.getTime() - 2 * 60 * 60 * 1000);
        if (currentTime < twoHoursBeforeStart || currentTime > shiftEndDate) {
            return; // Skip! Belum masuk radar 2 jam atau shift udah kelar
        }

        // --- TENTUKAN STATUS ---
        let status = "Belum Absen";
        let jamAbsen = "--:--";
        let selfieUrl = null;

        // Cek Sakit/Izin/BKO dulu
        const leaveMatch = leavesData?.find(l => l.userId === user.id);
        if (leaveMatch) {
            if (lakuBKO.includes(leaveMatch.id)) {
                status = "BKO";
            } else {
                status = leaveMatch.leaveType; // Sakit atau Izin
            }
        } else {
            // Cek Kehadiran Aktual
            const absenMatch = attendancesData?.find(a => a.userId === user.id);
            if (absenMatch && absenMatch.actualCheckIn) {
                const checkInTime = new Date(absenMatch.actualCheckIn);
                jamAbsen = formatTime(absenMatch.actualCheckIn);
                selfieUrl = absenMatch.selfieCheckIn;

                // Hitung selisih telat
                if (checkInTime > shiftStartDate) {
                    status = "Terlambat";
                } else {
                    status = "Hadir";
                }
            }
        }

        processedData.push({
          id: user.id,
          nama: user.name,
          shift: `${shiftHariIni.name} (${shiftHariIni.startTime.substring(0,5)} - ${shiftHariIni.endTime.substring(0,5)})`,
          status: status,
          jamAbsen: jamAbsen,
          selfieUrl: selfieUrl
        });
      });

      setDaftarAnggota(processedData);
    } catch (error) {
      console.error("Error tarik data absen anggota:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchDataAbsen();
  }, []);

  const handlePilihAnggota = (anggota: any) => {
    setSelectedAnggota(anggota);
    if (anggota.status === "Belum Absen" || anggota.status === "Sakit" || anggota.status === "Izin" || anggota.status === "BKO") {
      setShowWarningModal(true);
    } else {
      setShowSelfieModal(true);
    }
  };

  // Helper Warna Badge Berdasarkan Status
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Hadir":
        return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", initialBg: "bg-emerald-100" };
      case "Terlambat":
        return { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", initialBg: "bg-orange-100" };
      case "Sakit":
        return { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", initialBg: "bg-rose-100" };
      case "Izin":
        return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", initialBg: "bg-amber-100" };
      case "BKO":
        return { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", initialBg: "bg-purple-100" };
      default: // Belum Absen
        return { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", initialBg: "bg-blue-50" };
    }
  };

  return (
    <View className="flex-1 bg-sky-50">
      {/* --- HEADER --- */}
      <View className="pt-16 pb-4 px-6 bg-white flex-row items-center border-b border-sky-100 shadow-sm z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-sky-50 rounded-full items-center justify-center mr-4 active:bg-sky-100"
        >
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-gray-900">Absen Anggota</Text>
          <Text className="text-gray-500 text-xs mt-0.5">Pantau kehadiran harian</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* INFO BANNER KOMANDAN */}
        <View className="bg-violet-600 rounded-2xl p-4 flex-row items-center mb-6 shadow-sm">
          <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
            <Ionicons name="eye" size={24} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold mb-0.5">Monitoring Harian</Text>
            <Text className="text-violet-100 text-xs leading-relaxed">
              Menampilkan seluruh jadwal anggota hari ini. Anda dapat mencatat kehadiran jika ada kendala sistem di lapangan.
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-gray-800 font-bold text-lg">Jadwal Shift Terdekat</Text>
            <Text className="text-blue-600 text-xs font-bold mt-0.5">
              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <Text className="text-gray-500 text-xs font-medium">
            {daftarAnggota.length} Personel
          </Text>
        </View>

        {/* LOADING STATE */}
        {isFetching ? (
          <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
        ) : daftarAnggota.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-gray-400">Belum ada personel masuk radar shift.</Text>
          </View>
        ) : (
          /* LIST ANGGOTA */
          daftarAnggota.map((item) => {
            const styles = getStatusStyles(item.status);

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handlePilihAnggota(item)}
                activeOpacity={0.7}
                className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 flex-row items-center"
              >
                {/* Avatar Initial */}
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${styles.initialBg}`}>
                  <Text className={`font-bold text-lg ${styles.text}`}>
                    {item.nama.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Info Anggota */}
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-base mb-1">
                    {item.nama}
                  </Text>

                  {/* Shift Saja (Posisi Dihapus) */}
                  <View className="flex-row items-center mb-2 flex-wrap">
                    <Text className="text-blue-500 text-[10px] font-bold bg-blue-50 px-2 py-1 rounded">
                      {item.shift}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <View className={`px-2 py-1 rounded-md flex-row items-center ${styles.bg}`}>
                      <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${styles.dot}`} />
                      <Text className={`text-[10px] font-bold uppercase ${styles.text}`}>
                        {item.status}
                      </Text>
                    </View>
                    {(item.status === "Hadir" || item.status === "Terlambat") && item.jamAbsen !== "--:--" && (
                      <Text className="text-gray-400 text-xs ml-2 flex-row items-center font-medium">
                        • Jam {item.jamAbsen}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Tombol Aksi Kanan */}
                {(item.status === "Hadir" || item.status === "Terlambat") && item.selfieUrl ? (
                  <View className="bg-emerald-50 w-10 h-10 rounded-full items-center justify-center">
                    <Ionicons name="image-outline" size={20} color="#10b981" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* --- MODAL 1: WARNING BELUM ABSEN / TIDAK ADA SELFIE --- */}
      <Modal visible={showWarningModal} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-5">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="information-circle" size={40} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-2">Belum Ada Selfie</Text>
            <Text className="text-slate-500 text-center mb-6">
              Personel <Text className="font-bold text-slate-700">{selectedAnggota?.nama}</Text> belum melakukan Attendances Selfie atau sedang berhalangan ({selectedAnggota?.status}).
            </Text>
            <TouchableOpacity 
              onPress={() => setShowWarningModal(false)}
              className="w-full bg-slate-900 py-4 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-base">Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL 2: LIHAT FOTO SELFIE --- */}
      <Modal visible={showSelfieModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl overflow-hidden pb-8">
            <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
              <View>
                <Text className="text-lg font-bold text-gray-900">Foto Kehadiran</Text>
                <Text className="text-gray-500 text-sm">
                  {selectedAnggota?.nama} • {selectedAnggota?.jamAbsen}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSelfieModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View className="p-5 items-center">
              {selectedAnggota?.selfieUrl ? (
                <Image 
                  source={{ uri: selectedAnggota.selfieUrl }} 
                  className="w-full h-80 rounded-2xl bg-gray-100"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-80 rounded-2xl bg-gray-100 items-center justify-center border border-gray-200 border-dashed">
                  <Ionicons name="image-outline" size={48} color="#cbd5e1" mb-2 />
                  <Text className="text-gray-400 font-medium">Gambar tidak ditemukan di database</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}