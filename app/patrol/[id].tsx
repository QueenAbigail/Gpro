import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function PatrolDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const locationInfo = {
    name: `Pos Titik Patroli #${id}`,
    targetTime: "08:00 WIB",
  };

  const isEmpty = id === "3" || id === "4" || id === "5";

  // Perhatikan dummy data di bawah ini, aku tambahin array "photos"
  const reportHistory = isEmpty
    ? []
    : [
        {
          id: 1,
          time: "08:15",
          status: "Aman",
          note: "Gerbang terkunci rapat, gembok lengkap, area sekitar bersih.",
          photos: ["foto_gerbang_1.jpg", "foto_gembok_2.jpg"], // Contoh 2 foto
        },
        {
          id: 2,
          time: "14:30",
          status: "Temuan",
          note: "Lampu sorot pos mati satu, tolong sampaikan ke tim maintenance. Sisi kanan pos juga ada coretan.",
          photos: [
            "foto_lampu_mati.jpg",
            "foto_coretan_1.jpg",
            "foto_coretan_2.jpg",
          ], // Contoh 3 foto
        },
      ];

  return (
    <ScrollView
      className="flex-1 bg-slate-50 pt-12 px-5"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Detail Laporan</Text>
      </View>

      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
        <View className="flex-row items-center mb-2">
          <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
            <Ionicons name="location" size={16} color="#3b82f6" />
          </View>
          <Text className="text-lg font-bold text-slate-800">
            {locationInfo.name}
          </Text>
        </View>
        <Text className="text-slate-500 text-sm ml-11">
          Target Pengecekan: {locationInfo.targetTime}
        </Text>
      </View>

      <Text className="text-slate-800 text-base font-bold mb-4 ml-1">
        Riwayat Pengecekan ({reportHistory.length})
      </Text>

      {reportHistory.length === 0 ? (
        <View className="bg-white rounded-2xl p-8 items-center justify-center shadow-sm border border-slate-100">
          <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-4">
            <Ionicons name="folder-open-outline" size={40} color="#cbd5e1" />
          </View>
          <Text className="text-slate-700 text-lg font-bold mb-2">
            Belum Ada Laporan
          </Text>
          <Text className="text-slate-500 text-sm text-center leading-relaxed">
            Titik patroli ini belum dicek oleh petugas.
          </Text>
        </View>
      ) : (
        reportHistory.map((report) => {
          const isSafe = report.status === "Aman";

          return (
            <View
              key={report.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4"
            >
              <View className="flex-row justify-between items-center mb-3 border-b border-slate-100 pb-3">
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={18} color="#64748b" />
                  <Text className="text-slate-600 font-semibold ml-2">
                    {report.time} WIB
                  </Text>
                </View>

                <View
                  className={`px-3 py-1 rounded-full flex-row items-center ${isSafe ? "bg-green-50" : "bg-red-50"}`}
                >
                  <Ionicons
                    name={isSafe ? "checkmark-circle" : "warning"}
                    size={14}
                    color={isSafe ? "#16a34a" : "#dc2626"}
                  />
                  <Text
                    className={`text-xs font-bold ml-1 ${isSafe ? "text-green-600" : "text-red-600"}`}
                  >
                    {report.status}
                  </Text>
                </View>
              </View>

              {/* Tampilan Banyak Foto (Horizontal Scroll) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                {report.photos.map((photo, index) => (
                  <View
                    key={index}
                    className="w-32 h-32 bg-slate-100 rounded-xl mr-3 items-center justify-center border border-slate-200"
                  >
                    <Ionicons name="image-outline" size={28} color="#94a3b8" />
                    <Text className="text-slate-400 text-[10px] mt-2">
                      Bukti {index + 1}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <Text className="text-slate-500 text-sm leading-relaxed">
                <Text className="font-semibold text-slate-700">Catatan: </Text>
                {report.note}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
