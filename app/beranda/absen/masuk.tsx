import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";

export default function AbsenMasukScreen() {
  const router = useRouter();

  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationReady, setIsLocationReady] = useState(false);

  // State Kamera & Foto
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedTime, setCapturedTime] = useState<Date | null>(null);

  // Referensi (Ref)
  const cameraRef = useRef<any>(null);
  const watermarkRef = useRef<View>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setTimeout(() => {
      setIsLocationReady(true);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const timeToDisplay = capturedTime || currentTime;

  const hours = timeToDisplay.getHours().toString().padStart(2, "0");
  const minutes = timeToDisplay.getMinutes().toString().padStart(2, "0");
  const seconds = timeToDisplay.getSeconds().toString().padStart(2, "0");

  const day = timeToDisplay.getDate().toString().padStart(2, "0");
  const month = (timeToDisplay.getMonth() + 1).toString().padStart(2, "0");
  const year = timeToDisplay.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

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
  ];

  const handleBukaKamera = async () => {
    if (!isLocationReady) {
      Alert.alert("Tunggu", "Sedang memastikan titik koordinat GPS kamu...");
      return;
    }
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Izin Ditolak",
          "Aplikasi butuh izin kamera buat absen selfie!",
        );
        return;
      }
    }
    setIsCameraOpen(true);
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: false,
        });
        setCapturedPhoto(photo.uri);
        setCapturedTime(new Date());
      } catch (error) {
        Alert.alert("Error", "Gagal mengambil foto, silakan coba lagi.");
      }
    }
  };

  // Cuma dipakai kalau user klik tombol "Foto Ulang"
  const resetPhoto = () => {
    setCapturedPhoto(null);
    setCapturedTime(null);
  };

  const submitAbsen = async () => {
    setIsLoading(true);

    try {
      const watermarkedImageUri = await captureRef(watermarkRef, {
        format: "jpg",
        quality: 0.8,
      });

      console.log("Gambar siap dikirim:", watermarkedImageUri);

      // Simulasi delay upload ke server
      setTimeout(() => {
        setIsLoading(false); // Matiin muter-muter di tombol

        Alert.alert(
          "Absen Berhasil",
          "Absen masuk berhasil tercatat beserta foto ber-timestamp!",
          [
            {
              text: "OK",
              onPress: () => {
                // 👇 PERUBAHAN UTAMA DI SINI 👇
                // Langsung mundur aja, gak usah ubah state isCameraOpen biar gak nabrak render
                router.back();
              },
            },
          ],
        );
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Error", "Gagal memproses foto, silakan coba lagi.");
    }
  };

  return (
    <View className="flex-1 bg-sky-50">
      {isCameraOpen ? (
        <View className="flex-1 bg-black absolute w-full h-full z-50">
          {capturedPhoto ? (
            <>
              <View
                ref={watermarkRef}
                collapsable={false}
                className="flex-1 relative"
              >
                <Image
                  source={{ uri: capturedPhoto }}
                  className="flex-1"
                  resizeMode="cover"
                />
                <View className="absolute bottom-28 left-4 bg-black/60 px-4 py-2 rounded-xl border-l-4 border-emerald-500">
                  <Text className="text-white font-bold text-lg mb-0.5">
                    {formattedDate} - {hours}:{minutes}:{seconds}
                  </Text>
                  <Text className="text-gray-300 text-xs font-semibold">
                    <Ionicons name="location" size={12} color="#10b981" /> PT.
                    Citra Abadi Sejati
                  </Text>
                  <Text className="text-gray-300 text-[10px] mt-0.5">
                    Lat: -6.421, Long: 106.879 (Akurasi: 5m)
                  </Text>
                </View>
              </View>

              <View className="absolute bottom-0 w-full p-6 bg-black/80 flex-row justify-between items-center pb-10">
                <TouchableOpacity
                  onPress={resetPhoto}
                  disabled={isLoading}
                  className="flex-1 bg-gray-600 py-4 rounded-2xl mr-3 items-center active:bg-gray-700"
                >
                  <Text className="text-white font-bold text-base">
                    Foto Ulang
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={submitAbsen}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 py-4 rounded-2xl ml-3 items-center flex-row justify-center active:bg-blue-700"
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="white" />
                      <Text className="text-white font-bold ml-2 text-base">
                        Kirim Absen
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
              <View className="flex-1 justify-between py-12 px-6 bg-black/20">
                <View className="flex-row items-center justify-between mt-6">
                  <TouchableOpacity
                    onPress={() => setIsCameraOpen(false)}
                    className="w-10 h-10 bg-black/50 rounded-full items-center justify-center active:bg-black/70"
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                  <View className="bg-black/50 px-4 py-2 rounded-full">
                    <Text className="text-white font-semibold text-sm">
                      Posisikan wajah di tengah
                    </Text>
                  </View>
                  <View className="w-10 h-10" />
                </View>

                <View className="items-center mb-10">
                  <TouchableOpacity
                    onPress={handleTakePicture}
                    className="w-20 h-20 rounded-full border-4 border-white items-center justify-center bg-white/30 active:bg-white/50"
                  >
                    <View className="w-16 h-16 bg-white rounded-full" />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          )}
        </View>
      ) : (
        <View className="flex-1">
          <View className="pt-16 pb-4 px-6 bg-white flex-row items-center border-b border-sky-100 shadow-sm z-10">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-sky-50 rounded-full items-center justify-center mr-4 active:bg-sky-100"
            >
              <Ionicons name="arrow-back" size={20} color="#1e293b" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-gray-900">
                Absen Masuk
              </Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                Validasi GPS & Catat Kehadiran
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-6"
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-8 items-center">
              <Text className="text-gray-500 font-medium mb-2">
                Waktu Saat Ini
              </Text>
              <View className="flex-row items-end mb-4">
                <Text className="text-5xl font-extrabold text-gray-900 tracking-tight">
                  {hours}:{minutes}
                </Text>
                <Text className="text-2xl font-bold text-gray-400 ml-1 mb-1">
                  :{seconds}
                </Text>
              </View>

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

            <TouchableOpacity
              onPress={handleBukaKamera}
              disabled={!isLocationReady}
              className={`w-full py-5 rounded-3xl items-center flex-row justify-center mb-10 shadow-lg ${!isLocationReady ? "bg-blue-300" : "bg-blue-600 active:bg-blue-700"}`}
            >
              <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
                <Ionicons name="finger-print" size={24} color="white" />
              </View>
              <View className="items-start">
                <Text className="text-white font-extrabold text-lg tracking-wide">
                  CATAT ABSEN
                </Text>
                <Text className="text-blue-100 text-xs">
                  Tanpa Scan QR Code
                </Text>
              </View>
            </TouchableOpacity>

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
                  className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${item.status === "Tepat Waktu" ? "bg-emerald-50" : "bg-rose-50"}`}
                >
                  <Ionicons
                    name={
                      item.status === "Tepat Waktu"
                        ? "checkmark-circle"
                        : "warning"
                    }
                    size={24}
                    color={
                      item.status === "Tepat Waktu" ? "#10b981" : "#f43f5e"
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold mb-0.5">
                    {item.date}
                  </Text>
                  <Text className="text-gray-500 text-xs flex-row items-center">
                    Jam {item.time} •{" "}
                    <Text className="text-sky-600 font-medium">
                      {item.type}
                    </Text>
                  </Text>
                </View>
                <View
                  className={`px-3 py-1.5 rounded-full ${item.status === "Tepat Waktu" ? "bg-emerald-100" : "bg-rose-100"}`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase ${item.status === "Tepat Waktu" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
