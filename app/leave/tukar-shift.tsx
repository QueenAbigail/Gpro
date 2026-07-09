import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal, // 👈 Ditambahkan untuk penunjang custom alert
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Interface tipe data buat modal alert biar aman di TypeScript
interface ModalConfig {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  onPress?: () => void;
}

export default function TukarShiftScreen() {
  const router = useRouter();

  // State untuk form tukar shift
  const [myShiftDate, setMyShiftDate] = useState("");
  const [myShiftType, setMyShiftType] = useState("");
  const [replacementEmployee, setReplacementEmployee] = useState("");
  const [targetShiftDate, setTargetShiftDate] = useState("");
  const [targetShiftType, setTargetShiftType] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🔥 State Utama Custom Alert Pop-up Aesthetic
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  // Fungsi jembatan pemanggil custom alert pengganti Alert bawaan
  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
    onPress?: () => void
  ) => {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      onPress,
    });
  };

  const handleSubmit = () => {
    // Validasi input
    if (
      !myShiftDate ||
      !myShiftType ||
      !replacementEmployee ||
      !targetShiftDate ||
      !targetShiftType ||
      !reason
    ) {
      // 🔄 Ganti Alert Native ke Custom Alert Warning
      showAlert(
        "Data Belum Lengkap",
        "Mohon lengkapi semua data pengajuan tukar shift sebelum mengirim!",
        "warning"
      );
      return;
    }

    setIsLoading(true);

    // Simulasi kirim data ke database/Supabase
    setTimeout(() => {
      setIsLoading(false);
      
      // 🔄 Ganti Alert Native ke Custom Alert Success + Callback Router Back
      showAlert(
        "Pengajuan Berhasil",
        "Pengajuan tukar shift berhasil dikirim! Menunggu konfirmasi dari rekan kerja dan approval HRD.",
        "success",
        () => {
          router.back();
        }
      );
    }, 2000);
  };

  // Helper styling dinamis berdasarkan tipe alert modal
  const getModalTheme = () => {
    switch (modalConfig.type) {
      case "success":
        return { icon: "checkmark-circle" as const, color: "#10b981", bg: "bg-emerald-50", btn: "bg-emerald-500 active:bg-emerald-600" };
      case "error":
        return { icon: "close-circle" as const, color: "#ef4444", bg: "bg-red-50", btn: "bg-red-500 active:bg-red-600" };
      case "warning":
        return { icon: "warning" as const, color: "#f59e0b", bg: "bg-amber-50", btn: "bg-amber-500 active:bg-amber-600" };
      case "info":
      default:
        return { icon: "information-circle" as const, color: "#3b82f6", bg: "bg-blue-50", btn: "bg-blue-500 active:bg-blue-600" };
    }
  };

  const theme = getModalTheme();

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="pt-16 pb-4 px-6 bg-white flex-row items-center border-b border-slate-100 shadow-sm z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4 active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-slate-800">Tukar Shift</Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            Ajukan penggantian jadwal dengan rekan kerja
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Section 1: Jadwal Shift Kamu */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Jadwal Shift Kamu
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="mb-4">
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Tanggal Shift Kamu
            </Text>
            <TouchableOpacity className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50">
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
              <TextInput
                placeholder="Contoh: 12 Juni 2026"
                placeholderTextColor="#cbd5e1"
                className="flex-1 ml-2 text-slate-800 text-sm"
                value={myShiftDate}
                onChangeText={setMyShiftDate}
              />
            </TouchableOpacity>
          </View>

          <View>
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Jenis Shift Asli
            </Text>
            <TouchableOpacity className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50">
              <Ionicons name="time-outline" size={18} color="#64748b" />
              <TextInput
                placeholder="Contoh: Shift Pagi (07:00 - 15:00)"
                placeholderTextColor="#cbd5e1"
                className="flex-1 ml-2 text-slate-800 text-sm"
                value={myShiftType}
                onChangeText={setMyShiftType}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Rekan Kerja Pengganti */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Rekan Kerja Pengganti
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View>
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Nama atau ID Karyawan Pengganti
            </Text>
            <TouchableOpacity className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50">
              <Ionicons name="person-outline" size={18} color="#64748b" />
              <TextInput
                placeholder="Contoh: Budi Santoso / CAS-02"
                placeholderTextColor="#cbd5e1"
                className="flex-1 ml-2 text-slate-800 text-sm"
                value={replacementEmployee}
                onChangeText={setReplacementEmployee}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Jadwal Shift Baru (Tujuan) */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Jadwal Shift Tukaran
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="mb-4">
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Tanggal Shift Tujuan
            </Text>
            <TouchableOpacity className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50">
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
              <TextInput
                placeholder="Contoh: 13 Juni 2026"
                placeholderTextColor="#cbd5e1"
                className="flex-1 ml-2 text-slate-800 text-sm"
                value={targetShiftDate}
                onChangeText={setTargetShiftDate}
              />
            </TouchableOpacity>
          </View>

          <View>
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Jenis Shift Tujuan
            </Text>
            <TouchableOpacity className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50">
              <Ionicons name="time-outline" size={18} color="#64748b" />
              <TextInput
                placeholder="Contoh: Shift Malam (23:00 - 07:00)"
                placeholderTextColor="#cbd5e1"
                className="flex-1 ml-2 text-slate-800 text-sm"
                value={targetShiftType}
                onChangeText={setTargetShiftType}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Alasan */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Alasan Tukar Shift
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-8">
          <View className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 h-28">
            <TextInput
              placeholder="Berikan alasan logis (misal: Ada keperluan keluarga mendadak di tanggal tersebut)..."
              placeholderTextColor="#cbd5e1"
              multiline
              textAlignVertical="top"
              className="flex-1 text-slate-800 text-sm"
              value={reason}
              onChangeText={setReason}
            />
          </View>
        </View>

        {/* Tombol Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl items-center flex-row justify-center mb-4 ${
            isLoading ? "bg-blue-400" : "bg-blue-600 active:bg-blue-700"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="sync-outline" size={20} color="white" />
              <Text className="text-white font-bold ml-2 text-base">
                Ajukan Tukar Shift
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* 🔮 KOMPONEN CUSTOM ALERT MODAL POP-UP AESTHETIC UNIVERSAL */}
      <Modal
        transparent
        visible={modalConfig.visible}
        animationType="fade"
        onRequestClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl items-center">
            
            {/* Lingkaran Dinamis Icon Sesuai Type */}
            <View className={`w-14 h-14 ${theme.bg} rounded-full items-center justify-center mb-4`}>
              <Ionicons name={theme.icon} size={28} color={theme.color} />
            </View>

            {/* Judul & Teks Pesan */}
            <Text className="text-slate-800 font-bold text-lg text-center mb-2">
              {modalConfig.title}
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-6 leading-relaxed px-2">
              {modalConfig.message}
            </Text>

            {/* Tombol Oke Konfirmasi */}
            <TouchableOpacity
              onPress={() => {
                setModalConfig((prev) => ({ ...prev, visible: false }));
                if (modalConfig.onPress) modalConfig.onPress(); // Jalankan router.back pas sukses klik oke
              }}
              className={`w-full ${theme.btn} py-3.5 rounded-2xl items-center shadow-sm`}
            >
              <Text className="text-white font-bold text-sm">Oke</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}