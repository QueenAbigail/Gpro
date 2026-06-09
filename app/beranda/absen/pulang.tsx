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

export default function AbsenPulangScreen() {
  const router = useRouter();

  // State untuk jam real-time, loading, dan status lokasi
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationReady, setIsLocationReady] = useState(false);

  // Efek untuk jam berjalan & simulasi pencarian GPS
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Simulasi nyari GPS selama 2 detik
    setTimeout(() => {
      setIsLocationReady(true);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours().toString().padStart(2, "0");
  const minutes = currentTime.getMinutes().toString().padStart(2, "0");
  const seconds = currentTime.getSeconds().toString().padStart(2, "0");

  const handleAbsenPulang = () => {
    if (!isLocationReady) {
      alert("Tunggu sebentar, sedang memastikan titik kordinat GPS kamu...");
      return;
    }

    setIsLoading(true);

    // Simulasi nembak API absensi
    setTimeout(() => {
      setIsLoading(false);
      alert("Absen pulang berhasil tercatat! Selamat beristirahat.");
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
          <Text className="text-xl font-bold text-gray-900">Absen Pulang</Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            Selesaikan shift kerjamu hari ini
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Card Waktu & Lokasi */}
        <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-6 items-center">
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
                  Lokasi Valid (Akurasi 4m)
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

        {/* Ringkasan Shift Hari Ini */}
        <View className="bg-blue-600 rounded-3xl p-5 shadow-md mb-8">
          <Text className="text-blue-100 font-medium text-sm mb-4">
            Ringkasan Shift Hari Ini
          </Text>

          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-blue-200 text-xs mb-1">Jam Masuk</Text>
              <Text className="text-white text-xl font-bold">07:45 WIB</Text>
            </View>
            <View className="h-8 w-[1px] bg-blue-400" />
            <View className="items-end">
              <Text className="text-blue-200 text-xs mb-1">Durasi Kerja</Text>
              <Text className="text-white text-xl font-bold">9j 17m</Text>
            </View>
          </View>
        </View>

        {/* Tombol Absen Pulang */}
        <TouchableOpacity
          onPress={handleAbsenPulang}
          disabled={isLoading || !isLocationReady}
          className={`w-full py-5 rounded-3xl items-center flex-row justify-center shadow-lg ${
            !isLocationReady
              ? "bg-rose-300"
              : isLoading
                ? "bg-rose-500"
                : "bg-rose-600 active:bg-rose-700"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="large" />
          ) : (
            <>
              <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
                <Ionicons name="log-out" size={24} color="white" />
              </View>
              <View className="items-start">
                <Text className="text-white font-extrabold text-lg tracking-wide">
                  CATAT ABSEN PULANG
                </Text>
                <Text className="text-rose-100 text-xs">
                  Tanpa Scan QR Code
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
