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

  const [myUserId, setMyUserId] = useState<string | null>(null);

  // Form states
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

  // 💡 STATE HYBRID (Auto vs Manual)
  const [isMyShiftManual, setIsMyShiftManual] = useState(false);
  const [isTargetShiftManual, setIsTargetShiftManual] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState<{
    visible: boolean;
    target: "my" | "target";
  }>({ visible: false, target: "my" });

  const shiftOptions = [
    "Shift Pagi",
    "Shift Middle",
    "Shift Sore",
    "Shift Malam",
    "Libur (Day Off)",
  ];

  // UI Modals
  const [showMyDatePicker, setShowMyDatePicker] = useState(false);
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const [showCoworkerModal, setShowCoworkerModal] = useState(false);

  const [isCalculatingMyShift, setIsCalculatingMyShift] = useState(false);
  const [isCalculatingTargetShift, setIsCalculatingTargetShift] =
    useState(false);

  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return;
        setMyUserId(authData.user.id);

        const { data: myProfile } = await supabase
          .from("users")
          .select("siteId")
          .eq("id", authData.user.id)
          .single();

        if (myProfile?.siteId) {
          const { data: friends } = await supabase
            .from("users")
            .select("id, name, employeeCode, role")
            .eq("siteId", myProfile.siteId)
            .neq("id", authData.user.id);
          if (friends) setCoworkers(friends);
        }
      } catch (error) {
        console.error("Gagal load data awal:", error);
      }
    };
    initData();
  }, []);

  const getAutoShift = async (userId: string, targetDate: Date) => {
    try {
      const { data: assignment } = await supabase
        .from("employee_pattern_assignments")
        .select("startDate")
        .eq("userId", userId)
        .maybeSingle();

      if (!assignment?.startDate) return "NOT_FOUND"; // 💡 Kembalikan NOT_FOUND jika kosong

      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);

      const start = new Date(assignment.startDate);
      start.setHours(0, 0, 0, 0);

      const diffTime = target.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return "NOT_FOUND";

      const cycleDay = diffDays % 8;
      if (cycleDay === 0 || cycleDay === 1) return "Shift Pagi";
      if (cycleDay === 2 || cycleDay === 3) return "Shift Sore";
      if (cycleDay === 4 || cycleDay === 5) return "Shift Malam";
      return "Libur (Day Off)";
    } catch (error) {
      console.error("Error ngitung shift:", error);
      return "NOT_FOUND";
    }
  };

  // 💡 Kalkulasi Shift Pemohon
  useEffect(() => {
    if (!myUserId) return;
    const fetchMyShift = async () => {
      setIsCalculatingMyShift(true);
      const shift = await getAutoShift(myUserId, myShiftDate);

      if (shift === "NOT_FOUND") {
        setIsMyShiftManual(true);
        setMyShiftType(""); // Kosongin biar muncul placeholder
      } else {
        setIsMyShiftManual(false);
        setMyShiftType(shift);
      }
      setIsCalculatingMyShift(false);
    };
    fetchMyShift();
  }, [myShiftDate, myUserId]);

  // 💡 Kalkulasi Shift Pengganti
  useEffect(() => {
    if (!replacementUser?.id) {
      setIsTargetShiftManual(false);
      setTargetShiftType("Pilih Rekan Kerja Dahulu");
      return;
    }
    const fetchTargetShift = async () => {
      setIsCalculatingTargetShift(true);
      const shift = await getAutoShift(replacementUser.id, targetShiftDate);

      if (shift === "NOT_FOUND") {
        setIsTargetShiftManual(true);
        setTargetShiftType("");
      } else {
        setIsTargetShiftManual(false);
        setTargetShiftType(shift);
      }
      setIsCalculatingTargetShift(false);
    };
    fetchTargetShift();
  }, [targetShiftDate, replacementUser]);

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
    onPress?: () => void,
  ) => {
    setModalConfig({ visible: true, title, message, type, onPress });
  };

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  const formatForDB = (date: Date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (
      !replacementUser ||
      !reason.trim() ||
      !myShiftType ||
      !targetShiftType
    ) {
      showAlert(
        "Data Belum Lengkap",
        "Pilih rekan kerja pengganti, tentukan jenis shift, dan berikan alasan tukar shift sebelum mengirim.",
        "warning",
      );
      return;
    }

    if (myShiftType === "Libur (Day Off)") {
      showAlert(
        "Tidak Bisa Tukar Shift",
        "Jadwal asli kamu adalah Libur. Tidak ada jadwal dinas yang bisa ditukar/digantikan.",
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
        reason: reason.trim(),
        status: "Pending",
        replacementUserId: replacementUser.id,
        originalShiftType: myShiftType,
        targetShiftType: targetShiftType,
      });

      if (error) throw error;

      setIsLoading(false);
      showAlert(
        "Pengajuan Berhasil",
        targetShiftType === "Libur (Day Off)"
          ? `Pengajuan cover shift berhasil dikirim! Rekan (${replacementUser.name}) bersedia masuk menggantikanmu.`
          : "Pengajuan barter tukar shift berhasil dikirim! Menunggu konfirmasi rekan dan verifikasi atasan.",
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
      <View className="pt-14 pb-2 px-6 bg-white flex-row items-center border-b border-slate-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3 active:bg-slate-200"
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-slate-900">Tukar Shift</Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            Ajukan pergantian jadwal / cover tugas dengan rekan kerja
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Section 1: Jadwal Pemohon */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Jadwal Shift Kamu
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="mb-4">
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Tanggal Shift yang Ditinggal
            </Text>
            <TouchableOpacity
              onPress={() => setShowMyDatePicker(true)}
              className="flex-row items-center border border-slate-200 rounded-xl px-3 py-4 bg-slate-50"
            >
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
              <Text className="flex-1 ml-3 text-slate-800 font-semibold text-sm">
                {formatDate(myShiftDate)}
              </Text>
              <Text className="text-blue-500 text-xs font-bold">UBAH</Text>
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
              Jenis Shift Asli {isMyShiftManual ? "(Isi Manual)" : "(Otomatis)"}
            </Text>
            <TouchableOpacity
              disabled={!isMyShiftManual}
              onPress={() => setShowShiftModal({ visible: true, target: "my" })}
              className={`flex-row items-center border rounded-xl px-3 py-4 ${
                isMyShiftManual
                  ? "bg-white border-blue-200"
                  : "bg-slate-100 border-slate-100"
              }`}
            >
              <Ionicons
                name="time-outline"
                size={18}
                color={isMyShiftManual ? "#3b82f6" : "#94a3b8"}
              />
              {isCalculatingMyShift ? (
                <ActivityIndicator
                  size="small"
                  color="#3b82f6"
                  className="ml-3"
                />
              ) : (
                <View className="flex-1 ml-3 flex-row items-center justify-between">
                  <Text
                    className={`text-sm font-bold ${
                      !myShiftType
                        ? "text-slate-400"
                        : myShiftType === "Libur (Day Off)"
                          ? "text-rose-500"
                          : "text-slate-800"
                    }`}
                  >
                    {myShiftType || "Tap untuk isi (Belum ada jadwal)"}
                  </Text>
                  {isMyShiftManual && (
                    <Ionicons name="chevron-down" size={16} color="#3b82f6" />
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Rekan Kerja Pengganti */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Rekan Kerja Pengganti
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <Text className="text-slate-500 text-xs font-semibold mb-2">
            Pilih Rekan 1 Site
          </Text>
          <TouchableOpacity
            onPress={() => setShowCoworkerModal(true)}
            className="flex-row items-center border border-slate-200 rounded-xl px-3 py-4 bg-slate-50"
          >
            <Ionicons name="person-outline" size={18} color="#64748b" />
            <Text
              className={`flex-1 ml-3 text-sm ${
                replacementUser ? "text-slate-800 font-bold" : "text-slate-400"
              }`}
            >
              {replacementUser ? replacementUser.name : "Pilih Karyawan..."}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Section 3: Jadwal Tujuan */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Jadwal Rekan Pengganti
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="mb-4">
            <Text className="text-slate-500 text-xs font-semibold mb-2">
              Tanggal Shift Rekan (Samakan bila langsung cover)
            </Text>
            <TouchableOpacity
              onPress={() => setShowTargetDatePicker(true)}
              className="flex-row items-center border border-slate-200 rounded-xl px-3 py-4 bg-slate-50"
            >
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
              <Text className="flex-1 ml-3 text-slate-800 font-semibold text-sm">
                {formatDate(targetShiftDate)}
              </Text>
              <Text className="text-blue-500 text-xs font-bold">UBAH</Text>
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
              Jadwal Asli Rekan{" "}
              {isTargetShiftManual ? "(Isi Manual)" : "(Otomatis)"}
            </Text>
            <TouchableOpacity
              disabled={!isTargetShiftManual}
              onPress={() =>
                setShowShiftModal({ visible: true, target: "target" })
              }
              className={`flex-row items-center border rounded-xl px-3 py-4 ${
                isTargetShiftManual
                  ? "bg-white border-blue-200"
                  : "bg-slate-100 border-slate-100"
              }`}
            >
              <Ionicons
                name="time-outline"
                size={18}
                color={isTargetShiftManual ? "#3b82f6" : "#94a3b8"}
              />
              {isCalculatingTargetShift ? (
                <ActivityIndicator
                  size="small"
                  color="#3b82f6"
                  className="ml-3"
                />
              ) : (
                <View className="flex-1 ml-3 flex-row items-center justify-between">
                  <Text
                    className={`text-sm font-bold ${
                      targetShiftType.includes("Pilih")
                        ? "text-slate-400"
                        : targetShiftType === "Libur (Day Off)"
                          ? "text-amber-600"
                          : "text-slate-800"
                    }`}
                  >
                    {targetShiftType || "Tap untuk isi (Belum ada jadwal)"}
                  </Text>
                  {isTargetShiftManual && (
                    <Ionicons name="chevron-down" size={16} color="#3b82f6" />
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Alasan */}
        <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
          Alasan Tukar / Cover Shift
        </Text>
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-8">
          <View className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 h-28">
            <TextInput
              placeholder="Berikan alasan yang jelas..."
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
          disabled={
            isLoading || isCalculatingMyShift || isCalculatingTargetShift
          }
          className={`w-full py-4 rounded-2xl items-center flex-row justify-center mb-4 ${
            isLoading || isCalculatingMyShift || isCalculatingTargetShift
              ? "bg-blue-400"
              : "bg-blue-600 active:bg-blue-700"
          }`}
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

      {/* MODAL PILIH JENIS SHIFT MANUAL */}
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
              Pilih Jenis Shift Manual
            </Text>
            <Text className="text-xs text-slate-500 mb-4 text-center">
              Sistem mendeteksi jadwal belum di-assign oleh Admin. Silakan pilih
              secara manual.
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
                <Text
                  className={`font-semibold text-base ${opt === "Libur (Day Off)" ? "text-rose-500" : "text-slate-700"}`}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

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
            <Text className="text-slate-500 text-sm text-center mb-6 leading-relaxed px-2">
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
