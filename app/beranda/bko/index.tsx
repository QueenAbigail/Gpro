import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

// Helper: Hitung selisih hari
const getBedaHari = (start: string, end: string) => {
  const date1 = new Date(start);
  const date2 = new Date(end);
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return `${diffDays} Hari`;
};

// Helper: Format tanggal cantik
const formatRentangTanggal = (start: string, end: string) => {
  const d1 = new Date(start);
  const d2 = new Date(end);
  const bulanIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${d1.getDate()} ${bulanIndo[d1.getMonth()]} - ${d2.getDate()} ${bulanIndo[d2.getMonth()]} ${d2.getFullYear()}`;
};

export default function AmbilBKOScreen() {
  const router = useRouter();
  const [selectedBKO, setSelectedBKO] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [daftarBerhalangan, setDaftarBerhalangan] = useState<any[]>([]);

  const fetchBKOData = async () => {
    setIsFetching(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sesi tidak ditemukan");

      const { data: myProfile } = await supabase.from("users").select("siteId").eq("id", authData.user.id).single();
      
      // LANGKAH 1: Tarik semua data izin/cuti di site ini (Nggak usah join-joinan bko_assignments lagi)
      const { data: leavesData, error: leavesError } = await supabase
        .from("leaves")
        .select(`
          id,
          leaveType,
          startDate,
          endDate,
          reason,
          users!inner (id, name, siteId)
        `)
        .eq("users.siteId", myProfile?.siteId)
        .neq("users.id", authData.user.id);

      if (leavesError) throw leavesError;

      // LANGKAH 2: Tarik daftar ID cuti yang SUDAH DIAMBIL orang dari tabel bko_assignments
      const { data: bkoData } = await supabase
        .from("bko_assignments")
        .select("leaveId")
        .eq("status", "Aktif"); // Cek yang statusnya Aktif

      // Kita bikin list (array) khusus yang isinya cuma ID cuti yang udah laku
      const daftarIdSudahDiambil = bkoData ? bkoData.map((b) => b.leaveId) : [];

      if (leavesData) {
        // LANGKAH 3: Filter Manual! Coret cuti yang ID-nya ada di daftarIdSudahDiambil
        const formattedData = leavesData
          .filter((item: any) => {
            const validUser = item.users !== null;
            const belumLaku = !daftarIdSudahDiambil.includes(item.id); // <-- Ini kuncinya!
            return validUser && belumLaku; 
          })
          .map((item: any) => ({
            id: item.id,
            nama: item.users.name,
            keterangan: `${item.leaveType} (${item.reason})`,
            posisi: "Pos Gerbang Utama",
            shift: "Shift Pagi",
            jam: "08:00 - 17:00",
            tanggal: formatRentangTanggal(item.startDate, item.endDate),
            durasi: getBedaHari(item.startDate, item.endDate),
            tipe: item.leaveType
          }));

        setDaftarBerhalangan(formattedData);
      }
    } catch (err) {
      console.error("Error BKO:", err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchBKOData(); }, []);

  const handleAmbilBKO = async () => {
    if (!selectedBKO) return;
    
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi tidak ditemukan");

      const payload = {
        leaveId: selectedBKO,
        substituteId: user.id,
        status: "Aktif",
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from("bko_assignments")
        .insert(payload);

      if (error) throw error;

      console.log(">> Sukses insert!");

      // --- INI RAHASIANYA ---
      // 1. Ambil data terbaru biar list ke-update (item yang diambil otomatis ilang)
      await fetchBKOData(); 
      // 2. Reset pilihan biar tombol balik ke "Pilih Personel Dulu"
      setSelectedBKO(null); 
      // ----------------------

      setIsLoading(false);
      setShowSuccessModal(true);
      
    } catch (error: any) {
      console.error(">> Error:", error);
      setIsLoading(false);
      Alert.alert("Gagal", error.message || "Terjadi kesalahan sistem");
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="pt-16 pb-4 px-6 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
            <View className="ml-4">
                <Text className="text-xl font-bold text-slate-900">Ambil BKO</Text>
                <Text className="text-slate-500 text-sm">Pilih personel yang digantikan</Text>
            </View>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Banner Info */}
        <View className="bg-blue-600 rounded-2xl p-4 flex-row items-center mb-6">
          <Ionicons name="information-circle" size={24} color="white" className="mr-3" />
          <Text className="text-white text-xs flex-1">Jadwal absen dan lokasi penugasan kamu akan disesuaikan dengan personel yang kamu gantikan.</Text>
        </View>

        <Text className="font-bold text-slate-800 text-lg mb-4">Daftar Pengajuan (Site Ini)</Text>

        {isFetching ? <ActivityIndicator size="large" /> : (
          daftarBerhalangan.map((item) => (
            <TouchableOpacity 
                key={item.id} 
                onPress={() => setSelectedBKO(item.id)}
                className={`bg-white rounded-2xl p-4 mb-4 border-2 ${selectedBKO === item.id ? "border-blue-500" : "border-transparent"}`}
            >
                <View className="flex-row items-center mb-3">
                    <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${item.tipe === "Sakit" ? "bg-rose-100" : "bg-amber-100"}`}>
                        <Ionicons name={item.tipe === "Sakit" ? "medkit" : "calendar"} size={22} color={item.tipe === "Sakit" ? "#e11d48" : "#d97706"} />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-slate-900">{item.nama}</Text>
                        <Text className="text-slate-500 text-sm">{item.keterangan}</Text>
                    </View>
                    <View className={`w-6 h-6 rounded-full border-2 ${selectedBKO === item.id ? "border-blue-500 bg-blue-500" : "border-slate-300"}`} />
                </View>

                {/* Info Container */}
                <View className="bg-slate-50 p-3 rounded-xl">
                    <View className="flex-row items-center mb-1"><Ionicons name="calendar-outline" size={14} color="#64748b" /><Text className="ml-2 text-slate-600 text-xs font-semibold">Periode: {item.tanggal} ({item.durasi})</Text></View>
                    <View className="flex-row items-center mb-1"><Ionicons name="pin-outline" size={14} color="#64748b" /><Text className="ml-2 text-slate-600 text-xs font-semibold">Pos: {item.posisi}</Text></View>
                    <View className="flex-row items-center"><Ionicons name="time-outline" size={14} color="#64748b" /><Text className="ml-2 text-slate-600 text-xs font-semibold">Shift: {item.shift} ({item.jam})</Text></View>
                </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Footer Button */}
      {/* Footer Button - Update bagian ini ya! */}
      <View className="absolute bottom-0 w-full p-5 bg-white border-t border-slate-100">
        <TouchableOpacity 
          onPress={() => {
            if (!selectedBKO) {
              Alert.alert("Belum Memilih", "Tolong pilih personel yang mau digantikan dulu ya!");
            } else {
              handleAmbilBKO();
            }
          }}
          className={`py-4 rounded-xl items-center ${!selectedBKO ? "bg-slate-300" : "bg-slate-900"}`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold">
              {selectedBKO ? "Konfirmasi Ambil BKO" : "Pilih Personel Dulu"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-5">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-2">BKO Berhasil Diambil!</Text>
            <Text className="text-slate-500 text-center mb-6">
              Jadwal personel ini sekarang telah masuk ke dalam tugas BKO kamu. Selamat bertugas!
            </Text>
            <TouchableOpacity 
              onPress={() => setShowSuccessModal(false)}
              className="w-full bg-slate-900 py-4 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-base">Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}