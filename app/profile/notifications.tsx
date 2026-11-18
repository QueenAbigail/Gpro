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

type NotificationType = "patrol" | "leave" | "payroll" | "system" | "approval";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  metadata?: Record<string, any> | null;
}

const isLeaveNotification = (item: Notification) => {
  const t = String(item.type || "").toLowerCase();
  const titleLower = String(item.title || "").toLowerCase();
  return (
    item.metadata?.type === "leave" ||
    t === "leave" ||
    t === "approval" ||
    Boolean(item.metadata?.leaveId) ||
    titleLower.includes("pengajuan") ||
    titleLower.includes("tukar shift") ||
    titleLower.includes("leave request")
  );
};

// Format judul agar bersih & korporat untuk notifikasi perizinan (tetap pertahankan emoji SOS & Temuan Patroli)
const formatDisplayTitle = (item: Notification) => {
  const rawTitle = String(item.title || "");
  if (!isLeaveNotification(item)) return rawTitle;

  const lower = rawTitle.toLowerCase();
  if (lower.includes("leave request approved")) {
    return "Pengajuan Izin Disetujui";
  }
  if (lower.includes("leave request rejected")) {
    return "Pengajuan Izin Ditolak";
  }

  return rawTitle
    .replace(/^[\s✅❌📋🏥🔄✔️✖️☑️]+/u, "")
    .replace(/!+$/, "")
    .trim();
};

