import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase"; // Path disesuaikan (keluar 3 tingkat)

export default function MemberPatrolDetailScreen() {
  const router = useRouter();

  // Tangkap data dari lembaran router.push halaman list kemarin
  const { id, name, role, reported, remaining } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [reportHistory, setReportHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!id) return;
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Filter patroli khusus hari ini saja

      // Query laporan patroli berdasarkan USER ID si anggota
      const { data: reports, error } = await supabase
        .from("patrols")
        .select(
          `
          id, 
          createdAt, 
          status, 
          note,
          patrol_locations ( name, code ),
          patrol_evidence ( imageUrl )
        `,
        )
        .eq("userId", id)
        .gte("createdAt", today.toISOString())
        .order("createdAt", { ascending: false });

      if (reports) {
        const formatted = reports.map((r: any) => ({
          id: r.id,
          time: new Date(r.createdAt).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: r.status,
          note: r.note,
          locationName: r.patrol_locations?.name || "Titik Tidak Diketahui",
          locationCode: r.patrol_locations?.code || "-",
          photos: r.patrol_evidence
            ? r.patrol_evidence.map((e: any) => e.imageUrl)
            : [],
        }));
        setReportHistory(formatted);
      }

      if (error) console.error("Error fetch log patroli anggota:", error);
      setLoading(false);
    };

    fetchMemberData();
  }, [id]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50 pt-12 px-5"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* HEADER */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">
          Live Progress Patroli
        </Text>
      </View>

      {/* CARD UTAMA: IDENTITAS ANGGOTA (Bukan Nama Lokasi tunggal lagi) */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
            <Ionicons name="person" size={18} color="#3b82f6" />
          </View>
          <View>
            <Text className="text-lg font-bold text-slate-800">{name}</Text>
            <Text className="text-slate-400 text-xs">{role}</Text>
          </View>
        </View>
        <View className="flex-row justify-between border-t border-slate-100 pt-3">
          <Text className="text-slate-500 text-xs font-medium">
            Selesai:{" "}
            <Text className="text-slate-900 font-bold">{reported} Titik</Text>
          </Text>
          <Text className="text-slate-500 text-xs font-medium">
            Sisa:{" "}
            <Text className="text-slate-900 font-bold">{remaining} Titik</Text>
          </Text>
        </View>
      </View>

      <Text className="text-slate-800 text-base font-bold mb-4 ml-1">
        Riwayat Checkpoint Hari Ini ({reportHistory.length})
      </Text>

      {/* RENDER LIST LOG PATROLI */}
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
              {/* Baris Atas: Jam & Status */}
              <View className="flex-row justify-between items-center mb-2 border-b border-slate-100 pb-3">
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

              {/* Info Lokasi Yang Dikunjungi */}
              <View className="flex-row items-center mb-3">
                <Ionicons name="location-outline" size={14} color="#3b82f6" />
                <Text className="text-slate-800 font-bold text-sm ml-1">
                  {report.locationName}{" "}
                  <Text className="text-slate-400 font-normal text-xs">
                    ({report.locationCode})
                  </Text>
                </Text>
              </View>

              {/* Bukti Foto Horizontal */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                {report.photos.map((photo: string, index: number) => (
                  <View
                    key={index}
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
                  </View>
                ))}
              </ScrollView>

              {/* Catatan Temuan */}
              <Text className="text-slate-500 text-sm leading-relaxed">
                <Text className="font-semibold text-slate-700">Catatan: </Text>
                {report.note || "Tidak ada catatan."}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
