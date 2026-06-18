import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AmbilBKOScreen() {
  const router = useRouter();

  // State
  const [selectedBKO, setSelectedBKO] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Simulasi Data Personel yang Sakit/Izin (Udah Ditambahin Rentang Tanggal & Durasi)
  const daftarBerhalangan = [
    {
      id: "BKO-001",
      nama: "Budi Santoso",
      alasan: "Sakit (Demam)",
      posisi: "Pos Gerbang Utama",
      shift: "Shift Pagi",
      jamKerja: "08:00 - 17:00",
      tanggal: "18 - 19 Juni 2026", // <-- Bisa rentang beberapa hari
      durasi: "2 Hari", // <-- Keterangan durasi
    },
    {
      id: "BKO-002",
      nama: "Ahmad Riyadi",
      alasan: "Izin Keluarga",
      posisi: "Patroli Area Barat",
      shift: "Shift Malam",
      jamKerja: "20:00 - 05:00",
      tanggal: "19 Juni 2026", // <-- Bisa cuma 1 hari (misal besok)
      durasi: "1 Hari",
    },
    {
      id: "BKO-003",
      nama: "Joko Anwar",
      alasan: "Sakit (Tipus)",
      posisi: "Pos Belakang",
      shift: "Shift Pagi",
      jamKerja: "08:00 - 17:00",
      tanggal: "18 - 20 Juni 2026",
      durasi: "3 Hari",
    },
  ];

  const handleAmbilBKO = () => {
    if (!selectedBKO) return;

    setIsLoading(true);

    // Simulasi proses kirim data ke server
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessModal(true);
    }, 1500);
  };

  const selectedData = daftarBerhalangan.find(
    (item) => item.id === selectedBKO,
  );

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
          <Text className="text-xl font-bold text-gray-900">Ambil BKO</Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            Pilih personel yang digantikan
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* INFO BANNER */}
        <View className="bg-blue-600 rounded-2xl p-4 flex-row items-center mb-6 shadow-sm">
          <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
            <Ionicons name="information-circle" size={24} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold mb-0.5">Info Sistem BKO</Text>
            <Text className="text-blue-100 text-xs">
              Jadwal absen dan lokasi penugasan kamu akan disesuaikan dengan
              personel yang kamu gantikan selama periode BKO berlangsung.
            </Text>
          </View>
        </View>

        <Text className="text-gray-800 font-bold text-lg mb-4">
          Daftar Pengajuan (Site Ini)
        </Text>

        {/* LIST PERSONEL BERHALANGAN */}
        {daftarBerhalangan.map((item) => {
          const isSelected = selectedBKO === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedBKO(item.id)}
              activeOpacity={0.8}
              className={`bg-white rounded-2xl p-5 mb-4 shadow-sm border-2 transition-colors ${
                isSelected
                  ? "border-blue-500 bg-blue-50/30"
                  : "border-transparent"
              }`}
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                      item.alasan.includes("Sakit")
                        ? "bg-rose-50"
                        : "bg-amber-50"
                    }`}
                  >
                    <Ionicons
                      name={
                        item.alasan.includes("Sakit") ? "medkit" : "calendar"
                      }
                      size={20}
                      color={
                        item.alasan.includes("Sakit") ? "#f43f5e" : "#f59e0b"
                      }
                    />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-bold text-base">
                      {item.nama}
                    </Text>
                    <Text className="text-gray-500 text-xs">{item.alasan}</Text>
                  </View>
                </View>

                {/* Indikator Checkmark kalau dipilih */}
                <View
                  className={`w-6 h-6 rounded-full border items-center justify-center ${
                    isSelected
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </View>

              <View className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                  <Text className="text-gray-600 text-xs ml-1 font-medium">
                    Periode:{" "}
                    <Text className="font-bold text-gray-800">
                      {item.tanggal} ({item.durasi})
                    </Text>
                  </Text>
                </View>
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="pin-outline" size={14} color="#6b7280" />
                  <Text className="text-gray-600 text-xs ml-1 font-medium">
                    Pos:{" "}
                    <Text className="font-bold text-gray-800">
                      {item.posisi}
                    </Text>
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={14} color="#6b7280" />
                  <Text className="text-gray-600 text-xs ml-1 font-medium">
                    Shift:{" "}
                    <Text className="font-bold text-gray-800">
                      {item.shift} ({item.jamKerja})
                    </Text>
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* --- TOMBOL SUBMIT DI BAWAH --- */}
      <View className="absolute bottom-0 w-full p-5 bg-white border-t border-gray-100 shadow-[0_-10px_15px_rgba(0,0,0,0.05)]">
        <TouchableOpacity
          onPress={handleAmbilBKO}
          disabled={!selectedBKO || isLoading}
          className={`w-full py-4 rounded-2xl items-center justify-center flex-row shadow-sm ${
            !selectedBKO ? "bg-gray-300" : "bg-blue-600 active:bg-blue-700"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="briefcase" size={20} color="white" />
              <Text className="text-white font-bold text-base ml-2">
                {selectedBKO ? "Konfirmasi Ambil BKO" : "Pilih Personel Dulu"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* --- MODAL POP-UP SUKSES --- */}
      <Modal visible={showSuccessModal} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-2xl">
            <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-done" size={32} color="#10b981" />
            </View>

            <Text className="text-xl font-extrabold text-gray-900 mb-2 text-center">
              Tugas BKO Diterima
            </Text>

            <Text className="text-gray-500 text-sm text-center mb-6 leading-relaxed">
              Kamu mengambil alih tugas{" "}
              <Text className="font-bold text-gray-800">
                {selectedData?.nama}
              </Text>{" "}
              selama{" "}
              <Text className="font-bold text-blue-600">
                {selectedData?.durasi}
              </Text>{" "}
              (
              <Text className="font-medium text-gray-700">
                {selectedData?.tanggal}
              </Text>
              ). Jadwal absen otomatis disesuaikan.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
              className="w-full bg-gray-900 py-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Kembali ke Beranda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
