import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

export default function PengajuanSakitScreen() {
  const router = useRouter();

  // State untuk nyimpen inputan form
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock function buat upload surat dokter
  const handlePickDocument = () => {
    // Nanti di sini pakai expo-image-picker atau expo-document-picker
    // Untuk sekarang kita set dummy image/status dulu
    setAttachment("surat_dokter_dummy.jpg");
    alert("Buka galeri/kamera untuk foto Surat Dokter...");
  };

  const handleSubmit = () => {
    if (!startDate || !endDate || !reason) {
      alert("Mohon lengkapi tanggal dan alasan sakit!");
      return;
    }

    setIsLoading(true);

    // Simulasi kirim data ke API/Supabase
    setTimeout(() => {
      setIsLoading(false);
      alert(
        "Pengajuan sakit berhasil dikirim dan sedang menunggu persetujuan HRD.",
      );
      router.back();
    }, 2000);
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
          <Text className="text-xl font-bold text-slate-800">
            Pengajuan Sakit
          </Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            Isi form & lampirkan surat dokter
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Section 1: Tanggal Sakit */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <Text className="text-slate-800 font-bold mb-4">Rentang Waktu</Text>

          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-slate-500 text-xs font-semibold mb-2">
                Tanggal Mulai
              </Text>
              <TouchableOpacity className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50">
                <Ionicons name="calendar-outline" size={18} color="#64748b" />
                <TextInput
                  placeholder="Pilih Tanggal"
                  className="flex-1 ml-2 text-slate-800 text-sm"
                  value={startDate}
                  onChangeText={setStartDate}
                  // Nanti bisa diganti pakai modal DatePicker sungguhan
                />
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-slate-500 text-xs font-semibold mb-2">
                Tanggal Selesai
              </Text>
              <TouchableOpacity className="flex-row items-center border border-slate-200 rounded-xl px-3 py-3 bg-slate-50">
                <Ionicons name="calendar-outline" size={18} color="#64748b" />
                <TextInput
                  placeholder="Pilih Tanggal"
                  className="flex-1 ml-2 text-slate-800 text-sm"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 2: Alasan / Keterangan */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <Text className="text-slate-800 font-bold mb-4">
            Keterangan Sakit
          </Text>
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
            <View className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="document-text" size={24} color="#3b82f6" />
                <Text className="text-slate-700 ml-3 font-medium text-sm">
                  surat_keterangan.jpg
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAttachment(null)}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            // Kalau belum upload
            <TouchableOpacity
              onPress={handlePickDocument}
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 items-center justify-center bg-slate-50"
            >
              <Ionicons name="cloud-upload-outline" size={32} color="#94a3b8" />
              <Text className="text-slate-600 font-semibold mt-2 text-sm">
                Upload Surat Dokter
              </Text>
              <Text className="text-slate-400 text-xs mt-1 text-center">
                Format: JPG, PNG, atau PDF (Maks. 5MB)
              </Text>
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
              <Text className="text-white font-bold ml-2 text-base">
                Kirim Pengajuan
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
