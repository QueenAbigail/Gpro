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

export interface BkoTakenNotifParams {
  bkoId?: string | null;
  leaveId: string;
  substituteId: string;
  replacedUserId: string;
  replacedUserName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export async function sendBkoTakenNotificationsAsync(
  params: BkoTakenNotifParams,
) {
  try {
    // 1. Ambil profil lengkap personel yang mengambil backup (substitute) + nama site
    const { data: substitute } = await supabase
      .from("users")
      .select("id, name, position, role, avatar, siteId")
      .eq("id", params.substituteId)
      .maybeSingle();

    let siteName = "Site Penempatan";
    if (substitute?.siteId) {
      const { data: siteData } = await supabase
        .from("sites")
        .select("name")
        .eq("id", substitute.siteId)
        .maybeSingle();
      if (siteData?.name) siteName = siteData.name;
    }

    const substituteName = substitute?.name || "Personel";
    const substitutePosition =
      substitute?.position || substitute?.role || "Personel Lapangan";
    const substituteAvatar = substitute?.avatar || null;

    const cleanStart = String(params.startDate || "").split("T")[0];
    const cleanEnd = String(params.endDate || params.startDate || "").split(
      "T",
    )[0];
    const startFormatted = formatIndoDateShort(cleanStart);
    const endFormatted = formatIndoDateShort(cleanEnd);
    const dateLabel =
      cleanStart === cleanEnd
        ? startFormatted
        : `${startFormatted} - ${endFormatted}`;

    const nowIso = new Date().toISOString();

    const baseMetadata = {
      type: "bko",
      route: "/profile/notifications",
      bkoId: params.bkoId || null,
      leaveId: params.leaveId,
      substituteId: params.substituteId,
      substituteName,
      substitutePosition,
      substituteAvatar,
      siteName,
      replacedUserId: params.replacedUserId,
      replacedUserName: params.replacedUserName || "Karyawan",
      leaveType: params.leaveType || "Izin",
      startDate: cleanStart,
      endDate: cleanEnd,
      reason: params.reason || "Tanpa keterangan",
      sentAt: nowIso,
    };

    // 2. Query paralel: karyawan yang digantikan, Super Admin/HR, dan rekan satu site (untuk filter upper level)
    const [replacedRes, adminRes, siteUsersRes] = await Promise.all([
      params.replacedUserId && params.replacedUserId !== params.substituteId
        ? supabase
            .from("users")
            .select("id, name, expoPushToken")
            .eq("id", params.replacedUserId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("users")
        .select("id, name, role, expoPushToken")
        .in("role", ["SUPER_ADMIN", "HR_ADMIN"])
        .neq("id", params.substituteId),
      substitute?.siteId
        ? supabase
            .from("users")
            .select("id, name, role, position, siteId, expoPushToken")
            .eq("siteId", substitute.siteId)
            .neq("id", params.substituteId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (adminRes.error) {
      console.error("Gagal query Super Admin / HR untuk BKO:", adminRes.error);
    }
    if (siteUsersRes.error) {
      console.error("Gagal query upper level site untuk BKO:", siteUsersRes.error);
    }

    const notificationInserts: any[] = [];
    const pushMessages: PushMessagePayload[] = [];
    const notifiedIds = new Set<string>();
    notifiedIds.add(params.substituteId); // Jangan pernah kirim ke diri sendiri

    // 3. Prioritas 1: Karyawan yang digantikan (pesan personal)
    if (replacedRes.data && !notifiedIds.has(replacedRes.data.id)) {
      const rep = replacedRes.data;
      notifiedIds.add(rep.id);
      const repTitle = "Jadwal Anda Sudah Dibackup";
      const repBody = `${substituteName} mengambil jadwal backup menggantikan Anda pada ${dateLabel}.`;
      const repMetadata = {
        ...baseMetadata,
        targetAudience: "replaced",
      };

      notificationInserts.push({
        userId: rep.id,
        type: "SYSTEM",
        isRead: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        title: repTitle,
        body: repBody,
        metadata: repMetadata,
      });

      if (
        rep.expoPushToken &&
        typeof rep.expoPushToken === "string" &&
        rep.expoPushToken.startsWith("ExponentPushToken")
      ) {
        pushMessages.push({
          to: rep.expoPushToken,
          sound: "default",
          title: repTitle,
          body: repBody,
          priority: "high",
          data: repMetadata,
        });
      }
    }

    // 4. Prioritas 2: Super Admin, HR Admin, dan Upper Level di site tersebut
    const upperRecipients: any[] = [];
    (adminRes.data || []).forEach((u) => {
      if (!notifiedIds.has(u.id)) {
        notifiedIds.add(u.id);
        upperRecipients.push(u);
      }
    });

    (siteUsersRes.data || []).forEach((u) => {
      if (notifiedIds.has(u.id)) return;
      const roleUpper = String(u.role || "").toUpperCase();
      const pos = String(u.position || "").toLowerCase();
      const isUpperLevel =
        roleUpper.includes("ADMIN") ||
        pos.includes("danru") ||
        pos.includes("leader") ||
        pos.includes("chief") ||
        pos.includes("koordinator") ||
        pos.includes("supervisor") ||
        pos.includes("admin") ||
        pos.includes("manager");

      if (isUpperLevel) {
        notifiedIds.add(u.id);
        upperRecipients.push(u);
      }
    });

    const adminTitle = "Backup BKO Diambil";
    const adminBody = `${substituteName} mengambil jadwal backup menggantikan ${params.replacedUserName || "karyawan"} (${dateLabel}).`;
    const adminMetadata = {
      ...baseMetadata,
      targetAudience: "admin",
    };

    upperRecipients.forEach((rec) => {
      notificationInserts.push({
        userId: rec.id,
        type: "SYSTEM",
        isRead: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        title: adminTitle,
        body: adminBody,
        metadata: adminMetadata,
      });

      if (
        rec.expoPushToken &&
        typeof rec.expoPushToken === "string" &&
        rec.expoPushToken.startsWith("ExponentPushToken")
      ) {
        pushMessages.push({
          to: rec.expoPushToken,
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
          "Gagal menyimpan notifikasi BKO ke DB:",
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
    console.error("Gagal memproses notifikasi BKO:", err);
    return { success: false, error: err };
  }
}

// ============================================================================
// ⏰ PENGINGAT ABSEN MASUK OTOMATIS (LOCAL SCHEDULED NOTIFICATION — H-5 MENIT)
// ============================================================================

const ATTENDANCE_REMINDER_TYPE = "attendance_reminder";
const REMINDER_LEAD_MINUTES = 5;

const formatDateYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export async function clearAttendanceRemindersAsync() {
  if (Platform.OS === "web") return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const reminderIds = scheduled
      .filter((n) => n.content?.data?.type === ATTENDANCE_REMINDER_TYPE)
      .map((n) => n.identifier);

    await Promise.all(
      reminderIds.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id),
      ),
    );
  } catch (err) {
    console.error("Gagal membersihkan jadwal pengingat absensi:", err);
  }
}

export async function cancelTodayAttendanceReminderAsync(dateStr?: string) {
  if (Platform.OS === "web") return;
  try {
    const targetDate = dateStr || formatDateYYYYMMDD(new Date());
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matchingIds = scheduled
      .filter(
        (n) =>
          n.content?.data?.type === ATTENDANCE_REMINDER_TYPE &&
          n.content?.data?.date === targetDate,
      )
      .map((n) => n.identifier);

    await Promise.all(
      matchingIds.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id),
      ),
    );
  } catch (err) {
    console.error("Gagal membatalkan pengingat absensi hari ini:", err);
  }
}

export async function syncAttendanceRemindersAsync(userId: string) {
  if (!userId || Platform.OS === "web") return { scheduledCount: 0 };

  try {
    // Pastikan izin notifikasi sudah diberikan
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      return { scheduledCount: 0 };
    }

    // Bersihkan jadwal pengingat absen lama agar selalu fresh & bebas duplikat
    await clearAttendanceRemindersAsync();

    const now = new Date();
    const todayStr = formatDateYYYYMMDD(now);
    const endWindow = new Date(now);
    endWindow.setDate(endWindow.getDate() + 6); // 7 hari ke depan (inklusif hari ini)
    const endWindowStr = formatDateYYYYMMDD(endWindow);

    // Ambil jadwal murni dari timesheet (attendances) + daftar cuti/sakit Approved
    const [schedulesRes, leavesRes] = await Promise.all([
      supabase
        .from("attendances")
        .select("id, date, scheduledStart, actualCheckIn")
        .eq("userId", userId)
        .gte("date", todayStr)
        .lte("date", endWindowStr)
        .not("scheduledStart", "is", null)
        .order("date", { ascending: true }),
      supabase
        .from("leaves")
        .select("startDate, endDate, leaveType, status")
        .eq("userId", userId)
        .in("status", ["Approved", "Disetujui"])
        .in("leaveType", ["Izin", "Cuti", "Sakit"])
        .gte("endDate", todayStr),
    ]);

    if (schedulesRes.error) {
      console.error("Gagal membaca timesheet untuk pengingat absensi:", schedulesRes.error);
      return { scheduledCount: 0 };
    }

    const schedules = schedulesRes.data || [];
    // Silent skip jika site/karyawan belum punya jadwal timesheet
    if (schedules.length === 0) {
      return { scheduledCount: 0 };
    }

    const approvedLeaves = (leavesRes.data || []).map((l: any) => ({
      start: String(l.startDate || "").split("T")[0],
      end: String(l.endDate || l.startDate || "").split("T")[0],
    }));

    let scheduledCount = 0;

    for (const row of schedules) {
      // Skip jika sudah absen masuk atau scheduledStart kosong
      if (row.actualCheckIn || !row.scheduledStart || !row.date) continue;

      const rowDate = String(row.date).split("T")[0];

      // Skip jika tanggal tersebut karyawan sedang izin/cuti/sakit yang sudah Approved
      const isOnApprovedLeave = approvedLeaves.some(
        (lv) => lv.start && lv.end && rowDate >= lv.start && rowDate <= lv.end,
      );
      if (isOnApprovedLeave) continue;

      // Parse YYYY-MM-DD dan HH:mm
      const dateParts = rowDate.split("-").map(Number);
      const timeParts = String(row.scheduledStart).split(":").map(Number);
      if (dateParts.length !== 3 || timeParts.length < 2) continue;

      const [year, month, day] = dateParts;
      const [hour, minute] = timeParts;
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        isNaN(hour) ||
        isNaN(minute)
      ) {
        continue;
      }

      const shiftStart = new Date(year, month - 1, day, hour, minute, 0, 0);
      const triggerDate = new Date(
        shiftStart.getTime() - REMINDER_LEAD_MINUTES * 60 * 1000,
      );

      // Hanya jadwalkan jika waktu pengingat masih di masa depan (minimal +10 detik dari sekarang)
      if (triggerDate.getTime() <= Date.now() + 10_000) {
        continue;
      }

      const formattedTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Pengingat Absen Masuk",
          body: `Jadwal shift Anda dimulai pukul ${formattedTime} WIB. Jangan lupa lakukan absensi masuk.`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: ATTENDANCE_REMINDER_TYPE,
            route: "/beranda/absen/masuk",
            date: rowDate,
            scheduledStart: formattedTime,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: "default",
        },
      });

      scheduledCount += 1;
    }

    return { scheduledCount };
  } catch (err) {
    console.error("Gagal sinkronisasi pengingat absensi:", err);
    return { scheduledCount: 0, error: err };
  }
}
