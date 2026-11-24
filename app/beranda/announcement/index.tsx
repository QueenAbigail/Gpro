import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ScreenHeader from "../../../components/ScreenHeader";
import { supabase } from "../../../lib/supabase";

interface AnnouncementItem {
  id: string;
  title: string;
  body?: string;
  attachmentUrl?: string | null;
  createdBy?: string | null;
  createdAt: string;
  creatorName?: string;
}

export default function AnnouncementListScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchAnnouncements = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // 1. Fetch pengumuman aktif, urutkan dari yang terbaru
      const { data: rawAnnouncements, error: annError } = await supabase
        .from("announcements")
        .select("*")
        .eq("isActive", true)
        .order("createdAt", { ascending: false });

      if (annError) throw annError;

      // 2. Fetch status baca user
      const { data: readData, error: readError } = await supabase
        .from("announcement_read_statuses")
        .select("announcementId")
        .eq("userId", user.id);

      if (readError) console.error("Error fetching read status:", readError);

      const readSet = new Set<string>(
        (readData || []).map((r: { announcementId: string }) => r.announcementId),
      );
      setReadIds(readSet);

      // 3. Fetch profil pembuat (creator) pengumuman
      const creatorIds = Array.from(
        new Set(
          (rawAnnouncements || [])
            .map((item: any) => item.createdBy)
            .filter(Boolean),
        ),
      );

      const creatorMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name, role, position")
          .in("id", creatorIds);

        if (usersData) {
          usersData.forEach((u: any) => {
            creatorMap[u.id] = u.position || u.role || u.name || "Admin HRIS";
          });
        }
      }

      // 4. Format data lengkap
      const formatted: AnnouncementItem[] = (rawAnnouncements || []).map(
        (item: any) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          attachmentUrl: item.attachmentUrl,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
          creatorName:
            (item.createdBy && creatorMap[item.createdBy]) || "Admin HRIS",
        }),
      );

      setAnnouncements(formatted);
    } catch (error) {
      console.error("Gagal mengambil data pengumuman:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const handleOpenAnnouncement = async (id: string, isRead: boolean) => {
    // Tandai langsung di UI agar instan
    if (!isRead) {
      setReadIds((prev) => new Set([...prev, id]));
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("announcement_read_statuses").insert({
            announcementId: id,
            userId: user.id,
            readAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Gagal update status baca pengumuman:", err);
      }
    }
    router.push(`/beranda/announcement/${id}` as any);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      if (isToday) {
        return `Hari ini • ${hours}:${minutes}`;
      }
      if (isYesterday) {
        return `Kemarin • ${hours}:${minutes}`;
      }

      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const unreadCount = useMemo(() => {
    return announcements.filter((item) => !readIds.has(item.id)).length;
  }, [announcements, readIds]);

  const displayedList = useMemo(() => {
    if (filter === "unread") {
      return announcements.filter((item) => !readIds.has(item.id));
    }
    return announcements;
  }, [announcements, filter, readIds]);

  return (
    <SafeAreaView
      className="flex-1 bg-sky-50"
      edges={["top", "left", "right"]}
    >
      <ScreenHeader title="Pengumuman" />

      {/* Filter Tabs (Semua vs Belum Dibaca) */}
      <View className="px-5 pt-3.5 pb-2 flex-row gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setFilter("all")}
          className={`px-4 py-1.5 rounded-full ${
            filter === "all"
              ? "bg-blue-600 shadow-xs"
              : "bg-white border border-gray-200"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              filter === "all" ? "text-white" : "text-gray-600"
            }`}
          >
            Semua ({announcements.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setFilter("unread")}
          className={`px-4 py-1.5 rounded-full flex-row items-center gap-1.5 ${
            filter === "unread"
              ? "bg-blue-600 shadow-xs"
              : "bg-white border border-gray-200"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              filter === "unread" ? "text-white" : "text-gray-600"
            }`}
          >
            Belum Dibaca
          </Text>
          {unreadCount > 0 && (
            <View
              className={`w-2 h-2 rounded-full ${
                filter === "unread" ? "bg-white" : "bg-red-500"
              }`}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* List Pengumuman */}
      <ScrollView
        className="flex-1 px-4 pt-2"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0284c7"]}
            tintColor="#0284c7"
          />
        }
      >
        {loading ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="large" color="#0284c7" />
            <Text className="text-gray-400 text-xs mt-3 font-medium">
              Memuat pengumuman...
            </Text>
          </View>
        ) : displayedList.length === 0 ? (
          <View className="py-20 items-center justify-center text-center px-6">
            <View className="w-16 h-16 rounded-3xl bg-sky-100/80 items-center justify-center text-sky-500 mb-3 shadow-xs">
              <Ionicons name="notifications-off-outline" size={30} color="#0ea5e9" />
            </View>
            <Text className="text-base font-bold text-gray-800 mb-1">
              {filter === "unread"
                ? "Semua Pengumuman Sudah Dibaca"
                : "Belum Ada Pengumuman"}
            </Text>
            <Text className="text-xs text-gray-400 text-center max-w-[240px] leading-relaxed">
              {filter === "unread"
                ? "Tidak ada surat edaran baru yang belum kamu buka."
                : "Saat ini belum ada pengumuman atau surat edaran baru yang diterbitkan manajemen."}
            </Text>
          </View>
        ) : (
          displayedList.map((item) => {
            const isRead = readIds.has(item.id);

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => handleOpenAnnouncement(item.id, isRead)}
                className={`p-3 rounded-2xl mb-2 flex-row items-center justify-between border ${
                  isRead
                    ? "bg-white/80 border-gray-100 opacity-90"
                    : "bg-white border-sky-200 shadow-2xs"
                }`}
              >
                <View className="flex-row items-center flex-1 pr-2">
                  {/* Icon Box */}
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                      isRead ? "bg-slate-100" : "bg-blue-50"
                    }`}
                  >
                    <Ionicons
                      name={
                        isRead
                          ? "document-text-outline"
                          : "megaphone-outline"
                      }
                      size={20}
                      color={isRead ? "#94a3b8" : "#2563eb"}
                    />
                  </View>

                  {/* Text Information */}
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1.5 mb-0.5">
                      {!isRead && (
                        <View className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                      <Text
                        className={`text-[13px] flex-1 ${
                          isRead
                            ? "font-semibold text-gray-700"
                            : "font-bold text-gray-950"
                        }`}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text className="text-[11px] text-gray-400">
                        {formatDate(item.createdAt)}
                      </Text>
                      <Text className="text-[11px] text-gray-300">•</Text>
                      <Text
                        className="text-[11px] text-gray-600 font-medium"
                        numberOfLines={1}
                      >
                        {item.creatorName}
                      </Text>
                      {Boolean(item.attachmentUrl) && (
                        <View className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex-row items-center gap-0.5 ml-0.5">
                          <Text className="text-[10px] font-bold text-amber-800">
                            📎 PDF
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
