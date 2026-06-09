import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function LeaveHistoryScreen() {
  const router = useRouter();

  // Dummy data yang lebih banyak untuk halaman riwayat lengkap
  const fullHistory = [
    {
      id: "1",
      type: "Sakit",
      date: "9 Juni 2026",
      duration: "1 Hari",
      status: "Pending",
      reason: "Demam dan flu",
    },
    {
      id: "2",
      type: "Tukeran Shift",
      date: "12 Juni 2026",
      duration: "Pagi ke Malam",
      status: "Disetujui",
      reason: "Ada acara keluarga",
    },
    {
      id: "3",
      type: "Izin",
      date: "15 Mei 2026",
      duration: "1 Hari",
      status: "Ditolak",
      reason: "Keperluan mendadak",
    },
    {
      id: "4",
      type: "Sakit",
      date: "10 April 2026",
      duration: "2 Hari",
      status: "Disetujui",
      reason: "Gejala tifus, butuh istirahat",
    },
    {
      id: "5",
      type: "Izin",
      date: "22 Maret 2026",
      duration: "1 Hari",
      status: "Disetujui",
      reason: "Perpanjang STNK di Samsat",
    },
    {
      id: "6",
      type: "Tukeran Shift",
      date: "05 Februari 2026",
      duration: "Malam ke Pagi",
      status: "Disetujui",
      reason: "Kondisi badan kurang fit untuk begadang",
    },
  ];

  // Helper untuk styling warna status
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Disetujui":
        return { text: "text-emerald-600", bg: "bg-emerald-100" };
      case "Pending":
        return { text: "text-amber-600", bg: "bg-amber-100" };
      case "Ditolak":
        return { text: "text-red-600", bg: "bg-red-100" };
      default:
        return { text: "text-slate-600", bg: "bg-slate-100" };
    }
  };

  // Helper untuk icon berdasarkan tipe pengajuan
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Sakit":
        return "medkit";
      case "Tukeran Shift":
        return "swap-horizontal";
      case "Izin":
        return "document-text";
      default:
        return "document-text";
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
          <Text className="text-xl font-bold text-slate-800">
            Riwayat Pengajuan
          </Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            Seluruh data sakit, izin, & tukar shift
          </Text>
        </View>
      </View>

      {/* List History Full */}
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {fullHistory.map((item) => {
          const statusStyle = getStatusStyle(item.status);
          return (
            <TouchableOpacity
              key={item.id}
              className="bg-white p-4 rounded-2xl mb-4 border border-slate-100 shadow-sm flex-row items-center active:bg-slate-50"
            >
              <View className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center mr-4">
                <Ionicons
                  name={getTypeIcon(item.type) as any}
                  size={24}
                  color="#64748b"
                />
              </View>

              <View className="flex-1">
                <Text className="text-slate-800 font-bold mb-1">
                  {item.type}
                </Text>
                <Text className="text-slate-500 text-xs mb-1">
                  {item.date} • {item.duration}
                </Text>
                <Text
                  className="text-slate-400 text-xs truncate"
                  numberOfLines={1}
                >
                  "{item.reason}"
                </Text>
              </View>

              <View className={`px-3 py-1.5 rounded-full ${statusStyle.bg}`}>
                <Text
                  className={`text-[10px] font-bold uppercase ${statusStyle.text}`}
                >
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
