import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { 
  ActivityIndicator, 
  Modal, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  View 
} from "react-native";
import { supabase } from "../../lib/supabase"; 

interface HistoryItem {
  id: string;
  type: string;
  date: string;
  duration: string;
  status: string;
  reason: string;
}

interface ModalConfig {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

// 🗓️ HELPER 1: FORMAT TANGGAL ("2026-06-29" ➡️ "29 Juni 2026")
const formatDateId = (dateStr: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ⏱️ HELPER 2: KALKULASI SELISIH HARI OTOMATIS
const calculateDuration = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return "- Hari";
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  // Ambil selisih waktu dalam milidetik, lalu ubah ke satuan hari
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 supaya inklusif (29 ke 30 dihitung 2 hari)
  
  return `${diffDays} Hari`;
};

export default function LeaveHistoryScreen() {
  const router = useRouter();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Utama Custom Alert Pop-up Aesthetic
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  useEffect(() => {
    fetchSubmissionHistory();
  }, []);

  // Fungsi pemanggil Custom Alert Cantik
  const showAlert = (title: string, message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setModalConfig({ visible: true, title, message, type });
  };

  const fetchSubmissionHistory = async () => {
    try {
      setIsLoading(true);

      // 1. Ambil session user login
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        showAlert("Gagal Autentikasi", "Sesi login tidak ditemukan. Silakan login ulang.", "error");
        return;
      }

      // 2. Query ke Supabase tabel 'leaves'
      const { data, error } = await supabase
        .from("leaves") 
        .select("*")
        .eq("userId", user.id) 
        .order("startDate", { ascending: false }); // Urutkan dari tanggal izin paling baru

      if (error) throw error;

      if (data) {
        // 3. Proses format & kalkulasi data langsung sebelum disave ke state
        const formattedData = data.map((item: any) => ({
          id: item.id.toString(),
          type: item.leaveType || "Izin", // Kolom leaveType DB        
          date: formatDateId(item.startDate), // Diubah jadi format Indonesia
          duration: calculateDuration(item.startDate, item.endDate), // Kalkulasi durasi otomatis dari DB
          status: item.status || "PENDING",    
          reason: item.reason || "-",    
        }));
        setHistory(formattedData);
      }
    } catch (error: any) {
      console.error("Gagal mengambil data riwayat:", error);
      const errorMessage = error?.message || (typeof error === "object" ? JSON.stringify(error) : String(error));
      showAlert("Gagal Memuat Data", `Detail Error: ${errorMessage}`, "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper theme warna status list (Gue bikin upperCase biar matching sama text dari DB)
  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "DISETUJUI":
      case "APPROVED":
        return { text: "text-emerald-600", bg: "bg-emerald-100" };
      case "PENDING":
        return { text: "text-amber-600", bg: "bg-amber-100" };
      case "DITOLAK":
      case "REJECTED":
        return { text: "text-red-600", bg: "bg-red-100" };
      default:
        return { text: "text-slate-600", bg: "bg-slate-100" };
    }
  };

  // Helper jenis icon list (Tetap original)
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Sakit":
        return "medkit";
      case "Tukeran Shift":
        return "swap-horizontal";
      case "Izin":
        return "document-text";
      default:
        return "document-text";
    }
  };

  // Helper styling dinamis untuk tema warna Pop-up Alert
  const getModalTheme = () => {
    switch (modalConfig.type) {
      case "error":
        return { icon: "close-circle" as const, color: "#ef4444", bg: "bg-red-50", btn: "bg-red-500 active:bg-red-600" };
      case "warning":
        return { icon: "warning" as const, color: "#f59e0b", bg: "bg-amber-50", btn: "bg-amber-500 active:bg-amber-600" };
      case "success":
        return { icon: "checkmark-circle" as const, color: "#10b981", bg: "bg-emerald-50", btn: "bg-emerald-500 active:bg-emerald-600" };
      case "info":
      default:
        return { icon: "information-circle" as const, color: "#3b82f6", bg: "bg-blue-50", btn: "bg-blue-500 active:bg-blue-600" };
    }
  };

  const theme = getModalTheme();

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="pt-16 pb-4 px-6 bg-white flex-row items-center border-b border-slate-100 shadow-sm z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4 active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-slate-800">Riwayat Pengajuan</Text>
          <Text className="text-slate-500 text-xs mt-0.5">Seluruh data sakit, izin, & tukar shift</Text>
        </View>
      </View>

      {/* List History Full */}
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-400 text-xs mt-3">Memuat riwayat...</Text>
          </View>
        ) : history.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-slate-400 text-sm font-semibold">Belum ada riwayat pengajuan</Text>
          </View>
        ) : (
          history.map((item) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <TouchableOpacity
                key={item.id}
                className="bg-white p-4 rounded-2xl mb-4 border border-slate-100 shadow-sm flex-row items-center active:bg-slate-50"
              >
                <View className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center mr-4">
                  <Ionicons name={getTypeIcon(item.type) as any} size={24} color="#64748b" />
                </View>

                <View className="flex-1">
                  <Text className="text-slate-800 font-bold mb-1">{item.type}</Text>
                  <Text className="text-slate-500 text-xs mb-1">{item.date} • {item.duration}</Text>
                  <Text className="text-slate-400 text-xs truncate" numberOfLines={1}>"{item.reason}"</Text>
                </View>

                <View className={`px-3 py-1.5 rounded-full ${statusStyle.bg}`}>
                  <Text className={`text-[10px] font-bold uppercase ${statusStyle.text}`}>{item.status}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* 🔮 CUSTOM ALERT MODAL POP-UP GANTENG */}
      <Modal
        transparent
        visible={modalConfig.visible}
        animationType="fade"
        onRequestClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl items-center">
            
            {/* Icon Box */}
            <View className={`w-14 h-14 ${theme.bg} rounded-full items-center justify-center mb-4`}>
              <Ionicons name={theme.icon} size={28} color={theme.color} />
            </View>

            {/* Text Content */}
            <Text className="text-slate-800 font-bold text-lg text-center mb-2">{modalConfig.title}</Text>
            <Text className="text-slate-400 text-xs text-center mb-6 leading-relaxed px-2">{modalConfig.message}</Text>

            {/* Action Button */}
            <TouchableOpacity
              onPress={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
              className={`w-full ${theme.btn} py-3.5 rounded-2xl items-center shadow-sm`}
            >
              <Text className="text-white font-bold text-sm">Oke</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}