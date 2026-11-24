import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import ImageViewerModal from "../../components/ImageViewerModal";
import ScreenHeader from "../../components/ScreenHeader";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function PatrolDetailScreen() {
  const { id, patrolId } = useLocalSearchParams();
  const targetPatrolId =
    typeof patrolId === "string" && patrolId.trim().length > 0
      ? patrolId.trim()
      : null;

  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Memuat...");
  const [reportHistory, setReportHistory] = useState<any[]>([]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: locData } = await supabase
        .from("patrol_locations")
        .select("name")
        .eq("id", id)
        .single();

      if (locData) setLocationName(locData.name);

      let query = supabase.from("patrols").select(
        `
          id, 
          userId,
          date,
          checkInTime, 
          status, 
          description,
          patrol_evidence(imageUrl)
        `,
      );

      if (targetPatrolId) {
        // Dibuka dari notifikasi temuan: langsung tarik laporan spesifik tanpa batas tanggal hari ini
        query = query.eq("id", targetPatrolId);
      } else {
        // Dibuka dari menu patroli biasa: tampilkan riwayat pengecekan hari ini
        const now = new Date();
        const todayDateOnly = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        query = query
          .eq("patrolLocationId", id)
          .eq("date", todayDateOnly)
          .order("checkInTime", { ascending: false });
      }

      const { data: reports } = await query;

      if (reports) {
        const userIds = [
          ...new Set(
            reports
              .map((r: any) => r.userId)
              .filter((uid: any) => typeof uid === "string" && uid.length > 0),
          ),
        ];

        const userMap = new Map<
          string,
          { name: string; employeeCode?: string }
        >();
        if (userIds.length > 0) {
          const { data: reporters } = await supabase
            .from("users")
            .select("id, name, employeeCode")
            .in("id", userIds);

          reporters?.forEach((u: any) => {
            userMap.set(u.id, {
              name: u.name || "Petugas",
              employeeCode: u.employeeCode || undefined,
            });
          });
        }

        const formatted = reports.map((r: any) => {
          const reporter = r.userId ? userMap.get(r.userId) : undefined;
          const checkInDate = new Date(r.checkInTime);
          const dateStr = checkInDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const timeStr = checkInDate.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return {
            id: r.id,
            dateText: dateStr,
            time: timeStr,
            reporterName: reporter?.name || "Petugas",
            reporterCode: reporter?.employeeCode || null,
            status: r.status,
            note: r.description || "Tidak ada catatan.",
            photos: Array.isArray(r.patrol_evidence)
              ? r.patrol_evidence.map((e: any) => e.imageUrl)
              : [],
          };
        });
        setReportHistory(formatted);
      }
      setLoading(false);
    };

    fetchData();
  }, [id, targetPatrolId]);

  return (
    <View className="flex-1 bg-sky-50 pt-12">
      <ScreenHeader title="Detail Laporan" />

      <ScrollView
        className="flex-1 px-5 pt-2"
        contentContainerStyle={{ paddingBottom: 80 }}
      >
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
          {targetPatrolId
            ? "Detail Laporan Temuan"
            : `Riwayat Pengecekan Hari Ini (${reportHistory.length})`}
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : reportHistory.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm border border-slate-100">
            <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="folder-open-outline" size={40} color="#cbd5e1" />
            </View>
            <Text className="text-slate-700 text-lg font-bold text-center">
              {targetPatrolId
                ? "Laporan Temuan Tidak Ditemukan"
                : "Belum Ada Laporan Hari Ini"}
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
                <View className="flex-row justify-between items-start mb-3 border-b border-slate-100 pb-3">
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={18} color="#64748b" />
                      <Text className="text-slate-600 font-semibold ml-2">
                        {targetPatrolId
                          ? `${report.dateText} • ${report.time} WIB`
                          : `${report.time} WIB`}
                      </Text>
                    </View>
                    <View className="flex-row items-center mt-1.5">
                      <Ionicons
                        name="person-circle-outline"
                        size={18}
                        color="#3b82f6"
                      />
                      <Text
                        className="text-slate-700 text-sm font-semibold ml-2 flex-1"
                        numberOfLines={1}
                      >
                        {report.reporterName}
                        {report.reporterCode ? ` (${report.reporterCode})` : ""}
                      </Text>
                    </View>
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
                      className="w-32 h-32 bg-slate-100 rounded-xl mr-3 items-center justify-center border border-slate-200 overflow-hidden"
                    >
                      {photo ? (
                        <ExpoImage
                          source={{ uri: photo }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <>
                          <Ionicons name="image" size={28} color="#94a3b8" />
                          <Text className="text-slate-400 text-[10px] mt-2">
                            Bukti {index + 1}
                          </Text>
                        </>
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

      {/* MODAL PREVIEW GAMBAR FULLSCREEN (DENGAN PINCH-TO-ZOOM & TAP BACKDROP TO CLOSE) */}
      <ImageViewerModal
        visible={!!selectedImage}
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </View>
  );
}
