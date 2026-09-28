import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

interface ModalConfig {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  onPress?: () => void;
}

export default function TukarShiftScreen() {
  const router = useRouter();

  // State untuk form tukar shift
  const [myShiftDate, setMyShiftDate] = useState<Date>(new Date());
  const [myShiftType, setMyShiftType] = useState("");
  const [replacementUser, setReplacementUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [targetShiftDate, setTargetShiftDate] = useState<Date>(new Date());
  const [targetShiftType, setTargetShiftType] = useState("");
  const [reason, setReason] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [coworkers, setCoworkers] = useState<any[]>([]);

  // State UI Modals
  const [showMyDatePicker, setShowMyDatePicker] = useState(false);
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const [showCoworkerModal, setShowCoworkerModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState<{
    visible: boolean;
    target: "my" | "target";
  }>({ visible: false, target: "my" });

  const shiftOptions = [
    "Shift Pagi",
    "Shift Middle",
    "Shift Sore",
    "Shift Malam",
  ];

  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  // Fetch teman 1 site dari Supabase saat komponen diload
  useEffect(() => {
    const fetchCoworkers = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return;

        // Ambil siteId user
        const { data: myProfile } = await supabase
          .from("users")
          .select("siteId")
          .eq("id", authData.user.id)
          .single();

        if (myProfile?.siteId) {
          // Cari teman-teman 1 site
          const { data: friends } = await supabase
            .from("users")
            .select("id, name, employeeCode, role")
            .eq("siteId", myProfile.siteId)
            .neq("id", authData.user.id);

          if (friends) setCoworkers(friends);
        }
      } catch (error) {
        console.error("Gagal load rekan kerja:", error);
      }
    };
    fetchCoworkers();
  }, []);

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
    onPress?: () => void,
  ) => {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      onPress,
    });
  };

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  const formatForDB = (date: Date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (!myShiftType || !replacementUser || !targetShiftType || !reason) {
      showAlert(
        "Data Belum Lengkap",
        "Mohon lengkapi semua kolom form tukar shift sebelum mengirim!",
        "warning",
      );
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sesi tidak valid");

      const { error } = await supabase.from("leaves").insert({
        userId: authData.user.id,
        leaveType: "TUKAR_SHIFT",
        startDate: formatForDB(myShiftDate),
        endDate: formatForDB(targetShiftDate),
        reason: reason,
        status: "Pending",
        replacementUserId: replacementUser.id,
        originalShiftType: myShiftType,
        targetShiftType: targetShiftType,
      });

      if (error) throw error;

      setIsLoading(false);
      showAlert(
        "Pengajuan Berhasil",
        "Pengajuan tukar shift berhasil dikirim! Silakan tunggu konfirmasi HRD/Koordinator.",
        "success",
        () => router.back(),
      );
    } catch (error: any) {
      setIsLoading(false);
      showAlert(
        "Gagal Mengajukan",
        error.message || "Terjadi kesalahan server",
        "error",
      );
    }
  };

  const getModalTheme = () => {
    switch (modalConfig.type) {
      case "success":
        return {
          icon: "checkmark-circle" as const,
          color: "#10b981",
          bg: "bg-emerald-50",
          btn: "bg-emerald-500 active:bg-emerald-600",
        };
      case "error":
        return {
          icon: "close-circle" as const,
          color: "#ef4444",
          bg: "bg-red-50",
          btn: "bg-red-500 active:bg-red-600",
        };
      case "warning":
        return {
          icon: "warning" as const,
          color: "#f59e0b",
          bg: "bg-amber-50",
          btn: "bg-amber-500 active:bg-amber-600",
        };
      case "info":
      default:
        return {
          icon: "information-circle" as const,
          color: "#3b82f6",
          bg: "bg-blue-50",
          btn: "bg-blue-500 active:bg-blue-600",
        };
    }
  };

  const theme = getModalTheme();

  return (
    <View className="flex-1 bg-slate-50">
      <View className="pt-14 pb-2 px-6 bg-white flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3 active:bg-slate-200"
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-slate-900">Tukar Shift</Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            Ajukan penggantian jadwal dengan rekan kerja
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Section 1: Jadwal Kamu */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Jadwal Shift Kamu
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="mb-4">
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Tanggal Shift Kamu
            </Text>
            <TouchableOpacity
              onPress={() => setShowMyDatePicker(true)}
              className="flex-row items-center border border-slate-200 rounded-xl px-3 py-4 bg-slate-50"
            >
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
              <Text className="flex-1 ml-3 text-slate-800 text-sm">
                {formatDate(myShiftDate)}
              </Text>
            </TouchableOpacity>
            {showMyDatePicker && (
              <DateTimePicker
                value={myShiftDate}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowMyDatePicker(false);
                  if (date) setMyShiftDate(date);
                }}
              />
            )}
          </View>
          <View>
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Jenis Shift Asli
            </Text>
            <TouchableOpacity
              onPress={() => setShowShiftModal({ visible: true, target: "my" })}
              className="flex-row items-center border border-slate-200 rounded-xl px-3 py-4 bg-slate-50"
            >
              <Ionicons name="time-outline" size={18} color="#64748b" />
              <Text
                className={`flex-1 ml-3 text-sm ${myShiftType ? "text-slate-800" : "text-slate-400"}`}
              >
                {myShiftType || "Pilih Jenis Shift..."}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Rekan Kerja */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Rekan Kerja Pengganti
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <Text className="text-slate-500 text-xs font-semibold mb-2">
            Pilih Rekan 1 Area/Site
          </Text>
          <TouchableOpacity
            onPress={() => setShowCoworkerModal(true)}
            className="flex-row items-center border border-slate-200 rounded-xl px-3 py-4 bg-slate-50"
          >
            <Ionicons name="person-outline" size={18} color="#64748b" />
            <Text
              className={`flex-1 ml-3 text-sm ${replacementUser ? "text-slate-800 font-semibold" : "text-slate-400"}`}
            >
              {replacementUser ? replacementUser.name : "Pilih Karyawan..."}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section 3: Jadwal Tujuan */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Jadwal Shift Tukaran
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="mb-4">
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Tanggal Shift Tujuan
            </Text>
            <TouchableOpacity
              onPress={() => setShowTargetDatePicker(true)}
              className="flex-row items-center border border-slate-200 rounded-xl px-3 py-4 bg-slate-50"
            >
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
              <Text className="flex-1 ml-3 text-slate-800 text-sm">
                {formatDate(targetShiftDate)}
              </Text>
            </TouchableOpacity>
            {showTargetDatePicker && (
              <DateTimePicker
                value={targetShiftDate}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowTargetDatePicker(false);
                  if (date) setTargetShiftDate(date);
                }}
              />
            )}
          </View>
          <View>
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Jenis Shift Tujuan
            </Text>
            <TouchableOpacity
              onPress={() =>
                setShowShiftModal({ visible: true, target: "target" })
              }
              className="flex-row items-center border border-slate-200 rounded-xl px-3 py-4 bg-slate-50"
            >
              <Ionicons name="time-outline" size={18} color="#64748b" />
              <Text
                className={`flex-1 ml-3 text-sm ${targetShiftType ? "text-slate-800" : "text-slate-400"}`}
              >
                {targetShiftType || "Pilih Jenis Shift..."}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Alasan */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Alasan Tukar Shift
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-8">
          <View className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 h-28">
            <TextInput
              placeholder="Berikan alasan yang jelas (misal: Ada keperluan keluarga mendadak)..."
              placeholderTextColor="#cbd5e1"
              multiline
              textAlignVertical="top"
              className="flex-1 text-slate-800 text-sm"
              value={reason}
              onChangeText={setReason}
            />
          </View>
        </View>

        {/* Tombol Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl items-center flex-row justify-center mb-4 ${isLoading ? "bg-blue-400" : "bg-blue-600 active:bg-blue-700"}`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="sync-outline" size={20} color="white" />
              <Text className="text-white font-bold ml-2 text-base">
                Ajukan Tukar Shift
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL PILIH REKAN KERJA */}
      <Modal
        visible={showCoworkerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCoworkerModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-3/4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-slate-800">
                Pilih Rekan Pengganti
              </Text>
              <TouchableOpacity
                onPress={() => setShowCoworkerModal(false)}
                className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {coworkers.map((worker) => (
                <TouchableOpacity
                  key={worker.id}
                  onPress={() => {
                    setReplacementUser({ id: worker.id, name: worker.name });
                    setShowCoworkerModal(false);
                  }}
                  className="flex-row items-center border-b border-slate-100 py-4"
                >
                  <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-4">
                    <Ionicons name="person" size={18} color="#3b82f6" />
                  </View>
                  <View>
                    <Text className="font-bold text-slate-800 text-base">
                      {worker.name}
                    </Text>
                    <Text className="text-slate-400 text-xs">
                      {worker.role} • {worker.employeeCode}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {coworkers.length === 0 && (
                <Text className="text-center text-slate-400 mt-10">
                  Belum ada rekan kerja di area ini.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL PILIH JENIS SHIFT */}
      <Modal
        visible={showShiftModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowShiftModal({ visible: false, target: "my" })
        }
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6">
            <Text className="text-lg font-bold text-slate-800 mb-4 text-center">
              Pilih Jenis Shift
            </Text>
            {shiftOptions.map((opt, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  showShiftModal.target === "my"
                    ? setMyShiftType(opt)
                    : setTargetShiftType(opt);
                  setShowShiftModal({ visible: false, target: "my" });
                }}
                className="py-4 border-b border-slate-100 items-center"
              >
                <Text className="text-slate-700 font-semibold text-base">
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* MODAL ALERT AESTHETIC */}
      <Modal transparent visible={modalConfig.visible} animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl items-center">
            <View
              className={`w-14 h-14 ${theme.bg} rounded-full items-center justify-center mb-4`}
            >
              <Ionicons name={theme.icon} size={28} color={theme.color} />
            </View>
            <Text className="text-slate-800 font-bold text-lg text-center mb-2">
              {modalConfig.title}
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-6 leading-relaxed px-2">
              {modalConfig.message}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setModalConfig((prev) => ({ ...prev, visible: false }));
                if (modalConfig.onPress) modalConfig.onPress();
              }}
              className={`w-full ${theme.btn} py-3.5 rounded-2xl items-center`}
            >
              <Text className="text-white font-bold text-sm">Oke Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