export default function NotificationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeSosModal, setActiveSosModal] = useState<Notification | null>(null);
  const [sosSenderProfile, setSosSenderProfile] = useState<any>(null);
  const [isSenderLoading, setIsSenderLoading] = useState(false);

  // State untuk Modal Detail Perizinan (Cuti / Izin / Sakit / Tukar Shift)
  const [activeLeaveModal, setActiveLeaveModal] = useState<Notification | null>(null);
  const [liveLeaveRecord, setLiveLeaveRecord] = useState<any>(null);
  const [liveLeaveApplicant, setLiveLeaveApplicant] = useState<any>(null);
  const [isLeaveLoading, setIsLeaveLoading] = useState(false);
  const [previewAttachmentUri, setPreviewAttachmentUri] = useState<string | null>(null);

  // 1. Fetch data awal
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setCurrentUserId(user.id);
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
          type: (item.type ? String(item.type).toLowerCase() : "system") as NotificationType,
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

        // Jika dibuka dari push notif Perizinan (Cuti / Izin / Sakit / Tukar Shift), buka modal otomatis
        if (params?.openLeaveLatest === "true" || params?.openLeaveId) {
          const targetLeaveId = params?.openLeaveId ? String(params.openLeaveId) : "";
          const leaveItem =
            (targetLeaveId
              ? formattedData.find(
                  (n) =>
                    n.metadata?.leaveId &&
                    String(n.metadata.leaveId) === targetLeaveId,
                )
              : null) ||
            formattedData.find((n) => isLeaveNotification(n));

          if (leaveItem) {
            setActiveLeaveModal(leaveItem);
            if (!leaveItem.isRead) {
              supabase
                .from("notifications")
                .update({ isRead: true, updatedAt: new Date().toISOString() })
                .eq("id", leaveItem.id)
                .then(({ error: readErr }) => {
                  if (!readErr) {
                    setNotifications((prev) =>
                      prev.map((n) =>
                        n.id === leaveItem.id ? { ...n, isRead: true } : n,
                      ),
                    );
                  }
                });
            }
          }
        }
      }
    }
    setLoading(false);
  }, [params?.openSosLatest, params?.openLeaveLatest, params?.openLeaveId]);

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
                type: (newRow.type ? String(newRow.type).toLowerCase() : "system") as NotificationType,
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

  // 4b. Otomatis tarik data LIVE tabel leaves (Status Pending/Approved/Rejected terkini) & profil pengaju
  useEffect(() => {
    if (!activeLeaveModal) {
      setLiveLeaveRecord(null);
      setLiveLeaveApplicant(null);
      setIsLeaveLoading(false);
      return;
    }

    const loadLiveLeaveDetails = async () => {
      try {
        setIsLeaveLoading(true);
        const meta = activeLeaveModal.metadata || {};

        if (meta.leaveId) {
          const { data: leaveData } = await supabase
            .from("leaves")
            .select("*")
            .eq("id", meta.leaveId)
            .maybeSingle();

          if (leaveData) {
            setLiveLeaveRecord(leaveData);
          }
        }

        const applicantId = meta.applicantId;
        if (applicantId) {
          const { data: uData } = await supabase
            .from("users")
            .select("id, name, avatar, position, role, siteId")
            .eq("id", applicantId)
            .maybeSingle();

          if (uData) {
            let siteName = meta.siteName || null;
            if (uData.siteId) {
              const { data: sData } = await supabase
                .from("sites")
                .select("name")
                .eq("id", uData.siteId)
                .maybeSingle();
              if (sData?.name) siteName = sData.name;
            }
            setLiveLeaveApplicant({ ...uData, siteName });
          }
        }
      } catch (err) {
        console.error("Gagal load detail live perizinan:", err);
      } finally {
        setIsLeaveLoading(false);
      }
    };

    loadLiveLeaveDetails();
  }, [activeLeaveModal]);

  const formatShortIndoDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const clean = String(dateStr).split("T")[0];
    const parts = clean.split("-");
    if (parts.length !== 3) return dateStr;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${months[mIdx] || parts[1]} ${parts[0]}`;
  };

  const calculateLeaveDuration = (
    startStr?: string | null,
    endStr?: string | null,
  ) => {
    if (!startStr || !endStr) return "1 Hari";
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "1 Hari";
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} Hari`;
  };

  const getLeaveDetails = (notif: Notification | null) => {
    const meta = notif?.metadata || {};
    const leaveTypeRaw = String(
      liveLeaveRecord?.leaveType || meta.leaveType || "Izin",
    );
    const isTukarShift =
      leaveTypeRaw.toUpperCase() === "TUKAR_SHIFT" ||
      leaveTypeRaw.toLowerCase().includes("tukar");
    const isSakit = leaveTypeRaw.toLowerCase() === "sakit";

    const applicantId = liveLeaveRecord?.userId || meta.applicantId || null;
    const replacementUserId =
      liveLeaveRecord?.replacementUserId || meta.replacementUserId || null;

    const isSelfApplicant = Boolean(
      currentUserId && applicantId && currentUserId === applicantId,
    );
    const isReplacementViewer =
      meta.targetAudience === "replacement" ||
      Boolean(
        currentUserId &&
          replacementUserId &&
          currentUserId === replacementUserId,
      );

    const applicantName =
      liveLeaveApplicant?.name || meta.applicantName || "Karyawan";
    const applicantPosition =
      liveLeaveApplicant?.position ||
      meta.applicantPosition ||
      liveLeaveApplicant?.role ||
      "Karyawan";
    const applicantAvatar =
      liveLeaveApplicant?.avatar || meta.applicantAvatar || null;
    const siteName =
      liveLeaveApplicant?.siteName || meta.siteName || "Site Penempatan";

    const startDate = liveLeaveRecord?.startDate || meta.startDate || null;
    const endDate = liveLeaveRecord?.endDate || meta.endDate || startDate;
    const reason =
      liveLeaveRecord?.reason ||
      meta.reason ||
      notif?.message ||
      "Tidak ada keterangan.";
    const attachmentUrl =
      liveLeaveRecord?.attachmentUrl || meta.attachmentUrl || null;

    // Ekstrak nama file ringkas dari URL lampiran
    let attachmentFileName = isSakit
      ? "surat_dokter.jpg"
      : "form_izin_ttd.jpg";
    if (attachmentUrl && typeof attachmentUrl === "string") {
      const lastSeg = attachmentUrl.split("/").pop()?.split("?")[0];
      if (lastSeg) {
        try {
          attachmentFileName = decodeURIComponent(lastSeg);
        } catch {
          attachmentFileName = lastSeg;
        }
      }
    }

    const statusRaw = String(
      liveLeaveRecord?.status || meta.newStatus || meta.status || "Pending",
    ).toUpperCase();
    let statusType: "Pending" | "Approved" | "Rejected" = "Pending";
    if (statusRaw === "APPROVED" || statusRaw === "DISETUJUI") {
      statusType = "Approved";
    } else if (statusRaw === "REJECTED" || statusRaw === "DITOLAK") {
      statusType = "Rejected";
    }

    const originalShiftType =
      liveLeaveRecord?.originalShiftType ||
      meta.originalShiftType ||
      "Shift Asli";
    const targetShiftType =
      liveLeaveRecord?.targetShiftType ||
      meta.targetShiftType ||
      "Shift Pengganti";
    const replacementUserName = meta.replacementUserName || "Rekan Pengganti";

    return {
      leaveType: leaveTypeRaw,
      isTukarShift,
      isSakit,
      isSelfApplicant,
      isReplacementViewer,
      applicantName,
      applicantPosition,
      applicantAvatar,
      siteName,
      startDate,
      endDate,
      dateRangeText:
        startDate && endDate && startDate !== endDate
          ? `${formatShortIndoDate(startDate)} - ${formatShortIndoDate(endDate)}`
          : formatShortIndoDate(startDate),
      durationText: calculateLeaveDuration(startDate, endDate),
      reason,
      attachmentUrl,
      attachmentFileName,
      statusType,
      originalShiftType,
      targetShiftType,
      replacementUserName,
    };
  };

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

    // 2b. Cek apakah notifikasi Perizinan / Approval -> Munculkan Leave Modal Pop-up!
    if (isLeaveNotification(item)) {
      setActiveLeaveModal(item);
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
      } else if (
        targetRoute.startsWith("/patrol/") &&
        item.metadata?.patrolId
      ) {
        router.push({
          pathname: targetRoute,
          params: { patrolId: String(item.metadata.patrolId) },
        } as any);
      } else {
        router.push(targetRoute as any);
      }
      return;
    }

    // 4. Fallback cerdas berdasarkan type jika metadata kosong
    if (notifType === "patrol") {
      router.push("/(tabs)/patrol" as any);
    } else if (notifType === "payroll") {
      router.push("/(tabs)/profile" as any);
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
  const leaveData = getLeaveDetails(activeLeaveModal);

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
            const isItemTemuan =
              item.metadata?.status === "INCIDENT" ||
              item.title?.includes("Temuan");
            const isItemLeave = isLeaveNotification(item);
            const itemLeaveType = String(item.metadata?.leaveType || "");
            const itemStatusUpper = String(
              item.metadata?.newStatus || item.metadata?.status || "",
            ).toUpperCase();
            const titleLower = String(item.title || "").toLowerCase();
            const isItemLeaveApproved =
              isItemLeave &&
              (itemStatusUpper === "APPROVED" ||
                itemStatusUpper === "DISETUJUI" ||
                titleLower.includes("disetujui") ||
                titleLower.includes("approved"));
            const isItemLeaveRejected =
              isItemLeave &&
              (itemStatusUpper === "REJECTED" ||
                itemStatusUpper === "DITOLAK" ||
                titleLower.includes("ditolak") ||
                titleLower.includes("rejected"));
            const isItemSakit =
              itemLeaveType.toLowerCase() === "sakit" ||
              titleLower.includes("sakit");
            const isItemTukar =
              itemLeaveType.toUpperCase() === "TUKAR_SHIFT" ||
              titleLower.includes("tukar shift");

            const itemIconBg = isItemSos
              ? "bg-red-100"
              : isItemTemuan
                ? "bg-amber-100"
                : isItemLeaveApproved
                  ? "bg-emerald-50"
                  : isItemLeaveRejected
                    ? "bg-red-50"
                    : isItemLeave
                      ? isItemSakit
                        ? "bg-red-50"
                        : isItemTukar
                          ? "bg-emerald-50"
                          : "bg-blue-50"
                      : iconConfig.bg;

            const itemIconName = isItemSos
              ? "warning"
              : isItemTemuan
                ? "alert-circle"
                : isItemLeaveApproved
                  ? "checkmark-circle"
                  : isItemLeaveRejected
                    ? "close-circle"
                    : isItemLeave
                      ? isItemSakit
                        ? "medkit"
                        : isItemTukar
                          ? "swap-horizontal"
                          : "document-text"
                      : iconConfig.name;

            const itemIconColor = isItemSos
              ? "#dc2626"
              : isItemTemuan
                ? "#d97706"
                : isItemLeaveApproved
                  ? "#059669"
                  : isItemLeaveRejected
                    ? "#dc2626"
                    : isItemLeave
                      ? isItemSakit
                        ? "#ef4444"
                        : isItemTukar
                          ? "#10b981"
                          : "#2563eb"
                      : iconConfig.color;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                className={`flex-row p-4 mb-3 rounded-2xl border ${
                  isItemSos
                    ? "bg-red-50/70 border-red-200"
                    : isItemTemuan
                      ? "bg-amber-50/70 border-amber-200"
                      : item.isRead
                        ? "bg-white border-slate-100"
                        : "bg-blue-50/50 border-blue-100"
                }`}
                onPress={() => handleItemPress(item)}
              >
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${itemIconBg}`}
                >
                  <Ionicons
                    name={itemIconName as any}
                    size={24}
                    color={itemIconColor}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text
                      className={`flex-1 text-base mr-2 ${
                        isItemSos
                          ? "font-black text-red-700"
                          : isItemTemuan
                            ? "font-bold text-amber-900"
                            : item.isRead
                              ? "font-semibold text-slate-700"
                              : "font-bold text-slate-900"
                      }`}
                    >
                      {formatDisplayTitle(item)}
                    </Text>
                    {!item.isRead && (
                      <View
                        className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                          isItemSos
                            ? "bg-red-600"
                            : isItemTemuan
                              ? "bg-amber-500"
                              : "bg-blue-500"
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

      {/* 📋 LEAVE / SAKIT / TUKAR SHIFT DETAIL MODAL (POP-UP MELAYANG) */}
      <Modal
        visible={!!activeLeaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveLeaveModal(null)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[86%]">
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: "center" }}
            >
              {/* Semantic Header Icon Bubble */}
              {(() => {
                let bubbleClass = "bg-blue-100 border-blue-200";
                let iconName: any = "document-text";
                let iconColor = "#2563eb";
                let modalTitle = "PENGAJUAN IZIN";
                let modalSubtitle =
                  "Permohonan izin / cuti dengan lampiran dokumen form";

                if (leaveData.isTukarShift) {
                  bubbleClass = "bg-emerald-100 border-emerald-200";
                  iconName = "swap-horizontal";
                  iconColor = "#059669";
                  modalTitle = leaveData.isReplacementViewer
                    ? "AJAKAN TUKAR SHIFT"
                    : "PENGAJUAN TUKAR SHIFT";
                  modalSubtitle = leaveData.isReplacementViewer
                    ? `${leaveData.applicantName} mengajak Anda bertukar jadwal dinas`
                    : "Permohonan barter jadwal dinas antar karyawan";
                } else if (leaveData.isSelfApplicant) {
                  if (leaveData.statusType === "Approved") {
                    bubbleClass = "bg-emerald-100 border-emerald-200";
                    iconName = "checkmark-circle";
                    iconColor = "#059669";
                    modalTitle = leaveData.isSakit
                      ? "PENGAJUAN SAKIT DISETUJUI"
                      : "PENGAJUAN IZIN DISETUJUI";
                    modalSubtitle = "Status permohonan kamu telah diperbarui";
                  } else if (leaveData.statusType === "Rejected") {
                    bubbleClass = "bg-red-100 border-red-200";
                    iconName = "close-circle";
                    iconColor = "#dc2626";
                    modalTitle = leaveData.isSakit
                      ? "PENGAJUAN SAKIT DITOLAK"
                      : "PENGAJUAN IZIN DITOLAK";
                    modalSubtitle = "Status permohonan kamu telah diperbarui";
                  } else {
                    bubbleClass = "bg-amber-100 border-amber-200";
                    iconName = "time";
                    iconColor = "#d97706";
                    modalTitle = leaveData.isSakit
                      ? "PENGAJUAN SAKIT"
                      : "PENGAJUAN IZIN";
                    modalSubtitle = "Permohonan sedang menunggu persetujuan";
                  }
                } else if (leaveData.isSakit) {
                  bubbleClass = "bg-red-100 border-red-200";
                  iconName = "medkit";
                  iconColor = "#dc2626";
                  modalTitle = "PENGAJUAN SAKIT";
                  modalSubtitle =
                    "Izin sakit dengan lampiran surat keterangan dokter";
                }

                return (
                  <>
                    <View
                      className={`w-14 h-14 rounded-full border items-center justify-center mb-3 ${bubbleClass}`}
                    >
                      <Ionicons name={iconName} size={28} color={iconColor} />
                    </View>
                    <Text className="text-lg font-extrabold text-slate-950 tracking-tight text-center mb-1">
                      {modalTitle}
                    </Text>
                    <Text className="text-xs text-slate-500 text-center mb-4">
                      {modalSubtitle}
                    </Text>
                  </>
                );
              })()}

              {/* Applicant Profile Card (Disembunyikan jika pemohon melihat pengajuan miliknya sendiri) */}
              {(!leaveData.isSelfApplicant || leaveData.isTukarShift) && (
                <View className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-3">
                  <View className="flex-row items-center">
                    <View
                      className={`w-11 h-11 rounded-full overflow-hidden items-center justify-center mr-3 border border-slate-200 ${
                        leaveData.isTukarShift || leaveData.isSakit
                          ? "bg-emerald-600"
                          : "bg-blue-600"
                      }`}
                    >
                      {isLeaveLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : leaveData.applicantAvatar ? (
                        <Image
                          source={{ uri: leaveData.applicantAvatar }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-white font-extrabold text-sm">
                          {getInitials(leaveData.applicantName)}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center justify-between">
                        <Text
                          className="text-sm font-bold text-slate-900 flex-1 mr-2"
                          numberOfLines={1}
                        >
                          {leaveData.applicantName}
                        </Text>
                        <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] text-blue-700 font-semibold">
                            {leaveData.applicantPosition}
                          </Text>
                        </View>
                      </View>
                      <Text
                        className="text-xs text-slate-600 font-medium mt-0.5"
                        numberOfLines={1}
                      >
                        {leaveData.siteName}
                      </Text>
                      <Text className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {activeLeaveModal?.time || "Baru saja"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Detail Content Box */}
              {leaveData.isTukarShift ? (
                <View className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-4">
                  {/* Shift Comparison (2 Kolom) */}
                  <View className="flex-row mb-3">
                    <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 items-center mr-2">
                      <Text
                        className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 text-center"
                        numberOfLines={1}
                      >
                        {leaveData.isReplacementViewer
                          ? `Shift ${leaveData.applicantName}`
                          : `Pengaju (${leaveData.applicantName})`}
                      </Text>
                      <Text
                        className="text-xs font-extrabold text-slate-900 text-center"
                        numberOfLines={1}
                      >
                        {leaveData.originalShiftType}
                      </Text>
                      <Text className="text-[10px] text-blue-600 font-semibold mt-0.5">
                        {formatShortIndoDate(leaveData.startDate)}
                      </Text>
                    </View>

                    <View className="flex-1 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 items-center">
                      <Text
                        className="text-[10px] text-blue-600 font-bold uppercase mb-0.5 text-center"
                        numberOfLines={1}
                      >
                        {leaveData.isReplacementViewer
                          ? "Shift Kamu"
                          : `Pengganti (${leaveData.replacementUserName})`}
                      </Text>
                      <Text
                        className="text-xs font-extrabold text-blue-900 text-center"
                        numberOfLines={1}
                      >
                        {leaveData.targetShiftType}
                      </Text>
                      <Text className="text-[10px] text-blue-700 font-semibold mt-0.5">
                        {formatShortIndoDate(leaveData.endDate)}
                      </Text>
                    </View>
                  </View>

                  {/* Alasan Tukar */}
                  <View>
                    <Text className="text-xs text-slate-500 font-medium mb-1">
                      Alasan Tukar
                    </Text>
                    <View className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <Text className="text-xs text-slate-700 font-semibold leading-relaxed">
                        {leaveData.reason}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <View className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-3">
                    {/* Periode & Durasi */}
                    <View className="flex-row items-start justify-between border-b border-slate-200 pb-2.5 mb-2.5">
                      <Text className="text-xs text-slate-500 font-medium">
                        {leaveData.isSakit ? "Periode Sakit" : "Periode Izin"}
                      </Text>
                      <View className="items-end flex-1 ml-2">
                        <Text className="text-xs font-bold text-slate-900 text-right">
                          {leaveData.dateRangeText}
                        </Text>
                        <View
                          className={`px-2 py-0.5 rounded mt-1 ${
                            leaveData.isSakit ? "bg-red-50" : "bg-blue-50"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-semibold ${
                              leaveData.isSakit
                                ? "text-red-600"
                                : "text-blue-600"
                            }`}
                          >
                            Durasi: {leaveData.durationText}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Alasan / Keluhan */}
                    <View className={leaveData.attachmentUrl ? "mb-2.5" : ""}>
                      <Text className="text-xs text-slate-500 font-medium mb-1">
                        {leaveData.isSakit
                          ? "Diagnosa / Keluhan"
                          : "Alasan Pengajuan"}
                      </Text>
                      <View className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <Text className="text-xs text-slate-700 font-semibold leading-relaxed">
                          {leaveData.reason}
                        </Text>
                      </View>
                    </View>

                    {/* Lampiran Dokumen / Surat Dokter (Tampil untuk Izin/Cuti & Sakit) */}
                    {leaveData.attachmentUrl && (
                      <View>
                        <Text className="text-xs text-slate-500 font-medium mb-1">
                          {leaveData.isSakit
                            ? "Lampiran Surat Dokter"
                            : "Lampiran Form Izin"}
                        </Text>
                        <View className="bg-white p-2 rounded-xl border border-slate-200 flex-row items-center justify-between">
                          <View className="flex-row items-center flex-1 mr-2 min-w-0">
                            <View
                              className={`w-9 h-9 rounded-lg border items-center justify-center mr-2.5 ${
                                leaveData.isSakit
                                  ? "bg-red-50 border-red-100"
                                  : "bg-blue-50 border-blue-100"
                              }`}
                            >
                              <Ionicons
                                name="image-outline"
                                size={18}
                                color={
                                  leaveData.isSakit ? "#ef4444" : "#2563eb"
                                }
                              />
                            </View>
                            <View className="flex-1 min-w-0">
                              <Text
                                className="text-xs font-bold text-slate-800"
                                numberOfLines={1}
                              >
                                {leaveData.attachmentFileName}
                              </Text>
                              <Text className="text-[10px] text-slate-400">
                                {leaveData.isSakit
                                  ? "Bukti resmi terlampir"
                                  : "Dokumen bertanda tangan"}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            onPress={() =>
                              setPreviewAttachmentUri(leaveData.attachmentUrl)
                            }
                            activeOpacity={0.7}
                            className="px-3 py-2 bg-blue-50 active:bg-blue-100 rounded-lg"
                          >
                            <Text className="text-[11px] font-bold text-blue-600">
                              Lihat Foto
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Status Card Ringkas (Live dari tabel leaves: Pending / Approved / Rejected) */}
                  {(() => {
                    const isApproved = leaveData.statusType === "Approved";
                    const isRejected = leaveData.statusType === "Rejected";
                    const cardStyle = isApproved
                      ? "bg-emerald-50 border-emerald-200"
                      : isRejected
                        ? "bg-red-50 border-red-200"
                        : "bg-amber-50 border-amber-200";
                    const titleStyle = isApproved
                      ? "text-emerald-800"
                      : isRejected
                        ? "text-red-800"
                        : "text-amber-800";
                    const subStyle = isApproved
                      ? "text-emerald-700"
                      : isRejected
                        ? "text-red-700"
                        : "text-amber-700";
                    const iconWrapStyle = isApproved
                      ? "bg-emerald-100"
                      : isRejected
                        ? "bg-red-100"
                        : "bg-amber-100";
                    const statusIconName = isApproved
                      ? "checkmark"
                      : isRejected
                        ? "close"
                        : "time-outline";
                    const statusIconColor = isApproved
                      ? "#059669"
                      : isRejected
                        ? "#dc2626"
                        : "#d97706";
                    const statusTitleText = `Status : ${leaveData.statusType}`;
                    const statusSubText = isApproved
                      ? "Telah Disetujui"
                      : isRejected
                        ? "Pengajuan Ditolak"
                        : "Menunggu Persetujuan";

                    return (
                      <View
                        className={`w-full border rounded-2xl p-3 mb-4 flex-row items-center justify-between ${cardStyle}`}
                      >
                        <View className="flex-1 mr-2">
                          <Text
                            className={`text-xs font-extrabold ${titleStyle}`}
                          >
                            {statusTitleText}
                          </Text>
                          <Text className={`text-[11px] font-medium ${subStyle}`}>
                            {statusSubText}
                          </Text>
                        </View>
                        <View
                          className={`w-8 h-8 rounded-full items-center justify-center ${iconWrapStyle}`}
                        >
                          {isLeaveLoading ? (
                            <ActivityIndicator
                              size="small"
                              color={statusIconColor}
                            />
                          ) : (
                            <Ionicons
                              name={statusIconName as any}
                              size={16}
                              color={statusIconColor}
                            />
                          )}
                        </View>
                      </View>
                    );
                  })()}
                </>
              )}

              {/* Tombol Tutup (Target sentuh lega 48px + hitSlop) */}
              <TouchableOpacity
                onPress={() => setActiveLeaveModal(null)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 16, left: 20, right: 20 }}
                className="w-full h-12 bg-slate-100 active:bg-slate-200 rounded-2xl items-center justify-center border border-slate-200"
              >
                <Text className="text-xs font-bold text-slate-700">Tutup</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🖼️ FULLSCREEN ATTACHMENT PREVIEW LIGHTBOX */}
      <Modal
        visible={!!previewAttachmentUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewAttachmentUri(null)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center px-4">
          <TouchableOpacity
            onPress={() => setPreviewAttachmentUri(null)}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            className="absolute top-14 right-6 w-11 h-11 bg-white/20 rounded-full items-center justify-center z-20"
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          {previewAttachmentUri && (
            <Image
              source={{ uri: previewAttachmentUri }}
              className="w-full h-[72%] rounded-2xl"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}