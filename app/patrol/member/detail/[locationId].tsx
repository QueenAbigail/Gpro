import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../../lib/supabase"; // 💡 Keluar 4 tingkat

export default function MemberLocationDetailScreen() {
  const router = useRouter();

  // Tangkap locationId, userId, dan userName
  const { locationId, userId, userName } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Memuat...");
  const [reportHistory, setReportHistory] = useState<any[]>([]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecificReports = async () => {
      if (!locationId || !userId) return;
      setLoading(true);

      // 1. Ambil Nama Lokasinya
      const { data: locData } = await supabase
        .from("patrol_locations")
        .select("name")
        .eq("id", locationId)
        .single();

      if (locData) setLocationName(locData.name);

      const todayDateOnly = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

      // 2. Tarik Laporan yang memfilter userId DAN patrolLocationId
      const { data: reports, error } = await supabase
        .from("patrols")
        .select(
          `
          id, 
          checkInTime, 
          status, 
          description,
          patrol_evidence ( imageUrl )
        `,
        )
        .eq("userId", userId) // 💡 Kunci 1: Hanya punya si Mobile Test
        .eq("patrolLocationId", locationId) // 💡 Kunci 2: Hanya di Head Office
        .eq("date", todayDateOnly)
        .order("checkInTime", { ascending: false });

      if (reports) {
        const formatted = reports.map((r: any) => {
          return {
            id: r.id,
            time: new Date(r.checkInTime).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            status: r.status,
            note: r.description || "Tidak ada catatan.",
            photos: r.patrol_evidence
              ? r.patrol_evidence.map((e: any) => e.imageUrl)
              : [],
          };
        });
        setReportHistory(formatted);
      }

      if (error) console.error("Error fetch laporan spesifik:", error);
      setLoading(false);
    };

    fetchSpecificReports();
  }, [locationId, userId]);

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1 pt-12 px-5"
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
          >
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">
            Detail Pengecekan
          </Text>
        </View>

        {/* INFO LOKASI & NAMA ORANGNYA */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
              <Ionicons name="location" size={16} color="#3b82f6" />
            </View>
            <Text className="text-lg font-bold text-slate-800">
              {locationName}
            </Text>
          </View>
          <Text className="text-slate-500 text-sm ml-11">
            Dilaporkan oleh:{" "}
            <Text className="font-bold text-slate-700">{userName}</Text>
          </Text>
        </View>

        <Text className="text-slate-800 text-base font-bold mb-4 ml-1">
          Riwayat Hari Ini ({reportHistory.length})
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : reportHistory.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm border border-slate-100">
            <Text className="text-slate-400 text-sm text-center">
              Belum ada laporan spesifik.
            </Text>
          </View>
        ) : (
          reportHistory.map((report) => {
            const isSafe = report.status === "COMPLETED";

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
                      {isSafe ? "Aman" : "Ada Temuan"}
                    </Text>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {report.photos.map((photo: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
                      onPress={() => setSelectedImage(photo)}
                      className="w-32 h-32 bg-slate-100 rounded-xl mr-3 overflow-hidden border border-slate-200"
                    >
                      {photo ? (
                        <Image
                          source={{ uri: photo }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <Ionicons name="image" size={28} color="#94a3b8" />
                          <Text className="text-slate-400 text-[10px] mt-2">
                            Bukti {index + 1}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text className="text-slate-500 text-sm leading-relaxed">
                  <Text className="font-semibold text-slate-700">
                    Catatan:{" "}
                  </Text>
                  {report.note}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL ZOOM GAMBAR */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View className="flex-1 bg-slate-900/70 justify-center items-center">
          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            className="absolute top-12 right-5 w-10 h-10 bg-white/20 rounded-full items-center justify-center z-50 border border-white/30"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              className="w-full h-3/4"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
