import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase"; 
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

type NotificationType = "patrol" | "leave" | "payroll" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  metadata?: Record<string, any> | null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSosModal, setActiveSosModal] = useState<Notification | null>(null);
  const [sosSenderProfile, setSosSenderProfile] = useState<any>(null);
  const [isSenderLoading, setIsSenderLoading] = useState(false);

  // 1. Fetch data awal
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
      } else {
        const formattedData: Notification[] = data.map((item) => ({
          id: item.id,
          type: item.type as NotificationType,
          title: item.title,
          message: item.body,
          time: formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: id }),
          isRead: item.isRead,
          metadata: item.metadata || null,
        }));
        setNotifications(formattedData);

        // Jika dibuka dari push notif SOS di status bar, buka modal otomatis
        if (params?.openSosLatest === "true") {
          const sosItem = formattedData.find(
            (n) =>
              n.metadata?.type === "sos" ||
              n.title?.includes("SOS") ||
              n.message?.includes("darurat"),
          );
          if (sosItem) {
            setActiveSosModal(sosItem);
          }
        }
      }
    }
    setLoading(false);
  }, [params?.openSosLatest]);

  // 2. Setup Realtime dengan nama channel unik & Cleanup yang aman
  useEffect(() => {
    fetchNotifications();
    
    let channel: any;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channelName = `notif_realtime_${user.id}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `userId=eq.${user.id}`,
          },
          (payload) => {
            const newRow = payload.new;
            setNotifications((prev) => [
              {
                id: newRow.id,
                type: newRow.type as NotificationType,
                title: newRow.title,
                message: newRow.body,
                time: "Baru saja",
                isRead: newRow.isRead,
                metadata: newRow.metadata || null,
              },
              ...prev,
            ]);
          }
        )
        .subscribe();
    };

    setupRealtime();

    // Cleanup saat komponen unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNotifications]);

  // 3. Fungsi update semua dibaca
  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ isRead: true, updatedAt: new Date().toISOString() })
      .eq("userId", user.id)
      .eq("isRead", false);

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    }
  };

  // 4. Otomatis tarik profil lengkap (Foto, Jabatan, Site, HP) pengirim SOS jika belum ada
  useEffect(() => {
    if (!activeSosModal) {
      setSosSenderProfile(null);
      setIsSenderLoading(false);
      return;
    }

    const loadSenderDetails = async () => {
      try {
        setIsSenderLoading(true);
        const meta = activeSosModal.metadata || {};
        const senderId = meta.senderId;
        let senderName = meta.senderName;
        if (!senderName && activeSosModal.message) {
          const match = activeSosModal.message.match(
            /^(.+?)\s+membutuhkan bantuan darurat/i,
          );
          if (match && match[1]) {
            senderName = match[1];
          }
        }

        // Query tabel users TANPA kolom photoUrl yang tidak ada di schema
        let query = supabase
          .from("users")
          .select("id, name, avatar, position, role, phoneNumber, siteId");

        if (senderId) {
          query = query.eq("id", senderId);
        } else if (senderName) {
          query = query.ilike("name", `%${senderName.trim()}%`);
        } else {
          setIsSenderLoading(false);
          return;
        }

        const { data: users, error } = await query.limit(1);
        if (error) {
          console.error("Gagal load detail profil pengirim SOS:", error);
          setIsSenderLoading(false);
          return;
        }

        const user = users?.[0];
        if (user) {
          let siteName = null;
          if (user.siteId) {
            const { data: siteData } = await supabase
              .from("sites")
              .select("name")
              .eq("id", user.siteId)
              .maybeSingle();
            siteName = siteData?.name;
          }

          setSosSenderProfile({
            ...user,
            siteName: siteName,
          });
        }
      } catch (err) {
        console.error("Gagal load detail profil pengirim SOS:", err);
      } finally {
        setIsSenderLoading(false);
      }
    };

    loadSenderDetails();
  }, [activeSosModal]);

  // 5. Helper data SOS & Quick Actions
  const getSosDetails = (notif: Notification | null) => {
    if (!notif) {
      return {
        name: "Petugas Lapangan",
        role: "Petugas Lapangan",
        site: "Site Penempatan",
        phone: null,
        avatar: null,
        lat: null,
        lng: null,
      };
    }
    const meta = notif.metadata || {};
    let name = sosSenderProfile?.name || meta.senderName;
    if (!name && notif.message) {
      const match = notif.message.match(
        /^(.+?)\s+membutuhkan bantuan darurat/i,
      );
      if (match && match[1]) {
        name = match[1];
      }
    }

    const roleOrPosition =
      sosSenderProfile?.position ||
      meta.senderPosition ||
      sosSenderProfile?.role ||
      meta.senderRole ||
      (isSenderLoading ? "Memuat..." : "Petugas Lapangan");

    const siteName =
      sosSenderProfile?.siteName ||
      meta.siteName ||
      (isSenderLoading ? "Memuat lokasi..." : "Site Penempatan");

    const avatarUrl =
      sosSenderProfile?.avatar ||
      meta.senderAvatar ||
      null;

    const phone =
      sosSenderProfile?.phoneNumber ||
      meta.senderPhone ||
      null;

    return {
      name: name || "Petugas Lapangan",
      role: roleOrPosition,
      site: siteName,
      phone: phone,
      avatar: avatarUrl,
      lat: meta.lat ?? null,
      lng: meta.lng ?? null,
    };
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (fullName.substring(0, 2) || "SOS").toUpperCase();
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) {
      Alert.alert(
        "Nomor Tidak Tersedia",
        "Nomor telepon petugas tidak terlampir dalam sinyal darurat ini.",
      );
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone?: string | null, name?: string) => {
    if (!phone) {
      Alert.alert(
        "Nomor Tidak Tersedia",
        "Nomor WhatsApp petugas tidak terlampir dalam sinyal darurat ini.",
      );
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }
    const text = encodeURIComponent(
      `Halo ${name || "rekan"}, saya menerima sinyal darurat SOS kamu. Bagaimana kondisi saat ini?`,
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`);
  };

  const handleOpenMaps = (lat?: number | null, lng?: number | null) => {
    if (lat && lng) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      );
    } else {
      Alert.alert(
        "Lokasi GPS",
        "Titik koordinat GPS tidak terlampir saat sinyal dikirimkan.",
      );
    }
  };

  // 5. Fungsi klik item (Mark as read & Redirect ke target spesifik / SOS Modal)
  const handleItemPress = async (item: Notification) => {
    // 1. Update status dibaca jika belum
    if (!item.isRead) {
      const { error } = await supabase
        .from("notifications")
        .update({ isRead: true, updatedAt: new Date().toISOString() })
        .eq("id", item.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
      }
    }

    // 2. Cek apakah sinyal SOS darurat -> Munculkan SOS Alert Modal Pop-up!
    const notifType = String(item.type || "").toLowerCase();
    const isSos =
      item.metadata?.type === "sos" ||
      item.title?.includes("SOS") ||
      item.message?.includes("darurat");

    if (isSos) {
      setActiveSosModal(item);
      return;
    }

    // 3. Deep Linking / Target Spesifik dari metadata
    const targetRoute = item.metadata?.route;
    if (
      targetRoute &&
      typeof targetRoute === "string" &&
      targetRoute !== "/profile/notifications"
    ) {
      if (targetRoute.startsWith("/(tabs)")) {
        router.navigate(targetRoute as any);
      } else {
        router.push(targetRoute as any);
      }
      return;
    }

    // 4. Fallback cerdas berdasarkan type jika metadata kosong
    if (notifType === "patrol") {
      router.push("/(tabs)/patrol" as any);
    } else if (notifType === "leave") {
      router.push("/(tabs)/leave" as any);
    } else if (notifType === "payroll") {
      router.push("/(tabs)/profile" as any);
    } else if (notifType === "system") {
      router.navigate("/(tabs)" as any);
    }
  };

  const getIconConfig = (type: NotificationType) => {
    switch (String(type || "").toLowerCase()) {
      case "leave": return { name: "calendar", color: "#10b981", bg: "bg-emerald-100" };
      case "payroll": return { name: "wallet", color: "#f59e0b", bg: "bg-amber-100" };
      case "patrol": return { name: "shield-checkmark", color: "#3b82f6", bg: "bg-blue-100" };
      case "system": return { name: "alert-circle", color: "#ef4444", bg: "bg-red-100" };
      default: return { name: "notifications", color: "#3b82f6", bg: "bg-blue-100" };
    }
  };

  const sosData = getSosDetails(activeSosModal);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="pt-16 pb-4 px-6 bg-white flex-row items-center justify-between shadow-sm border-b border-slate-100 z-10">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4 active:bg-slate-100">
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Notifikasi</Text>
        </View>
        {notifications.some((n) => !n.isRead) && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Ionicons name="checkmark-done-circle" size={28} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 80 }}>
        {loading ? (
          <ActivityIndicator size="small" className="mt-20" color="#3b82f6" />
        ) : notifications.length === 0 ? (
          <View className="items-center justify-center mt-32">
            <View className="w-24 h-24 bg-slate-200 rounded-full items-center justify-center mb-4">
              <Ionicons name="notifications-off" size={40} color="#94a3b8" />
            </View>
            <Text className="text-slate-600 font-bold text-lg">Belum Ada Notifikasi</Text>
          </View>
        ) : (
          notifications.map((item) => {
            const iconConfig = getIconConfig(item.type);
            const isItemSos =
              item.metadata?.type === "sos" ||
              item.title?.includes("SOS") ||
              item.message?.includes("darurat");

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                className={`flex-row p-4 mb-3 rounded-2xl border ${
                  isItemSos
                    ? "bg-red-50/70 border-red-200"
                    : item.isRead
                      ? "bg-white border-slate-100"
                      : "bg-blue-50/50 border-blue-100"
                }`}
                onPress={() => handleItemPress(item)}
              >
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                    isItemSos ? "bg-red-100" : iconConfig.bg
                  }`}
                >
                  <Ionicons
                    name={isItemSos ? "warning" : (iconConfig.name as any)}
                    size={24}
                    color={isItemSos ? "#dc2626" : iconConfig.color}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text
                      className={`flex-1 text-base mr-2 ${
                        isItemSos
                          ? "font-black text-red-700"
                          : item.isRead
                            ? "font-semibold text-slate-700"
                            : "font-bold text-slate-900"
                      }`}
                    >
                      {item.title}
                    </Text>
                    {!item.isRead && (
                      <View
                        className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                          isItemSos ? "bg-red-600" : "bg-blue-500"
                        }`}
                      />
                    )}
                  </View>
                  <Text
                    className={`text-sm mb-2 ${
                      item.isRead ? "text-slate-500" : "text-slate-700"
                    }`}
                    numberOfLines={2}
                  >
                    {item.message}
                  </Text>
                  <Text className="text-xs text-slate-400 font-medium">{item.time}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* 🚨 SOS EMERGENCY ALERT MODAL (POP-UP MELAYANG) */}
      <Modal
        visible={!!activeSosModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveSosModal(null)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl items-center border border-slate-100">
            {/* Semantic Bubble Icon (size-16) */}
            <View className="w-16 h-16 rounded-full bg-red-100 border border-red-200 items-center justify-center mb-4">
              <Ionicons name="warning" size={32} color="#dc2626" />
            </View>

            {/* Title & Subtitle */}
            <Text className="text-xl font-extrabold text-slate-950 tracking-tight text-center mb-1">
              SOS EMERGENCY
            </Text>
            <Text className="text-xs text-slate-500 text-center mb-4">
              Sinyal darurat diaktifkan oleh petugas lapangan
            </Text>

            {/* Sender Identity Card */}
            <View className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-3">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full overflow-hidden bg-blue-600 items-center justify-center mr-3 border border-slate-200 shadow-sm">
                  {isSenderLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : sosData.avatar ? (
                    <Image
                      source={{ uri: sosData.avatar }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-white font-extrabold text-base">
                      {getInitials(sosData.name)}
                    </Text>
                  )}
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center justify-between gap-1">
                    <Text className="text-sm font-bold text-slate-900 flex-1" numberOfLines={1}>
                      {sosData.name}
                    </Text>
                    <View className="bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                      <Text className="text-[10px] text-blue-700 font-semibold">
                        {sosData.role}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-slate-600 font-medium mt-1" numberOfLines={1}>
                    {sosData.site}
                  </Text>
                  <Text className="text-[11px] text-red-600 font-semibold mt-0.5">
                    {activeSosModal?.time || "Baru saja"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Field Coordination Notice */}
            <View className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex-row items-start">
              <Ionicons
                name="information-circle"
                size={16}
                color="#d97706"
                style={{ marginTop: 1, marginRight: 6 }}
              />
              <Text className="text-xs text-amber-900 font-medium flex-1 leading-relaxed">
                Segera hubungi petugas atau koordinasikan dengan Danru terdekat untuk pengecekan lokasi.
              </Text>
            </View>

            {/* Quick Action Buttons (Native spacing: bebas tabrakan di semua resolusi) */}
            <View className="w-full">
              {/* Row 1: Telepon & WhatsApp */}
              <View className="flex-row gap-2.5 mb-3">
                <TouchableOpacity
                  onPress={() => handleCall(sosData.phone)}
                  className="flex-1 h-12 bg-blue-600 active:bg-blue-700 rounded-2xl flex-row items-center justify-center shadow-sm"
                >
                  <Ionicons name="call" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text className="text-white font-bold text-xs">Telepon</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleWhatsApp(sosData.phone, sosData.name)}
                  className="flex-1 h-12 bg-emerald-600 active:bg-emerald-700 rounded-2xl flex-row items-center justify-center shadow-sm"
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text className="text-white font-bold text-xs">WhatsApp</Text>
                </TouchableOpacity>
              </View>

              {/* Row 2: Buka Titik Lokasi GPS */}
              <TouchableOpacity
                onPress={() => handleOpenMaps(sosData.lat, sosData.lng)}
                className="w-full h-12 bg-slate-100 active:bg-slate-200 rounded-2xl flex-row items-center justify-center border border-slate-200 mb-2.5"
              >
                <Ionicons name="location" size={16} color="#dc2626" style={{ marginRight: 6 }} />
                <Text className="text-slate-800 font-semibold text-xs">Buka Titik Lokasi GPS</Text>
              </TouchableOpacity>

              {/* Row 3: Tutup & Siap Menuju Lokasi (HitSlop ekstra luas agar ramah sentuhan) */}
              <TouchableOpacity
                onPress={() => setActiveSosModal(null)}
                activeOpacity={0.6}
                hitSlop={{ top: 20, bottom: 25, left: 40, right: 40 }}
                className="w-full h-11 items-center justify-center"
              >
                <Text className="text-xs text-slate-500 font-semibold">
                  Tutup &amp; Siap Menuju Lokasi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}