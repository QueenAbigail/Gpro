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

export default function AbsenAnggotaScreen() {
  const router = useRouter();

  // State untuk modal aksi absen
  const [selectedAnggota, setSelectedAnggota] = useState<any>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Simulasi Data Semua Anggota yang Jadwalnya Hari Ini (Beda-beda Shift)
  const [daftarAnggota, setDaftarAnggota] = useState([
    {
      id: "ANG-001",
      nama: "Agus Pratama",
      posisi: "Anggota Patroli",
      shift: "Shift Pagi (08:00 - 20:00)",
      status: "Belum Absen",
      jamAbsen: "--:--",
    },
    {
      id: "ANG-002",
      nama: "Dedi Suherman",
      posisi: "Pos Gerbang Utama",
      shift: "Shift Pagi (08:00 - 20:00)",
      status: "Hadir",
      jamAbsen: "07:40",
    },
    {
      id: "ANG-003",
      nama: "Rizky Fauzi",
      posisi: "Pos Belakang",
      shift: "Shift Malam (20:00 - 08:00)",
      status: "Belum Absen",
      jamAbsen: "--:--",
    },
    {
      id: "ANG-004",
      nama: "Hendro Wibowo",
      posisi: "CCTV Room",
      shift: "Shift Pagi (08:00 - 20:00)",
      status: "Sakit",
      jamAbsen: "--:--",
    },
  ]);

  const handlePilihAnggota = (anggota: any) => {
    if (anggota.status !== "Belum Absen") {
      alert(`Anggota ini sudah tercatat dengan status: ${anggota.status}`);
      return;
    }
    setSelectedAnggota(anggota);
    setShowActionModal(true);
  };

  const handleSubmitAbsen = (statusAbsen: string) => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setShowActionModal(false);

      setDaftarAnggota((prev) =>
        prev.map((item) =>
          item.id === selectedAnggota.id
            ? {
                ...item,
                status: statusAbsen,
                jamAbsen: statusAbsen === "Hadir" ? "08:05" : "--:--",
              }
            : item,
        ),
      );

      alert(
        `Berhasil mencatat status ${statusAbsen} untuk ${selectedAnggota.nama}`,
      );
      setSelectedAnggota(null);
    }, 1500);
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
          <Text className="text-gray-500 text-xs mt-0.5">
            Pantau kehadiran harian
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* INFO BANNER KOMANDAN */}
        <View className="bg-violet-600 rounded-2xl p-4 flex-row items-center mb-6 shadow-sm">
          <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
            <Ionicons name="eye" size={24} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold mb-0.5">
              Monitoring Harian
            </Text>
            <Text className="text-violet-100 text-xs leading-relaxed">
              Menampilkan seluruh jadwal anggota hari ini. Anda dapat mencatat
              kehadiran jika ada kendala sistem di lapangan.
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-gray-800 font-bold text-lg">
              Jadwal Hari Ini
            </Text>
            <Text className="text-blue-600 text-xs font-bold mt-0.5">
              18 Juni 2026
            </Text>
          </View>
          <Text className="text-gray-500 text-xs font-medium">
            {daftarAnggota.length} Personel
          </Text>
        </View>

        {/* LIST ANGGOTA */}
        {daftarAnggota.map((item) => {
          const isBelumAbsen = item.status === "Belum Absen";

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handlePilihAnggota(item)}
              activeOpacity={0.7}
              className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 flex-row items-center"
            >
              {/* Avatar Initial */}
              <View
                className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                  item.status === "Hadir"
                    ? "bg-emerald-100"
                    : item.status === "Sakit"
                      ? "bg-rose-100"
                      : item.status === "Izin"
                        ? "bg-amber-100"
                        : item.status === "Alpa"
                          ? "bg-gray-200"
                          : "bg-blue-50"
                }`}
              >
                <Text
                  className={`font-bold text-lg ${
                    item.status === "Hadir"
                      ? "text-emerald-700"
                      : item.status === "Sakit"
                        ? "text-rose-700"
                        : item.status === "Izin"
                          ? "text-amber-700"
                          : item.status === "Alpa"
                            ? "text-gray-600"
                            : "text-blue-600"
                  }`}
                >
                  {item.nama.charAt(0)}
                </Text>
              </View>

              {/* Info Anggota */}
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base mb-0.5">
                  {item.nama}
                </Text>

                {/* Posisi & Shift */}
                <View className="flex-row items-center mb-1.5 flex-wrap">
                  <Text className="text-gray-600 text-xs font-medium mr-2">
                    {item.posisi}
                  </Text>
                  <Text className="text-blue-500 text-[10px] font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                    {item.shift}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className={`px-2 py-0.5 rounded-md ${
                      item.status === "Hadir"
                        ? "bg-emerald-50"
                        : item.status === "Sakit"
                          ? "bg-rose-50"
                          : item.status === "Izin"
                            ? "bg-amber-50"
                            : item.status === "Alpa"
                              ? "bg-gray-100"
                              : "bg-sky-50"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${
                        item.status === "Hadir"
                          ? "text-emerald-600"
                          : item.status === "Sakit"
                            ? "text-rose-600"
                            : item.status === "Izin"
                              ? "text-amber-600"
                              : item.status === "Alpa"
                                ? "text-gray-600"
                                : "text-sky-600"
                      }`}
                    >
                      {item.status}
                    </Text>
                  </View>
                  {!isBelumAbsen && item.jamAbsen !== "--:--" && (
                    <Text className="text-gray-400 text-xs ml-2 flex-row items-center">
                      • Jam {item.jamAbsen}
                    </Text>
                  )}
                </View>
              </View>

              {/* Tombol Aksi Kanan */}
              {isBelumAbsen ? (
                <View className="bg-blue-50 w-10 h-10 rounded-full items-center justify-center">
                  <Ionicons name="scan" size={20} color="#3b82f6" />
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* --- MODAL ACTION ABSEN ANGGOTA --- */}
      <Modal visible={showActionModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-extrabold text-gray-900">
                  Catat Kehadiran
                </Text>
                <Text className="text-gray-500 text-sm mt-0.5">
                  Untuk:{" "}
                  <Text className="font-bold text-gray-800">
                    {selectedAnggota?.nama}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowActionModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-500 mt-4 font-medium">
                  Memproses data...
                </Text>
              </View>
            ) : (
              <View className="flex-row justify-between flex-wrap">
                <TouchableOpacity
                  onPress={() => handleSubmitAbsen("Hadir")}
                  className="w-[48%] bg-emerald-50 border border-emerald-200 p-4 rounded-2xl items-center mb-4 active:bg-emerald-100"
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={32}
                    color="#10b981"
                    className="mb-2"
                  />
                  <Text className="text-emerald-700 font-bold mt-2">
                    Hadir (Masuk)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSubmitAbsen("Sakit")}
                  className="w-[48%] bg-rose-50 border border-rose-200 p-4 rounded-2xl items-center mb-4 active:bg-rose-100"
                >
                  <Ionicons
                    name="medkit"
                    size={32}
                    color="#f43f5e"
                    className="mb-2"
                  />
                  <Text className="text-rose-700 font-bold mt-2">Sakit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSubmitAbsen("Izin")}
                  className="w-[48%] bg-amber-50 border border-amber-200 p-4 rounded-2xl items-center mb-4 active:bg-amber-100"
                >
                  <Ionicons
                    name="calendar"
                    size={32}
                    color="#f59e0b"
                    className="mb-2"
                  />
                  <Text className="text-amber-700 font-bold mt-2">
                    Izin Resmi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSubmitAbsen("Alpa")}
                  className="w-[48%] bg-gray-50 border border-gray-200 p-4 rounded-2xl items-center mb-4 active:bg-gray-100"
                >
                  <Ionicons
                    name="close-circle"
                    size={32}
                    color="#64748b"
                    className="mb-2"
                  />
                  <Text className="text-gray-700 font-bold mt-2">
                    Tanpa Keterangan
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
