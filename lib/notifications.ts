import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const updatePushTokenInSupabase = async (
  userId: string,
  tokenOrStatus: string,
) => {
  try {
    const { error } = await supabase
      .from("users")
      .update({ expoPushToken: tokenOrStatus })
      .eq("id", userId);

    if (error) {
      console.error(
        "🔴 [PUSH DEBUG] Gagal update status ke Supabase:",
        error.message,
      );
    } else {
      console.log(`🟢 [PUSH DEBUG] Supabase Updated: "${tokenOrStatus}"`);
    }
  } catch (err) {
    console.error("🔴 [PUSH DEBUG] Error DB update:", err);
  }
};

export async function registerForPushNotificationsAsync(userId: string) {
  if (!userId) return null;

  // 💡 PERBAIKAN 1: Filter Web Browser biar gak kena error VAPID
  if (Platform.OS === "web") {
    console.log("⚠️ [PUSH] Push Notification dilewati untuk Web Browser");
    await updatePushTokenInSupabase(userId, "Login via Web Browser");
    return null;
  }

  // 💡 PERBAIKAN 2: Filter Emulator
  if (!Device.isDevice) {
    console.log("⚠️ [PUSH] Harus pakai device fisik untuk Push Notification");
    await updatePushTokenInSupabase(userId, "Bukan Perangkat Fisik (Emulator)");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7A",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("⚠️ [PUSH] Gagal mendapatkan token: Izin ditolak oleh user!");
    await updatePushTokenInSupabase(userId, "Izin Notifikasi Ditolak");
    return null;
  }

  try {
    const projectId =
      process.env.EXPO_PUBLIC_PROJECT_ID ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error("🔴 [PUSH] Project ID tidak ditemukan!");
      await updatePushTokenInSupabase(userId, "Gagal: Missing Project ID");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data;

    console.log("🟢 Expo Push Token didapat:", token);

    if (token) {
      await updatePushTokenInSupabase(userId, token);
      return token;
    } else {
      await updatePushTokenInSupabase(userId, "Gagal: Token Kosong");
      return null;
    }
  } catch (error: any) {
    console.error("🔴 Error saat registrasi push token:", error);
    // Potong pesan error biar rapi di database
    const errorMessage = error?.message
      ? `Error: ${error.message.slice(0, 50)}...`
      : "Error Tidak Diketahui";
    await updatePushTokenInSupabase(userId, errorMessage);
    return null;
  }
}

export interface PushMessagePayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  priority?: "default" | "normal" | "high";
}

export async function sendPushNotificationsAsync(
  messages: PushMessagePayload[],
) {
  if (!messages || messages.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const formattedMessages = messages.map((m) => ({
      to: m.to,
      sound: m.sound || "default",
      title: m.title,
      body: m.body,
      priority: m.priority || "high",
      channelId: "default",
      data: m.data || {},
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedMessages),
    });

    const result = await response.json();
    return { success: true, result, count: formattedMessages.length };
  } catch (error) {
    console.error("🔴 Error sending push notification:", error);
    return { success: false, error };
  }
}

export interface LeaveSubmissionNotifParams {
  leaveId?: string | null;
  applicantId: string;
  leaveType: "Izin" | "Cuti" | "Sakit" | "TUKAR_SHIFT";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  attachmentUrl?: string | null;
  replacementUserId?: string | null;
  replacementUserName?: string | null;
  originalShiftType?: string | null;
  targetShiftType?: string | null;
}

const formatIndoDateShort = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
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

