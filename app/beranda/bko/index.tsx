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

// Helper: Format tanggal cantik & rapi
const formatRentangTanggal = (start: string, end: string) => {
  const d1 = new Date(start);
  const d2 = new Date(end);
  const bulanIndo = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  if (d1.getTime() === d2.getTime()) {
    return `${d1.getDate()} ${bulanIndo[d1.getMonth()]} ${d1.getFullYear()}`;
  }
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

      const { data: myProfile } = await supabase
        .from("users")
        .select("siteId")
        .eq("id", authData.user.id)
        .single();

      const { data: temanSite, error: temanError } = await supabase
        .from("users")
        .select("id, name")
        .eq("siteId", myProfile?.siteId)
        .neq("id", authData.user.id);

      if (temanError) throw temanError;

      const listIdTeman = temanSite ? temanSite.map((t) => t.id) : [];

      if (listIdTeman.length === 0) {
        setDaftarBerhalangan([]);
        setIsFetching(false);
        return;
      }

      const mapNamaTeman: Record<string, string> = {};
      temanSite?.forEach((t) => {
        mapNamaTeman[t.id] = t.name;
      });

      const hariIni = new Date();
      hariIni.setHours(0, 0, 0, 0);
      const todayISOString = hariIni.toISOString();

      const { data: leavesData, error: leavesError } = await supabase
        .from("leaves")
        .select("*")
        .in("userId", listIdTeman)
        .in("leaveType", ["Sakit", "Izin", "Cuti"])
        .in("status", ["Pending", "Approved"])
        .gte("endDate", todayISOString);

      if (leavesError) throw leavesError;

      const { data: bkoData } = await supabase
        .from("bko_assignments")
        .select("leaveId")
        .eq("status", "Aktif");

      const daftarIdSudahDiambil = bkoData ? bkoData.map((b) => b.leaveId) : [];

      if (leavesData) {
        const formattedData = leavesData
          .filter((item: any) => !daftarIdSudahDiambil.includes(item.id))
          .map((item: any) => ({
            id: item.id,
            nama: mapNamaTeman[item.userId] || "Karyawan",
            tipe: item.leaveType,
            alasan: item.reason || "Tanpa keterangan",
            tanggal: formatRentangTanggal(item.startDate, item.endDate),
            durasi: getBedaHari(item.startDate, item.endDate),
            status: item.status,
          }));

        setDaftarBerhalangan(formattedData);
      }
    } catch (err) {
      console.error("Error BKO:", err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchBKOData();
  }, []);

  const handleAmbilBKO = async () => {
    if (!selectedBKO) return;

    console.log(">> 🚀 Tombol dipencet! Mulai eksekusi...");
    setIsLoading(true);

    try {
      console.log(">> 1. Cek User ID...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi tidak ditemukan");
      console.log(">> ✅ User ID aman:", user.id);

      const payload = {
        leaveId: selectedBKO,
        substituteId: user.id,
        status: "Aktif",
        updatedAt: new Date().toISOString(), // 💡 Wajib diisi biar database gak nolak
      };
      console.log(">> 2. Payload siap:", payload);

      const { data, error } = await supabase
        .from("bko_assignments")
        .insert(payload)
        .select();

      if (error) {
        console.error(">> ❌ Error dari Supabase:", error);
        throw error;
      }

      console.log(">> 3. ✅ Sukses insert BKO ke database!");

      await fetchBKOData();
      setSelectedBKO(null);

      setIsLoading(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error(">> 🔴 MASUK CATCH ERROR:", error);
      setIsLoading(false);

      // Pastikan error message diubah jadi murni teks
      const pesanError = error?.message
        ? String(error.message)
        : "Terjadi kesalahan pada sistem database";

      // 💡 PENGAMANAN UI: Deteksi error karena rebutan BKO (Unique Violation)
      if (error?.code === "23505" || pesanError.includes("duplicate key")) {
        Alert.alert(
          "Yah, Keduluan! 🏃💨",
          "Jadwal BKO ini baru aja diambil sama personel lain beberapa detik yang lalu. Silakan pilih jadwal yang lain ya.",
        );
        fetchBKOData();
      } else {
        Alert.alert("Gagal Menyimpan", pesanError);
      }
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="pt-16 pb-4 px-6 bg-white border-b border-slate-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
          <View className="ml-4">
            <Text className="text-xl font-bold text-slate-900">
              Ambil Backup
            </Text>
            <Text className="text-slate-500 text-sm">
              Pilih personel yang digantikan
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Banner Info */}
        <View className="bg-blue-600 rounded-2xl p-4 flex-row items-center mb-6 shadow-sm">
          <Ionicons
            name="information-circle"
            size={24}
            color="white"
            className="mr-3"
          />
          <Text className="text-white text-xs flex-1 leading-relaxed">
            Jadwal absen akan otomatis disesuaikan dengan personel yang kamu
            gantikan.
          </Text>
        </View>

        <Text className="font-bold text-slate-800 text-lg mb-4">
          Daftar Personel Berhalangan
        </Text>

        {isFetching ? (
          <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
        ) : daftarBerhalangan.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-slate-100 shadow-sm mt-2">
            <Ionicons
              name="shield-checkmark-outline"
              size={48}
              color="#cbd5e1"
              className="mb-4"
            />
            <Text className="text-slate-800 font-bold text-base mb-1">
              Semua Aman Terkendali
            </Text>
            <Text className="text-slate-400 text-center text-sm">
              Belum ada personel di area ini yang sedang sakit, cuti, atau
              membutuhkan backup.
            </Text>
          </View>
        ) : (
          daftarBerhalangan.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedBKO(item.id)}
              className={`bg-white rounded-2xl p-4 mb-4 border-2 ${selectedBKO === item.id ? "border-blue-500 shadow-md shadow-blue-100" : "border-slate-100 shadow-sm"}`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center mb-4">
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${item.tipe === "Sakit" ? "bg-rose-50" : "bg-amber-50"}`}
                >
                  <Ionicons
                    name={item.tipe === "Sakit" ? "medkit" : "document-text"}
                    size={22}
                    color={item.tipe === "Sakit" ? "#e11d48" : "#d97706"}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-0.5">
                    <Text className="font-bold text-slate-900 text-base mr-2">
                      {item.nama}
                    </Text>
                    {/* Badge Status Approval */}
                    <View
                      className={`px-2 py-0.5 rounded-full ${item.status === "Approved" ? "bg-emerald-100" : "bg-slate-100"}`}
                    >
                      <Text
                        className={`text-[9px] font-bold uppercase ${item.status === "Approved" ? "text-emerald-700" : "text-slate-500"}`}
                      >
                        {item.status === "Approved" ? "Disetujui" : "Pending"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-slate-500 text-xs font-medium">
                    Tipe: {item.tipe}
                  </Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedBKO === item.id ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}
                >
                  {selectedBKO === item.id && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
              </View>

              {/* Info Container yang Rapi & Profesional */}
              <View className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="calendar-outline" size={15} color="#64748b" />
                  <Text className="ml-2 text-slate-600 text-xs font-medium">
                    <Text className="font-semibold text-slate-700">
                      Periode:
                    </Text>{" "}
                    {item.tanggal}{" "}
                    <Text className="text-blue-500 font-semibold">
                      ({item.durasi})
                    </Text>
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={15}
                    color="#64748b"
                    className="mt-0.5"
                  />
                  <Text
                    className="ml-2 text-slate-600 text-xs flex-1 leading-relaxed"
                    numberOfLines={2}
                  >
                    <Text className="font-semibold text-slate-700">
                      Alasan:
                    </Text>{" "}
                    {item.alasan}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Footer Button */}
      <View className="absolute bottom-0 w-full px-5 py-4 bg-white border-t border-slate-100 pb-8">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (!selectedBKO) {
              Alert.alert(
                "Belum Memilih",
                "Tolong pilih personel yang mau digantikan dulu ya!",
              );
            } else {
              handleAmbilBKO();
            }
          }}
          className={`py-4 rounded-xl items-center flex-row justify-center shadow-sm ${!selectedBKO ? "bg-slate-200" : "bg-blue-600 active:bg-blue-700"}`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              {selectedBKO && (
                <Ionicons name="shield-checkmark" size={20} color="white" />
              )}
              <Text
                className={`font-bold ml-2 ${!selectedBKO ? "text-slate-400" : "text-white"}`}
              >
                {selectedBKO ? "Konfirmasi Ambil BKO" : "Pilih Personel Dahulu"}
              </Text>
            </>
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
            <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={40} color="#10b981" />
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-2">
              BKO Berhasil Diambil!
            </Text>
            <Text className="text-slate-500 text-center mb-6 text-sm leading-relaxed">
              Jadwal personel ini sekarang telah masuk ke dalam tugas BKO kamu.
              Selamat bertugas!
            </Text>
            <TouchableOpacity
              onPress={() => setShowSuccessModal(false)}
              className="w-full bg-blue-600 active:bg-blue-700 py-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-sm">Oke Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
