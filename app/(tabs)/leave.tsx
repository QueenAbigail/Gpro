import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase"; // Sesuaikan path ini

export default function LeaveScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("leaves")
        .select("*")
        .eq("userId", user.id) // Pastikan filter ke user yang login
        .order("createdAt", { ascending: false })
        .range(0, 3); // Hanya ambil 4 data terakhir

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Helper untuk styling warna status
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Disetujui":
        return { text: "text-emerald-600", bg: "bg-emerald-100" };
      case "Pending":
        return { text: "text-amber-600", bg: "bg-amber-100" };
      case "Ditolak":
        return { text: "text-red-600", bg: "bg-red-100" };
      default:
        return { text: "text-slate-600", bg: "bg-slate-100" };
    }
  };

  // Helper untuk icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Sakit":
        return "medkit";
      case "Tukar Shift":
        return "swap-horizontal";
      case "Izin":
        return "document-text";
      default:
        return "document-text";
    }
  };

  // Helper format tanggal
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="pt-16 pb-4 px-6 bg-white border-b border-slate-100 shadow-sm z-10">
        <Text className="text-2xl font-bold text-slate-800">Perizinan</Text>
        <Text className="text-slate-500 mt-1">
          Buat pengajuan sakit, izin, atau tukar shift
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text className="text-slate-800 font-bold text-lg mb-4">
          Buat Pengajuan Baru
        </Text>
        <View className="flex-row justify-between mb-8">
          <TouchableOpacity
            onPress={() => router.push("/leave/sakit")}
            className="flex-1 bg-white p-4 rounded-2xl items-center border border-slate-100 shadow-sm mr-3"
          >
            <View className="w-12 h-12 bg-red-50 rounded-full items-center justify-center mb-2">
              <Ionicons name="medkit" size={24} color="#ef4444" />
            </View>
            <Text className="text-slate-700 font-semibold text-sm">Sakit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/leave/izin")}
            className="flex-1 bg-white p-4 rounded-2xl items-center border border-slate-100 shadow-sm mr-3"
          >
            <View className="w-12 h-12 bg-amber-50 rounded-full items-center justify-center mb-2">
              <Ionicons name="document-text" size={24} color="#f59e0b" />
            </View>
            <Text className="text-slate-700 font-semibold text-sm">Cuti</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/leave/tukar-shift")}
            className="flex-1 bg-white p-4 rounded-2xl items-center border border-slate-100 shadow-sm"
          >
            <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center mb-2">
              <Ionicons name="swap-horizontal" size={24} color="#3b82f6" />
            </View>
            <Text className="text-slate-700 font-semibold text-sm text-center">
              Tukar Shift
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-slate-800 font-bold text-lg">
            Riwayat Pengajuan
          </Text>
          <TouchableOpacity onPress={() => router.push("/leave/history")}>
            <Text className="text-blue-500 font-semibold text-sm">
              Lihat Semua
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : history.length === 0 ? (
          <Text className="text-slate-400 text-center mt-4">
            Belum ada riwayat pengajuan.
          </Text>
        ) : (
          history.map((item) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <TouchableOpacity
                key={item.id}
                className="bg-white p-4 rounded-2xl mb-4 border border-slate-100 shadow-sm flex-row items-center"
              >
                <View className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center mr-4">
                  <Ionicons
                    name={getTypeIcon(item.leaveType) as any}
                    size={24}
                    color="#64748b"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 font-bold mb-1">
                    {item.leaveType}
                  </Text>
                  <Text className="text-slate-500 text-xs mb-1">
                    {formatDate(item.startDate)}
                  </Text>
                  <Text className="text-slate-400 text-xs" numberOfLines={1}>
                    "{item.reason}"
                  </Text>
                </View>
                <View className={`px-3 py-1.5 rounded-full ${statusStyle.bg}`}>
                  <Text
                    className={`text-[10px] font-bold uppercase ${statusStyle.text}`}
                  >
                    {item.status}
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
