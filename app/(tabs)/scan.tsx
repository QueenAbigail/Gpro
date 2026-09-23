import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router"; // 💡 TAMBAH useFocusEffect
import { useCallback, useRef, useState } from "react"; // 💡 TAMBAH useRef & useCallback
import {
  Dimensions,
  Modal,
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

  // 💡 JURUS GEMBOK INSTAN: Pakai useRef biar kunci scanner nggak delay
  const isProcessing = useRef(false);

  // STATE BUAT MODAL ERROR (MERAH)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    buttonText: "Coba Lagi",
    onPress: () => {},
  });

  // 💡 RESET GEMBOK OTOMATIS: Tiap halaman ini dibuka (misal balik dari form), scanner siap lagi
  useFocusEffect(
    useCallback(() => {
      isProcessing.current = false;
    }, []),
  );

  if (!permission) return <View className="flex-1 bg-black" />;

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
          Aplikasi butuh izin kamera buat nge-scan QR Code.
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

  // Fungsi khusus nampilin modal error merah
  const showErrorModal = (title: string, message: string) => {
    setModalContent({
      title,
      message,
      buttonText: "Coba Lagi",
      onPress: () => {
        setModalVisible(false);
        // Buka gembok dengan delay 500ms biar ga gak sengaja langsung ke-scan dobel pas jari nekan tombol
        setTimeout(() => {
          isProcessing.current = false;
        }, 500);
      },
    });
    setModalVisible(true);
  };

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    // 💡 CEK GEMBOK: Kalau lagi proses (true), langsung tendang!
    if (isProcessing.current) return;
    isProcessing.current = true; // Langsung dikunci saat itu juga

    try {
      const parsed = JSON.parse(data);

      // JIKA QR CODE PATROLI RESMI -> LANGSUNG REDIRECT
      if (parsed.type === "patrol" && parsed.id) {
        router.push(`/patrol/input?locationId=${parsed.id}` as any);
        return;
      }

      // JIKA QR CODE ABSENSI -> LANGSUNG REDIRECT
      if (parsed.type === "attendance" || parsed.code?.includes("ATT")) {
        router.push("/beranda/absen/masuk" as any);
        return;
      }
    } catch (e) {
      // Fallback format string
      if (data.startsWith("ABSEN")) {
        router.push("/beranda/absen/masuk" as any);
        return;
      }
    }

    // 💡 JIKA BUKAN FORMAT RESMI -> TAMPILKAN MODAL MERAH
    showErrorModal(
      "QR Tidak Dikenali",
      "QR Code ini bukan format resmi milik Pro Maxima Rajawali.",
    );
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        // 💡 Sekarang onBarcodeScanned panggil fungsinya terus, tapi di dalemnya udah ada gembok
        onBarcodeScanned={handleBarCodeScanned}
      >
        <View className="flex-1">
          <View style={styles.maskRow} />
          <View style={styles.maskCenter}>
            <View style={styles.maskFrame} />
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

      <View className="absolute top-14 left-5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-12 h-12 bg-black/50 rounded-full items-center justify-center"
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* 💡 MODAL KHUSUS ERROR / FAIL (TEMA MERAH) */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-2xl">
            {/* Lingkaran Merah dengan Ikon Silang */}
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="close-circle" size={36} color="#dc2626" />
            </View>

            <Text className="text-xl font-bold text-slate-800 mb-2 text-center">
              {modalContent.title}
            </Text>
            <Text className="text-slate-500 text-center mb-6 leading-relaxed">
              {modalContent.message}
            </Text>

            {/* Tombol Merah */}
            <TouchableOpacity
              onPress={modalContent.onPress}
              className="bg-red-600 w-full py-4 rounded-xl items-center active:bg-red-700 shadow-sm"
            >
              <Text className="text-white font-bold text-base">
                {modalContent.buttonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  maskRow: {
    width: "100%",
    height: maskRowHeight,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  maskCenter: { flexDirection: "row", height: 300 },
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
