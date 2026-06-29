import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase"; // Sesuaikan path jika beda

export default function PengajuanSakitScreen() {
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

  // Fungsi Format Tanggal buat ditampilin di layar (Contoh: 29/06/2026)
  const formatDate = (date: Date) => {
    const d = date.getDate().toString().padStart(2, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  // Fungsi Format Tanggal buat dikirim ke Database (Contoh: 2026-06-29)
  const formatForDB = (date: Date) => {
    const d = date.getDate().toString().padStart(2, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const y = date.getFullYear();
    return `${y}-${m}-${d}`;
  };

  // Buka Galeri HP
  const handlePickDocument = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Izin Ditolak", "Aplikasi butuh akses galeri untuk unggah surat dokter.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachment(result.assets[0].uri);
    }
  };

  // Fungsi Utama Kirim Data
  const handleSubmit = async () => {
    if (!reason || !attachment) {
      Alert.alert("Data Belum Lengkap", "Mohon isi keterangan dan lampirkan surat dokter!");
      return;
    }

    // Validasi: Tanggal selesai gak boleh lebih mundur dari tanggal mulai
    if (endDate < startDate) {
      Alert.alert("Tanggal Salah", "Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Ambil Data Sesi User
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sesi user hilang, silakan login ulang.");

      const userId = authData.user.id;

      // 2. Upload Foto Surat Dokter ke Bucket 'leave-attachments'
      const fileExt = attachment.split('.').pop();
      const fileName = `${userId}/sakit_${Date.now()}.${fileExt}`;

      const formData = new FormData();
      formData.append("file", {
        uri: attachment,
        name: fileName,
        type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
      } as any);

      const { data: storageData, error: storageError } = await supabase.storage
        .from("leave-attachments")
        .upload(fileName, formData, {
          contentType: "multipart/form-data",
        });

      if (storageError) throw storageError;

      // 3. Dapatkan Link Publik Fotonya
      const { data: publicUrlData } = supabase.storage
        .from("leave-attachments")
        .getPublicUrl(storageData.path);

      // 4. Masukin Semua Data ke Tabel 'leaves'
      const { error: insertError } = await supabase.from("leaves").insert({
        userId: userId,
        leaveType: "Sakit", // ✅ Langsung di-hardcode "Sakit"
        startDate: formatForDB(startDate),
        endDate: formatForDB(endDate),
        reason: reason,
        attachmentUrl: publicUrlData.publicUrl,
        status: "Pending", // ✅ Langsung di-hardcode "Pending"
      });

      if (insertError) throw insertError;

      setIsLoading(false);
      Alert.alert(
        "Pengajuan Berhasil",
        "Pengajuan sakit berhasil dikirim dan sedang menunggu persetujuan HRD.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert("Gagal Mengirim", error.message || "Terjadi kesalahan pada server.");
    }
  };

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
          <Text className="text-xl font-bold text-slate-800">Pengajuan Sakit</Text>
          <Text className="text-slate-500 text-xs mt-0.5">Isi form & lampirkan surat dokter</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Section 1: Tanggal Sakit */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <Text className="text-slate-800 font-bold mb-4">Rentang Waktu</Text>

          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-slate-500 text-xs font-semibold mb-2">Tanggal Mulai</Text>
              <TouchableOpacity 
                onPress={() => setShowStartPicker(true)}
                className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50"
              >
                <Ionicons name="calendar-outline" size={18} color="#64748b" />
                <Text className="flex-1 ml-2 text-slate-800 text-sm">
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>
              
              {/* Modal DatePicker Tanggal Mulai */}
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowStartPicker(false);
                    if (selectedDate) setStartDate(selectedDate);
                  }}
                />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-slate-500 text-xs font-semibold mb-2">Tanggal Selesai</Text>
              <TouchableOpacity 
                onPress={() => setShowEndPicker(true)}
                className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50"
              >
                <Ionicons name="calendar-outline" size={18} color="#64748b" />
                <Text className="flex-1 ml-2 text-slate-800 text-sm">
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>

              {/* Modal DatePicker Tanggal Selesai */}
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  minimumDate={startDate} // Gak boleh milih tanggal sebelum tanggal mulai
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowEndPicker(false);
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                />
              )}
            </View>
          </View>
        </View>

        {/* Section 2: Alasan / Keterangan */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <Text className="text-slate-800 font-bold mb-4">Keterangan Sakit</Text>
          <View className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 h-32">
            <TextInput
              placeholder="Contoh: Demam tinggi dan flu sejak semalam, butuh istirahat..."
              placeholderTextColor="#cbd5e1"
              multiline
              textAlignVertical="top"
              className="flex-1 text-slate-800 text-sm"
              value={reason}
              onChangeText={setReason}
            />
          </View>
        </View>

        {/* Section 3: Lampiran Surat Dokter */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-800 font-bold">Surat Dokter</Text>
            <Text className="text-red-500 text-xs font-semibold">*Wajib</Text>
          </View>

          {attachment ? (
            // Kalau udah upload
            <View className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <Image source={{ uri: attachment }} className="w-full h-40" resizeMode="cover" />
              <View className="p-3 flex-row justify-between items-center border-t border-slate-200">
                <Text className="text-slate-600 font-medium text-xs flex-1" numberOfLines={1}>
                  Foto_Surat_Terlampir.jpg
                </Text>
                <TouchableOpacity onPress={() => setAttachment(null)} className="ml-2">
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Kalau belum upload
            <TouchableOpacity
              onPress={handlePickDocument}
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 items-center justify-center bg-slate-50"
            >
              <Ionicons name="cloud-upload-outline" size={32} color="#94a3b8" />
              <Text className="text-slate-600 font-semibold mt-2 text-sm">Upload Surat Dokter</Text>
              <Text className="text-slate-400 text-xs mt-1 text-center">Format: JPG atau PNG dari Galeri</Text>
            </TouchableOpacity>
          )}
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
              <Ionicons name="paper-plane-outline" size={20} color="white" />
              <Text className="text-white font-bold ml-2 text-base">Kirim Pengajuan</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}