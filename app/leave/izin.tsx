import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function PengajuanIzinScreen() {
  const router = useRouter();

  // State untuk form
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock function buat download template
  const handleDownloadTemplate = () => {
    // Nanti di sini logic buat download PDF dari Supabase Storage / URL
    alert("Mendownload template Form Pengajuan Izin (PDF)...");
  };

  // Mock function buat upload dokumen yang udah ditandatangani
  const handlePickDocument = () => {
    setAttachment("form_izin_ttd_atasan.jpg");
    alert(
      "Buka galeri/kamera untuk foto Form Izin yang sudah ditandatangani...",
    );
  };

  const handleSubmit = () => {
    // Validasi: Sekarang dokumen form wajib diupload
    if (!startDate || !endDate || !reason || !attachment) {
      alert(
        "Mohon lengkapi rentang waktu, keterangan, dan upload Form Izin yang sudah ditandatangani!",
      );
      return;
    }

    setIsLoading(true);

    // Simulasi kirim ke database
    setTimeout(() => {
      setIsLoading(false);
      alert(
        "Pengajuan izin berhasil dikirim dan sedang menunggu persetujuan HRD.",
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
            Pengajuan Izin
          </Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            Isi form & upload dokumen persetujuan
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Section 1: Rentang Waktu */}
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
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-800 font-bold">Keterangan Izin</Text>
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

        {/* Section 3: Dokumen Form Izin */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-8">
          <Text className="text-slate-800 font-bold mb-3">
            Dokumen Pengajuan
          </Text>

          {/* Banner Download Template */}
          <View className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-blue-800 font-semibold text-sm mb-1">
                Form Pengajuan Izin
              </Text>
              <Text className="text-blue-600 text-xs leading-relaxed">
                Download template ini jika kamu belum punya form fisik untuk
                ditandatangani atasan.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDownloadTemplate}
              className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center shadow-sm"
            >
              <Ionicons name="download-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Area Upload Dokumen TTD */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-700 font-semibold text-sm">
              Upload Form Bertanda Tangan
            </Text>
            <Text className="text-red-500 text-xs font-semibold">*Wajib</Text>
          </View>

          {attachment ? (
            <View className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="document-text" size={24} color="#f59e0b" />
                <Text className="text-slate-700 ml-3 font-medium text-sm">
                  form_izin_ttd_atasan.jpg
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAttachment(null)}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handlePickDocument}
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 items-center justify-center bg-slate-50"
            >
              <Ionicons name="cloud-upload-outline" size={32} color="#94a3b8" />
              <Text className="text-slate-600 font-semibold mt-2 text-sm text-center">
                Upload Foto/Scan Form Izin
              </Text>
              <Text className="text-slate-400 text-xs mt-1 text-center px-4">
                Pastikan form sudah ditandatangani oleh atasan di site.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tombol Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl items-center flex-row justify-center mb-4 ${
            isLoading ? "bg-amber-400" : "bg-amber-500 active:bg-amber-600"
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