export async function sendLeaveSubmissionNotificationsAsync(
  params: LeaveSubmissionNotifParams,
) {
  try {
    // 1. Ambil profil lengkap pengaju + nama site
    const { data: applicant } = await supabase
      .from("users")
      .select("id, name, position, role, avatar, siteId")
      .eq("id", params.applicantId)
      .maybeSingle();

    let siteName = "Site Penempatan";
    if (applicant?.siteId) {
      const { data: siteData } = await supabase
        .from("sites")
        .select("name")
        .eq("id", applicant.siteId)
        .maybeSingle();
      if (siteData?.name) siteName = siteData.name;
    }

    const applicantName = applicant?.name || "Karyawan";
    const applicantPosition =
      applicant?.position || applicant?.role || "Karyawan";
    const applicantAvatar = applicant?.avatar || null;

    const startFormatted = formatIndoDateShort(params.startDate);
    const endFormatted = formatIndoDateShort(params.endDate);
    const dateLabel =
      params.startDate === params.endDate
        ? startFormatted
        : `${startFormatted} - ${endFormatted}`;

    const nowIso = new Date().toISOString();

    const baseMetadata = {
      type: "leave",
      route: "/profile/notifications",
      leaveId: params.leaveId || null,
      leaveType: params.leaveType,
      applicantId: params.applicantId,
      applicantName,
      applicantPosition,
      applicantAvatar,
      siteName,
      startDate: params.startDate,
      endDate: params.endDate,
      reason: params.reason,
      attachmentUrl: params.attachmentUrl || null,
      status: "Pending",
      replacementUserId: params.replacementUserId || null,
      replacementUserName: params.replacementUserName || null,
      originalShiftType: params.originalShiftType || null,
      targetShiftType: params.targetShiftType || null,
      sentAt: nowIso,
    };

    // 2. Ambil daftar Super Admin & HR Admin (sesuai enum Role di Supabase)
    const { data: adminUsers, error: adminErr } = await supabase
      .from("users")
      .select("id, name, role, expoPushToken")
      .in("role", ["SUPER_ADMIN", "HR_ADMIN"])
      .neq("id", params.applicantId);

    if (adminErr) {
      console.error("Gagal mengambil daftar Super Admin / HR:", adminErr);
    }

    const notificationInserts: any[] = [];
    const pushMessages: PushMessagePayload[] = [];
    const notifiedIds = new Set<string>();

    // 3. Khusus Tukar Shift: Kirim ajakan personal ke rekan pengganti terlebih dahulu
    if (
      params.leaveType === "TUKAR_SHIFT" &&
      params.replacementUserId &&
      params.replacementUserId !== params.applicantId
    ) {
      const { data: repUser } = await supabase
        .from("users")
        .select("id, name, expoPushToken")
        .eq("id", params.replacementUserId)
        .maybeSingle();

      if (repUser) {
        notifiedIds.add(repUser.id);
        const repTitle = "Ajakan Tukar Shift";
        const repBody = `${applicantName} mengajak Anda bertukar shift pada ${startFormatted}.`;
        const repMetadata = {
          ...baseMetadata,
          replacementUserName: params.replacementUserName || repUser.name,
          targetAudience: "replacement",
        };

        notificationInserts.push({
          userId: repUser.id,
          type: "SYSTEM",
          isRead: false,
          createdAt: nowIso,
          updatedAt: nowIso,
          title: repTitle,
          body: repBody,
          metadata: repMetadata,
        });

        if (
          repUser.expoPushToken &&
          typeof repUser.expoPushToken === "string" &&
          repUser.expoPushToken.startsWith("ExponentPushToken")
        ) {
          pushMessages.push({
            to: repUser.expoPushToken,
            sound: "default",
            title: repTitle,
            body: repBody,
            priority: "high",
            data: repMetadata,
          });
        }
      }
    }

    // 4. Siapkan notifikasi untuk Super Admin & HR Admin
    let adminTitle = "Pengajuan Izin Baru";
    let adminBody = `${applicantName} mengajukan izin/cuti untuk ${dateLabel}.`;

    if (params.leaveType === "Sakit") {
      adminTitle = "Pengajuan Sakit Baru";
      adminBody = `${applicantName} mengajukan izin sakit untuk ${dateLabel}.`;
    } else if (params.leaveType === "TUKAR_SHIFT") {
      adminTitle = "Pengajuan Tukar Shift Baru";
      adminBody = `${applicantName} & ${params.replacementUserName || "rekan kerja"} mengajukan tukar shift (${dateLabel}).`;
    }

    const adminMetadata = {
      ...baseMetadata,
      targetAudience: "admin",
    };

    (adminUsers || []).forEach((admin) => {
      if (notifiedIds.has(admin.id)) return;
      notifiedIds.add(admin.id);

      notificationInserts.push({
        userId: admin.id,
        type: "SYSTEM",
        isRead: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        title: adminTitle,
        body: adminBody,
        metadata: adminMetadata,
      });

      if (
        admin.expoPushToken &&
        typeof admin.expoPushToken === "string" &&
        admin.expoPushToken.startsWith("ExponentPushToken")
      ) {
        pushMessages.push({
          to: admin.expoPushToken,
          sound: "default",
          title: adminTitle,
          body: adminBody,
          priority: "high",
          data: adminMetadata,
        });
      }
    });

    // 5. Insert ke tabel notifications Supabase
    if (notificationInserts.length > 0) {
      const { error: insertNotifError } = await supabase
        .from("notifications")
        .insert(notificationInserts);

      if (insertNotifError) {
        console.error(
          "Gagal menyimpan notifikasi perizinan ke DB:",
          insertNotifError,
        );
      }
    }

    // 6. Tembak Push Notification ke Expo
    if (pushMessages.length > 0) {
      await sendPushNotificationsAsync(pushMessages);
    }

    return { success: true, count: notificationInserts.length };
  } catch (err) {
    console.error("Gagal memproses notifikasi pengajuan perizinan:", err);
    return { success: false, error: err };
  }
}
