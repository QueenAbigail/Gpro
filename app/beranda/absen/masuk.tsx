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

export default function AbsenMasukScreen() {
  const router = useRouter();

  // State untuk jam real-time, loading, dan status lokasi
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationReady, setIsLocationReady] = useState(false);

  // Efek untuk jam berjalan & simulasi pencarian GPS
  useEffect(() => {
    // Update jam setiap detik
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Simulasi nyari GPS selama 2 detik pas buka halaman
    setTimeout(() => {
      setIsLocationReady(true);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  // Format jam (HH:MM:SS)
  const hours = currentTime.getHours().toString().padStart(2, "0");
  const minutes = currentTime.getMinutes().toString().padStart(2, "0");
  const seconds = currentTime.getSeconds().toString().padStart(2, "0");

  // Dummy data riwayat absen minggu ini
  const absenHistory = [
    {
      id: "1",
      date: "27 Mei 2026",
      time: "07:42",
      status: "Tepat Waktu",
      type: "Scan QR",
    },
    {
      id: "2",
      date: "26 Mei 2026",
      time: "07:50",
      status: "Tepat Waktu",
      type: "Manual GPS",
    },
    {
      id: "3",
      date: "25 Mei 2026",
      time: "08:15",
      status: "Terlambat",
      type: "Scan QR",
    },
    {
      id: "4",
      date: "24 Mei 2026",
      time: "07:40",
      status: "Tepat Waktu",
      type: "Scan QR",
    },
  ];

  const handleAbsenMasuk = () => {
    if (!isLocationReady) {
      alert("Tunggu sebentar, sedang memastikan titik kordinat GPS kamu...");
      return;
    }

    setIsLoading(true);

    // Simulasi nembak API absensi
    setTimeout(() => {
      setIsLoading(false);
      alert("Absen masuk berhasil tercatat!");
      router.back();
    }, 2000);
  };

  return (
    <View className="flex-1 bg-sky-50">
      {/* Header */}
      <View className="pt-16 pb-4 px-6 bg-white flex-row items-center border-b border-sky-100 shadow-sm z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-sky-50 rounded-full items-center justify-center mr-4 active:bg-sky-100"
        >
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-gray-900">Absen Masuk</Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            Validasi GPS & Catat Kehadiran
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Card Waktu & Lokasi */}
        <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-8 items-center">
          <Text className="text-gray-500 font-medium mb-2">Waktu Saat Ini</Text>
          <View className="flex-row items-end mb-4">
            <Text className="text-5xl font-extrabold text-gray-900 tracking-tight">
              {hours}:{minutes}
            </Text>
            <Text className="text-2xl font-bold text-gray-400 ml-1 mb-1">
              :{seconds}
            </Text>
          </View>

          {/* Status GPS */}
          <View
            className={`flex-row items-center px-4 py-2 rounded-full ${isLocationReady ? "bg-emerald-50" : "bg-amber-50"}`}
          >
            {isLocationReady ? (
              <>
                <Ionicons name="location" size={16} color="#10b981" />
                <Text className="text-emerald-700 text-xs font-bold ml-2">
                  Lokasi Valid (Akurasi 5m)
                </Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text className="text-amber-700 text-xs font-bold ml-2">
                  Mendapatkan Koordinat...
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Tombol Absen Utama */}
        <TouchableOpacity
          onPress={handleAbsenMasuk}
          disabled={isLoading || !isLocationReady}
          className={`w-full py-5 rounded-3xl items-center flex-row justify-center mb-10 shadow-lg ${
            !isLocationReady
              ? "bg-blue-300"
              : isLoading
                ? "bg-blue-500"
                : "bg-blue-600 active:bg-blue-700"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="large" />
          ) : (
            <>
              <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
                <Ionicons name="finger-print" size={24} color="white" />
              </View>
              <View className="items-start">
                <Text className="text-white font-extrabold text-lg tracking-wide">
                  CATAT ABSEN MASUK
                </Text>
                <Text className="text-blue-100 text-xs">
                  Tanpa Scan QR Code
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Riwayat Absen Singkat */}
        <View className="mb-4 flex-row justify-between items-center">
          <Text className="text-gray-900 font-bold text-lg">
            Riwayat Kehadiran
          </Text>
          <Text className="text-gray-400 text-xs">7 Hari Terakhir</Text>
        </View>

        {absenHistory.map((item) => (
          <View
            key={item.id}
            className="bg-white p-4 rounded-2xl mb-3 border border-gray-100 shadow-sm flex-row items-center"
          >
            <View
              className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                item.status === "Tepat Waktu" ? "bg-emerald-50" : "bg-rose-50"
              }`}
            >
              <Ionicons
                name={
                  item.status === "Tepat Waktu" ? "checkmark-circle" : "warning"
                }
                size={24}
                color={item.status === "Tepat Waktu" ? "#10b981" : "#f43f5e"}
              />
            </View>

            <View className="flex-1">
              <Text className="text-gray-900 font-bold mb-0.5">
                {item.date}
              </Text>
              <Text className="text-gray-500 text-xs flex-row items-center">
                Jam {item.time} •{" "}
                <Text className="text-sky-600 font-medium">{item.type}</Text>
              </Text>
            </View>

            <View
              className={`px-3 py-1.5 rounded-full ${
                item.status === "Tepat Waktu" ? "bg-emerald-100" : "bg-rose-100"
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase ${
                  item.status === "Tepat Waktu"
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                {item.status}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
