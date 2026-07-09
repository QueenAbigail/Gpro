import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal, // 👈 Ditambahkan untuk penunjang custom alert
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

// Buat interface tipenya dulu biar aman di TypeScript
interface ModalConfig {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  onPress?: () => void;
}

export default function PengajuanIzinScreen() {
  const router = useRouter();

  // State Form
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State Tanggal
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // 🔥 State Mandiri buat Atur Custom Alert Pop-up Aesthetic
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  // Fungsi jembatan pemanggil custom alert pengganti Alert.alert bawaan
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

  // Format tanggal buat tampilan
  const formatDate = (date: Date) => `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  // Format tanggal buat database (YYYY-MM-DD)
  const formatForDB = (date: Date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

  const handleDownloadTemplate = () => {
    // 🔄 Ganti Alert Native ke Custom Alert Info
    showAlert("Template", "Mengunduh template form izin...", "info");
  };

  const handlePickDocument = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // 🔄 Ganti Alert Native ke Custom Alert Warning
    if (!granted) return showAlert("Izin Ditolak", "Butuh akses galeri!", "warning");
    
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 0.8 
    });
    
    if (!result.canceled) setAttachment(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    // 🔄 Ganti Alert Native ke Custom Alert Warning
    if (!reason || !attachment) {
      showAlert("Lengkapi Data", "Alasan dan dokumen form izin wajib diisi!", "warning");
      return;
    }
    // 🔄 Ganti Alert Native ke Custom Alert Warning
    if (endDate < startDate) {
      showAlert("Tanggal Salah", "Tanggal selesai tidak boleh sebelum tanggal mulai.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sesi tidak ditemukan");

      // 1. Upload foto ke Supabase Storage
      const fileExt = attachment.split('.').pop();
      const fileName = `${authData.user.id}/izin_${Date.now()}.${fileExt}`;
      const formData = new FormData();
      formData.append("file", { uri: attachment, name: fileName, type: `image/${fileExt}` } as any);

      const { data: storageData, error: storageError } = await supabase.storage
        .from("leave-attachments")
        .upload(fileName, formData);
      
      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage
        .from("leave-attachments")
        .getPublicUrl(storageData.path);

      // 2. Insert ke tabel leaves
      const { error: insertError } = await supabase.from("leaves").insert({
        userId: authData.user.id,
        leaveType: "Izin",
        startDate: formatForDB(startDate),
        endDate: formatForDB(endDate),
        reason: reason,
        attachmentUrl: publicUrlData.publicUrl,
        status: "Pending",
      });

      if (insertError) throw insertError;

      setIsLoading(false);
      
      // 🔄 Ganti Alert Native ke Custom Alert Success + Otomatis Router Back pas di-klik OK
      showAlert("Sukses", "Pengajuan izin berhasil dikirim!", "success", () => {
        router.back();
      });
    } catch (e: any) {
      setIsLoading(false);
      // 🔄 Ganti Alert Native ke Custom Alert Error
      showAlert("Gagal", e.message || "Terjadi kesalahan server", "error");
    }
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
          <Text className="text-xl font-bold text-slate-800">Pengajuan Cuti</Text>
          <Text className="text-slate-500 text-xs mt-0.5">Isi form & upload dokumen persetujuan</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Section 1: Rentang Waktu */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <Text className="text-slate-800 font-bold mb-4">Rentang Waktu</Text>
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-slate-500 text-xs font-semibold mb-2">Tanggal Mulai</Text>
              <TouchableOpacity onPress={() => setShowStartPicker(true)} className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50">
                <Ionicons name="calendar-outline" size={18} color="#64748b" />
                <Text className="flex-1 ml-2 text-slate-800 text-sm">{formatDate(startDate)}</Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker value={startDate} mode="date" onChange={(_, d) => { setShowStartPicker(false); if (d) setStartDate(d); }} />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-slate-500 text-xs font-semibold mb-2">Tanggal Selesai</Text>
              <TouchableOpacity onPress={() => setShowEndPicker(true)} className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50">
                <Ionicons name="calendar-outline" size={18} color="#64748b" />
                <Text className="flex-1 ml-2 text-slate-800 text-sm">{formatDate(endDate)}</Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker value={endDate} mode="date" minimumDate={startDate} onChange={(_, d) => { setShowEndPicker(false); if (d) setEndDate(d); }} />
              )}
            </View>
          </View>
        </View>

        {/* Section 2: Keterangan */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-800 font-bold">Keterangan Cuti</Text>
            <Text className="text-red-500 text-xs font-semibold">*Wajib</Text>
          </View>
          <View className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 h-32">
            <TextInput
              placeholder="Contoh: Mengurus perpanjangan STNK di Samsat..."
              placeholderTextColor="#cbd5e1"
              multiline
              textAlignVertical="top"
              className="flex-1 text-slate-800 text-sm"
              value={reason}
              onChangeText={setReason}
            />
          </View>
        </View>

        {/* Section 3: Dokumen */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-8">
          <Text className="text-slate-800 font-bold mb-3">Dokumen Pengajuan</Text>
          <View className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-blue-800 font-semibold text-sm mb-1">Form Pengajuan Cuti</Text>
              <Text className="text-blue-600 text-xs leading-relaxed">Download template ini jika belum punya form fisik.</Text>
            </View>
            <TouchableOpacity onPress={handleDownloadTemplate} className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center shadow-sm">
              <Ionicons name="download-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-700 font-semibold text-sm">Upload Form Bertanda Tangan</Text>
            <Text className="text-red-500 text-xs font-semibold">*Wajib</Text>
          </View>

          {attachment ? (
            <View className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="document-text" size={24} color="#f59e0b" />
                <Text className="text-slate-700 ml-3 font-medium text-sm">Dokumen Terlampir</Text>
              </View>
              <TouchableOpacity onPress={() => setAttachment(null)}><Ionicons name="close-circle" size={24} color="#ef4444" /></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handlePickDocument} className="border-2 border-dashed border-slate-300 rounded-xl p-6 items-center justify-center bg-slate-50">
              <Ionicons name="cloud-upload-outline" size={32} color="#94a3b8" />
              <Text className="text-slate-600 font-semibold mt-2 text-sm text-center">Upload Foto/Scan Form Cuti</Text>
              <Text className="text-slate-400 text-xs mt-1 text-center px-4">Pastikan form sudah ditandatangani.</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tombol Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl items-center flex-row justify-center mb-4 ${isLoading ? "bg-amber-400" : "bg-amber-500 active:bg-amber-600"}`}
        >
          {isLoading ? <ActivityIndicator color="white" /> : (
            <>
              <Ionicons name="paper-plane-outline" size={20} color="white" />
              <Text className="text-white font-bold ml-2 text-base">Kirim Pengajuan</Text>
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
                if (modalConfig.onPress) modalConfig.onPress(); // Eksekusi callback jika ada (seperti router.back)
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