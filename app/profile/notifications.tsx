import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
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
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch data awal
  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
      } else {
        const formattedData: Notification[] = data.map((item) => ({
          id: item.id,
          type: item.type as NotificationType,
          title: item.title,
          message: item.body,
          time: formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: id }),
          isRead: item.is_read,
        }));
        setNotifications(formattedData);
      }
    }
    setLoading(false);
  };

  // 2. Setup Realtime dengan Cleanup yang aman
  useEffect(() => {
    fetchNotifications();
    
    let channel: any;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Hapus channel lama kalau ada (mencegah error duplikasi)
      supabase.removeChannel(supabase.channel("notifications_channel"));

      channel = supabase
        .channel("notifications_channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
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
                isRead: newRow.is_read,
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
  }, []);

  // 3. Fungsi update semua dibaca
  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    }
  };

  // 4. Fungsi klik item
  const handleItemPress = async (item: Notification) => {
    if (!item.isRead) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", item.id);

      if (!error) {
        setNotifications(notifications.map(n => 
          n.id === item.id ? { ...n, isRead: true } : n
        ));
      }
    }
  };

  const getIconConfig = (type: NotificationType) => {
    switch (type) {
      case "leave": return { name: "calendar", color: "#10b981", bg: "bg-emerald-100" };
      case "payroll": return { name: "wallet", color: "#f59e0b", bg: "bg-amber-100" };
      case "patrol": return { name: "shield-checkmark", color: "#3b82f6", bg: "bg-blue-100" };
      case "system": return { name: "cog", color: "#64748b", bg: "bg-slate-200" };
      default: return { name: "notifications", color: "#3b82f6", bg: "bg-blue-100" };
    }
  };

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
            return (
              <TouchableOpacity key={item.id} activeOpacity={0.7} className={`flex-row p-4 mb-3 rounded-2xl border ${item.isRead ? "bg-white border-slate-100" : "bg-blue-50/50 border-blue-100"}`} onPress={() => handleItemPress(item)}>
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${iconConfig.bg}`}>
                  <Ionicons name={iconConfig.name as any} size={24} color={iconConfig.color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className={`flex-1 text-base mr-2 ${item.isRead ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}>{item.title}</Text>
                    {!item.isRead && <View className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5" />}
                  </View>
                  <Text className={`text-sm mb-2 ${item.isRead ? "text-slate-500" : "text-slate-700"}`} numberOfLines={2}>{item.message}</Text>
                  <Text className="text-xs text-slate-400 font-medium">{item.time}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}