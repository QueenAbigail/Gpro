import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

// Tipe data notifikasi biar rapi
type NotificationType = "patrol" | "leave" | "payroll" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();

  // Dummy data notifikasi
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "leave",
      title: "Pengajuan Cuti Disetujui",
      message:
        "Pengajuan cuti tahunan kamu untuk tanggal 20-22 Juni telah disetujui oleh HRD.",
      time: "10 menit yang lalu",
      isRead: false,
    },
    {
      id: "2",
      type: "payroll",
      title: "Slip Gaji Tersedia",
      message:
        "Slip gaji periode Mei 2026 sudah dapat diunduh di menu Informasi Akun.",
      time: "2 jam yang lalu",
      isRead: false,
    },
    {
      id: "3",
      type: "patrol",
      title: "Jadwal Patroli Diperbarui",
      message:
        "Terdapat perubahan titik patroli pada shift pagi kamu hari ini. Silakan cek menu Patroli.",
      time: "1 hari yang lalu",
      isRead: true,
    },
    {
      id: "4",
      type: "system",
      title: "Pemeliharaan Sistem",
      message:
        "Aplikasi HRIS akan mengalami pemeliharaan rutin pada hari Sabtu pukul 00:00 - 04:00 WIB.",
      time: "3 hari yang lalu",
      isRead: true,
    },
  ]);

  // Fungsi buat nandain semua notif udah dibaca
  const markAllAsRead = () => {
    const updatedNotifs = notifications.map((notif) => ({
      ...notif,
      isRead: true,
    }));
    setNotifications(updatedNotifs);
  };

  // Fungsi helper buat nentuin ikon dan warna berdasarkan tipe notifikasi
  const getIconConfig = (type: NotificationType) => {
    switch (type) {
      case "leave":
        return { name: "calendar", color: "#10b981", bg: "bg-emerald-100" }; // Hijau
      case "payroll":
        return { name: "wallet", color: "#f59e0b", bg: "bg-amber-100" }; // Kuning/Orange
      case "patrol":
        return {
          name: "shield-checkmark",
          color: "#3b82f6",
          bg: "bg-blue-100",
        }; // Biru
      case "system":
        return { name: "cog", color: "#64748b", bg: "bg-slate-200" }; // Abu-abu
      default:
        return { name: "notifications", color: "#3b82f6", bg: "bg-blue-100" };
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header (Fixed di atas, gak ikut ke-scroll) */}
      <View className="pt-16 pb-4 px-6 bg-white flex-row items-center justify-between shadow-sm border-b border-slate-100 z-10">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4 active:bg-slate-100"
          >
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Notifikasi</Text>
        </View>

        {/* Tombol Tandai Semua Dibaca (Cuma muncul kalau ada yang belum dibaca) */}
        {notifications.some((n) => !n.isRead) && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Ionicons name="checkmark-done-circle" size={28} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      {/* List Notifikasi */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {notifications.length === 0 ? (
          // Tampilan kalau notifikasi kosong
          <View className="items-center justify-center mt-32">
            <View className="w-24 h-24 bg-slate-200 rounded-full items-center justify-center mb-4">
              <Ionicons name="notifications-off" size={40} color="#94a3b8" />
            </View>
            <Text className="text-slate-600 font-bold text-lg">
              Belum Ada Notifikasi
            </Text>
            <Text className="text-slate-400 text-sm mt-1 text-center px-8">
              Saat ini tidak ada pemberitahuan baru untuk akunmu.
            </Text>
          </View>
        ) : (
          // Render item notifikasi
          notifications.map((item) => {
            const iconConfig = getIconConfig(item.type);

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                className={`flex-row p-4 mb-3 rounded-2xl border ${
                  item.isRead
                    ? "bg-white border-slate-100"
                    : "bg-blue-50/50 border-blue-100"
                }`}
                onPress={() => {
                  // Logic kalau notif diklik (bisa diarahin ke halaman spesifik nantinya)
                  const updated = notifications.map((n) =>
                    n.id === item.id ? { ...n, isRead: true } : n,
                  );
                  setNotifications(updated);
                }}
              >
                {/* Ikon */}
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${iconConfig.bg}`}
                >
                  <Ionicons
                    name={iconConfig.name as any}
                    size={24}
                    color={iconConfig.color}
                  />
                </View>

                {/* Konten Text */}
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text
                      className={`flex-1 text-base mr-2 ${item.isRead ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}
                    >
                      {item.title}
                    </Text>
                    {/* Titik indikator belum dibaca */}
                    {!item.isRead && (
                      <View className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5" />
                    )}
                  </View>
                  <Text
                    className={`text-sm mb-2 ${item.isRead ? "text-slate-500" : "text-slate-700"}`}
                    numberOfLines={2}
                  >
                    {item.message}
                  </Text>
                  <Text className="text-xs text-slate-400 font-medium">
                    {item.time}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
