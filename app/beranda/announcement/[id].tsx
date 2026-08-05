import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase"; // Sesuaikan dengan path lib/supabase kamu

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchAnnouncementDetail();
    }
  }, [id]);

  const fetchAnnouncementDetail = async () => {
    try {
      setLoading(true);

      // 1. Fetch data pengumuman
      const { data: announcementData, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", id)
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

    } catch (error) {
      console.error("Gagal mengambil detail pengumuman:", error);
    } finally {
      setLoading(false);
    }
  };

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
        Alert.alert("Gagal Membuka File", "URL lampiran tidak valid atau tidak bisa dibuka.");
      }
    } catch (error) {
      Alert.alert("Error", "Terjadi kendala saat mencoba mengunduh berkas.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

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

  const fileName = detail.attachmentUrl
    ? detail.attachmentUrl.split("/").pop()?.split("?")[0] || "Lampiran_Dokumen"
    : null;
  const fileExtension = fileName
    ? fileName.split(".").pop()?.toUpperCase() || "FILE"
    : "";

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
        className="flex-1 px-5 pt-2" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Title & Meta */}
        <View className="mb-6">
          <Text className="text-2xl font-black text-gray-900 mb-3 leading-tight">
            {detail.title}
          </Text>

          {/* Badge Nama, Jabatan, & Tanggal */}
          <View className="flex-row items-center flex-wrap gap-2">
            {/* Badge Nama */}
            <View className="flex-row items-center bg-sky-50 px-3 py-1.5 rounded-full">
              <Ionicons name="person" size={12} color="#0284c7" />
              <Text className="text-sky-700 text-xs font-bold ml-1">
                {detail.creatorName}
              </Text>
            </View>

            {/* 💼 Badge Posisi / Jabatan (Baru Ditambahkan) */}
            <View className="flex-row items-center bg-indigo-50 px-3 py-1.5 rounded-full">
              <Ionicons name="briefcase" size={12} color="#6366f1" />
              <Text className="text-indigo-700 text-xs font-bold ml-1">
                {detail.creatorRole}
              </Text>
            </View>

            {/* Badge Tanggal */}
            <View className="flex-row items-center ml-1">
              <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
              <Text className="text-gray-500 text-xs font-medium ml-1">
                {formatDate(detail.createdAt)}
              </Text>
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
        {detail.attachmentUrl && (
          <View className="mb-8">
            <Text className="text-sm font-bold text-gray-900 mb-3">
              Lampiran ({fileExtension})
            </Text>
            <TouchableOpacity 
              onPress={handleDownloadAttachment}
              className="flex-row items-center bg-gray-50 border border-gray-200 p-4 rounded-2xl"
            >
              <View className="w-10 h-10 bg-red-100 rounded-lg items-center justify-center mr-4">
                <Ionicons name="document-text" size={20} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-sm mb-0.5" numberOfLines={1}>
                  {fileName}
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