import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ScreenHeader from "../../../components/ScreenHeader";
import { supabase } from "../../../lib/supabase"; // Sesuaikan dengan path lib/supabase kamu

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  const fetchAnnouncementDetail = useCallback(async () => {
    const announcementId = Array.isArray(id) ? id[0] : id;
    if (!announcementId) return;

    try {
      setLoading(true);

      // 1. Fetch data pengumuman
      const { data: announcementData, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", announcementId)
        .single();

      if (error) throw error;

      let creatorName = "Admin HRIS";
      let creatorRole = "HRD Pusat";

      // 2. Fetch nama & posisi pembuat dari tabel users berdasarkan createdBy (userId)
      if (announcementData?.createdBy) {
        const { data: userData } = await supabase
          .from("users")
          .select("name, role, position") // 👈 Ambil name, role, dan position
          .eq("id", announcementData.createdBy)
          .maybeSingle();

        if (userData) {
          if (userData.name) creatorName = userData.name;
          // Utamakan field position jika ada, kalau kosong pakai role
          creatorRole = userData.position || userData.role || "Admin";
        }
      }

      // 3. Gabungkan data
      setDetail({
        ...announcementData,
        creatorName,
        creatorRole,
      });

      // 4. Sinkronisasi status baca (announcement_read_statuses) secara otomatis
      // Berguna terutama saat dibuka langsung lewat Deep Link Notifikasi (tanpa lewat Beranda)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: existingRead } = await supabase
            .from("announcement_read_statuses")
            .select("announcementId")
            .eq("announcementId", announcementId)
            .eq("userId", user.id)
            .maybeSingle();

          if (!existingRead) {
            await supabase.from("announcement_read_statuses").insert({
              announcementId: announcementId,
              userId: user.id,
              readAt: new Date().toISOString(),
            });
          }
        }
      } catch (readSyncErr) {
        console.error(
          "Gagal sinkronisasi status baca pengumuman:",
          readSyncErr,
        );
      }
    } catch (error) {
      console.error("Gagal mengambil detail pengumuman:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAnnouncementDetail();
    }
  }, [id, fetchAnnouncementDetail]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleDownloadAttachment = async () => {
    if (!detail?.attachmentUrl) return;

    try {
      const supported = await Linking.canOpenURL(detail.attachmentUrl);
      if (supported) {
        await Linking.openURL(detail.attachmentUrl);
      } else {
        Alert.alert(
          "Gagal Membuka File",
          "URL lampiran tidak valid atau tidak bisa dibuka.",
        );
      }
    } catch {
      Alert.alert("Error", "Terjadi kendala saat mencoba mengunduh berkas.");
    }
  };

  const fileName = detail?.attachmentUrl
    ? detail.attachmentUrl.split("/").pop()?.split("?")[0] || "Lampiran_Dokumen"
    : null;
  const fileExtension = fileName
    ? fileName.split(".").pop()?.toUpperCase() || "FILE"
    : "";

  return (
    <View className="flex-1 bg-sky-50 pt-12">
      <ScreenHeader title="Detail Pengumuman" />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0284c7" />
          <Text className="text-gray-400 text-xs mt-3 font-medium">
            Memuat pengumuman...
          </Text>
        </View>
      ) : !detail ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-3xl bg-sky-100/80 items-center justify-center mb-3">
            <Ionicons name="document-text-outline" size={30} color="#0284c7" />
          </View>
          <Text className="text-gray-800 font-bold text-base mb-1">
            Pengumuman Tidak Ditemukan
          </Text>
          <Text className="text-gray-400 text-xs text-center max-w-[240px]">
            Data pengumuman ini mungkin telah dihapus atau kedaluwarsa.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-2"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Kartu Utama Pengumuman */}
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
            {/* 1. Judul Pengumuman */}
            <Text className="text-xl font-extrabold text-gray-900 leading-tight mb-1.5">
              {detail.title}
            </Text>

            {/* 2. Tanggal di Bawah Judul */}
            <View className="flex-row items-center mb-3.5">
              <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
              <Text className="text-xs text-gray-400 font-medium ml-1.5">
                {formatDate(detail.createdAt)}
              </Text>
            </View>

            {/* 3. Info Pengirim Ringkas & Ideal */}
            <View className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100 flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1 mr-2">
                <Text className="text-xs text-gray-400 font-medium mr-1.5">
                  Pengirim:
                </Text>
                <Text
                  className="text-xs font-bold text-gray-900 flex-1 truncate"
                  numberOfLines={1}
                >
                  {detail.creatorName}
                </Text>
              </View>
              <View className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                <Text className="text-[11px] font-bold text-blue-700">
                  {detail.creatorRole}
                </Text>
              </View>
            </View>

            {/* 4. Lampiran Berkas di Atas (Hanya jika ada) */}
            {detail.attachmentUrl && (
              <View className="mb-4">
                <TouchableOpacity
                  onPress={handleDownloadAttachment}
                  activeOpacity={0.8}
                  className="bg-amber-50/60 rounded-2xl p-3 border border-amber-200/80 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className="w-8 h-8 rounded-lg bg-red-100 items-center justify-center mr-2.5">
                      <Text className="text-red-600 font-bold text-[10px]">
                        {fileExtension}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-xs font-bold text-gray-900"
                        numberOfLines={1}
                      >
                        {fileName}
                      </Text>
                      <Text className="text-[10px] text-gray-400">
                        Berkas Pendukung
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-blue-600">
                    Unduh ↗
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Garis Pemisah Halus */}
            <View className="h-[1px] bg-gray-100 w-full mb-4" />

            {/* 5. Isi Asli Pengumuman */}
            <Text className="text-gray-800 text-sm leading-relaxed">
              {detail.body}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
