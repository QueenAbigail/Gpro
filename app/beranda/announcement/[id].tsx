import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";

// Dummy Database Pengumuman
const DUMMY_ANNOUNCEMENTS: Record<string, any> = {
  "1": {
    title: "Pembaruan SOP Kehadiran Karyawan Lapangan",
    date: "28 Juli 2026",
    sender: "HRD Pusat",
    body: "Diberitahukan kepada seluruh karyawan lapangan, mulai tanggal 1 Agustus 2026, terdapat pembaruan Standar Operasional Prosedur (SOP) mengenai radius maksimal saat melakukan absen masuk maupun absen pulang.\n\nHarap membaca dokumen lampiran dengan seksama agar tidak terjadi kendala absensi di bulan mendatang. Terima kasih.",
    attachment: "SOP_Absensi_V2.pdf",
  },
  "2": {
    title: "Jadwal Pemeliharaan Sistem HRIS",
    date: "25 Juli 2026",
    sender: "IT Support",
    body: "Sistem HRIS akan mengalami pemeliharaan (maintenance) rutin pada hari Sabtu, 1 Agustus 2026 pukul 00:00 s.d 04:00 WIB. Selama waktu tersebut, aplikasi absen tidak dapat digunakan.\n\nJika ada yang bertugas pada jam tersebut, silakan lapor secara manual ke atasan.",
    attachment: null,
  },
  "3": {
    title: "Pemberitahuan Libur Cuti Bersama",
    date: "20 Juli 2026",
    sender: "HRD Pusat",
    body: "Mengacu pada SKB 3 Menteri terbaru, kami informasikan bahwa hari Jumat tanggal 17 Agustus akan ditetapkan sebagai hari libur cuti bersama.\n\nUntuk tim operasional yang diwajibkan masuk, perhitungan upah akan mengikuti skema lembur hari libur nasional.",
    attachment: "SK_Cuti_Bersama_2026.pdf",
  },
};

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Ambil data dummy berdasarkan ID
  const detail = DUMMY_ANNOUNCEMENTS[id as string];

  if (!detail) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500 font-medium">Pengumuman tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-4 py-2 bg-sky-500 rounded-lg">
          <Text className="text-white font-bold">Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDownloadAttachment = () => {
    // Karena ini masih UI dummy, kita munculkan Alert saja.
    Alert.alert("Unduh Berhasil", `File ${detail.attachment} mulai diunduh.`);
  };

  return (
    <View className="flex-1 bg-white pt-12">
      {/* Custom Header */}
      <View className="flex-row items-center px-5 mb-4 border-b border-gray-100 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-4"
        >
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-extrabold text-gray-900 flex-1">
          Detail Pengumuman
        </Text>
      </View>

      <ScrollView 
         className="flex-1 pt-14 px-5" 
         showsVerticalScrollIndicator={false}
        >
        {/* Title & Meta */}
        <View className="mb-6">
          <Text className="text-2xl font-black text-gray-900 mb-3 leading-tight">
            {detail.title}
          </Text>
          <View className="flex-row items-center">
            <View className="flex-row items-center bg-sky-50 px-3 py-1.5 rounded-full mr-3">
              <Ionicons name="person" size={12} color="#0284c7" />
              <Text className="text-sky-700 text-xs font-bold ml-1">{detail.sender}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
              <Text className="text-gray-500 text-xs font-medium ml-1">{detail.date}</Text>
            </View>
          </View>
        </View>

        {/* Garis Pemisah */}
        <View className="h-[1px] w-full bg-gray-100 mb-6" />

        {/* Isi Body */}
        <Text className="text-gray-700 text-base leading-relaxed mb-8">
          {detail.body}
        </Text>

        {/* Attachment Card */}
        {detail.attachment && (
          <View className="mb-8">
            <Text className="text-sm font-bold text-gray-900 mb-3">Lampiran ({detail.attachment.split('.').pop()?.toUpperCase()})</Text>
            <TouchableOpacity 
              onPress={handleDownloadAttachment}
              className="flex-row items-center bg-gray-50 border border-gray-200 p-4 rounded-2xl"
            >
              <View className="w-10 h-10 bg-red-100 rounded-lg items-center justify-center mr-4">
                <Ionicons name="document-text" size={20} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-sm mb-0.5" numberOfLines={1}>
                  {detail.attachment}
                </Text>
                <Text className="text-gray-400 text-xs">Klik untuk mengunduh berkas</Text>
              </View>
              <Ionicons name="download-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}