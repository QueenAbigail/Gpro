import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const maskRowHeight = Math.round((Dimensions.get("window").height - 300) / 2);
const maskColWidth = (width - 300) / 2;

export default function GlobalScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Jika izin kamera belum memuat
  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  // Jika izin kamera ditolak
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <Ionicons
          name="camera-outline"
          size={80}
          color="white"
          className="mb-4"
        />
        <Text className="text-white text-center text-lg font-bold mb-2">
          Akses Kamera Dibutuhkan
        </Text>
        <Text className="text-gray-400 text-center text-sm mb-8">
          Aplikasi butuh izin kamera buat nge-scan QR Code Absen dan Patroli.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-blue-600 px-6 py-3 rounded-full active:bg-blue-700"
        >
          <Text className="text-white font-bold">Berikan Izin Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- LOGIKA UTAMA DETEKSI QR CODE ---
  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    // Biar gak ke-scan berkali-kali pas kamera masih nyala
    if (scanned) return;
    setScanned(true);

    // KITA CEK ISI TEKS DARI QR CODE-NYA
    if (data.startsWith("ABSEN")) {
      // Kalau kata depannya "ABSEN" (Contoh isi QR: ABSEN-POS-01)
      Alert.alert(
        "QR Absen Terdeteksi",
        "Mengarahkan ke formulir absen masuk...",
        [
          {
            text: "Lanjut",
            onPress: () => {
              // Reset scan biar kalau balik ke sini bisa scan lagi
              setScanned(false);
              router.push("/beranda/absen/masuk" as any);
            },
          },
        ],
      );
    } else if (data.startsWith("PATROLI")) {
      // Kalau kata depannya "PATROLI" (Contoh isi QR: PATROLI-CHECKPOINT-5)
      Alert.alert(
        "QR Patroli Terdeteksi",
        `Titik: ${data}\nMencatat kehadiran patroli...`,
        [
          {
            text: "Lanjut",
            onPress: () => {
              setScanned(false);
              // Arahin ke halaman detail patroli (sesuaikan rutenya nanti)
              // router.push("/patroli/detail" as any);
              Alert.alert("Info", "Halaman Patroli belum dibuat ya Can!");
            },
          },
        ],
      );
    } else {
      // Kalau discan ke bungkus Indomie atau QR Code lain yang ga nyambung
      Alert.alert(
        "QR Tidak Dikenali",
        "QR Code ini bukan format milik PT. Citra Abadi Sejati.",
        [{ text: "Coba Lagi", onPress: () => setScanned(false) }],
      );
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"], // Kita batasin cuma baca QR Code aja
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* --- UI KOTAK SCANNER (VIEWFINDER) --- */}
        <View className="flex-1">
          <View style={styles.maskRow} />
          <View style={styles.maskCenter}>
            <View style={styles.maskFrame} />
            {/* Area bolong buat ngebidik QR */}
            <View style={styles.viewfinder}>
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
            </View>
            <View style={styles.maskFrame} />
          </View>
          <View
            style={styles.maskRow}
            className="items-center justify-start pt-8"
          >
            <View className="bg-black/60 px-6 py-3 rounded-full flex-row items-center">
              <Ionicons name="qr-code-outline" size={20} color="white" />
              <Text className="text-white ml-2 font-semibold">
                Arahkan ke QR Code
              </Text>
            </View>
          </View>
        </View>
      </CameraView>

      {/* Tombol Back Custom (Kalau misal mau tutup scanner) */}
      <View className="absolute top-14 left-5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-12 h-12 bg-black/50 rounded-full items-center justify-center"
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Styling khusus buat bikin efek gelap di luar kotak scanner
const styles = StyleSheet.create({
  maskRow: {
    width: "100%",
    height: maskRowHeight,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  maskCenter: {
    flexDirection: "row",
    height: 300,
  },
  maskFrame: {
    width: maskColWidth,
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  viewfinder: {
    width: 300,
    height: 300,
    backgroundColor: "transparent",
    position: "relative",
  },
});
