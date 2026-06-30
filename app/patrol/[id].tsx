import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function PatrolDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Memuat...");
  const [reportHistory, setReportHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // 1. Ambil Nama Lokasi
      const { data: locData } = await supabase
        .from("patrol_locations")
        .select("name")
        .eq("id", id)
        .single();

      if (locData) setLocationName(locData.name);

      // 2. Ambil Laporan + Bukti Fotonya
      // Asumsi: patrol_evidence punya FK 'patrolId' ke tabel 'patrols'
      const { data: reports } = await supabase
        .from("patrols")
        .select(
          `
          id, 
          createdAt, 
          status, 
          note,
          patrol_evidence(imageUrl)
        `,
        )
        .eq("locationId", id)
        .order("createdAt", { ascending: false });

      if (reports) {
        const formatted = reports.map((r) => ({
          id: r.id,
          time: new Date(r.createdAt).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: r.status,
          note: r.note,
          photos: r.patrol_evidence.map((e) => e.imageUrl),
        }));
        setReportHistory(formatted);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

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
            {locationName}
          </Text>
        </View>
      </View>

      <Text className="text-slate-800 text-base font-bold mb-4 ml-1">
        Riwayat Pengecekan ({reportHistory.length})
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color="#3b82f6" />
      ) : reportHistory.length === 0 ? (
        <View className="bg-white rounded-2xl p-8 items-center shadow-sm border border-slate-100">
          <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-4">
            <Ionicons name="folder-open-outline" size={40} color="#cbd5e1" />
          </View>
          <Text className="text-slate-700 text-lg font-bold">
            Belum Ada Laporan
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

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                {report.photos.map((photo: string, index: number) => (
                  <View
                    key={index}
                    className="w-32 h-32 bg-slate-100 rounded-xl mr-3 items-center justify-center border border-slate-200"
                  >
                    <Ionicons name="image" size={28} color="#94a3b8" />
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
