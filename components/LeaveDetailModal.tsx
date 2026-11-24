import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import ImageViewerModal from "./ImageViewerModal";

export interface LeaveRecord {
  id: string | number;
  userId?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: string;
  attachmentUrl?: string | null;
  replacementUserId?: string | null;
  originalShiftType?: string | null;
  targetShiftType?: string | null;
  createdAt?: string;
  [key: string]: any;
}

export interface LeaveDetailModalProps {
  visible: boolean;
  leave: LeaveRecord | null;
  onClose: () => void;
}

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

export default function LeaveDetailModal({
  visible,
  leave,
  onClose,
}: LeaveDetailModalProps) {
  const [replacementName, setReplacementName] = useState<string>("Rekan Pengganti");
  const [previewAttachmentUri, setPreviewAttachmentUri] = useState<string | null>(null);

  // Fetch nama pengganti jika ada replacementUserId
  useEffect(() => {
    if (!visible || !leave) {
      setReplacementName("Rekan Pengganti");
      return;
    }

    let isMounted = true;
    const fetchReplacement = async () => {
      try {
        if (leave.replacementUserId) {
          const { data } = await supabase
            .from("users")
            .select("name")
            .eq("id", leave.replacementUserId)
            .maybeSingle();

          if (isMounted && data?.name) {
            setReplacementName(data.name);
          }
        }
      } catch {
        // Abaikan error fetch jika gagal
      }
    };

    fetchReplacement();

    return () => {
      isMounted = false;
    };
  }, [visible, leave]);

  if (!visible || !leave) return null;

  const leaveTypeRaw = String(leave.leaveType || "Izin");
  const isTukarShift =
    leaveTypeRaw.toUpperCase() === "TUKAR_SHIFT" ||
    leaveTypeRaw.toLowerCase().includes("tukar");
  const isSakit = leaveTypeRaw.toLowerCase() === "sakit";

  const startDate = leave.startDate || null;
  const endDate = leave.endDate || startDate;
  const reason = leave.reason || "Tidak ada keterangan.";
  const attachmentUrl = leave.attachmentUrl || null;

  // Format Nama File Lampiran
  let attachmentFileName = isSakit ? "surat_dokter.jpg" : "form_izin_ttd.jpg";
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

  // Status mapping
  const statusRaw = String(leave.status || "Pending").toUpperCase();
  let statusType: "Pending" | "Approved" | "Rejected" = "Pending";
  if (statusRaw === "APPROVED" || statusRaw === "DISETUJUI") {
    statusType = "Approved";
  } else if (statusRaw === "REJECTED" || statusRaw === "DITOLAK") {
    statusType = "Rejected";
  }

  const isApproved = statusType === "Approved";
  const isRejected = statusType === "Rejected";

  // Header Theme
  let bubbleClass = "bg-blue-100 border-blue-200";
  let iconName: any = "document-text";
  let iconColor = "#2563eb";
  let modalTitle = "PENGAJUAN IZIN";
  let modalSubtitle = "Permohonan izin / cuti dengan lampiran dokumen form";

  if (isTukarShift) {
    bubbleClass = "bg-emerald-100 border-emerald-200";
    iconName = "swap-horizontal";
    iconColor = "#059669";
    modalTitle = "PENGAJUAN TUKAR SHIFT";
    modalSubtitle = "Permohonan barter jadwal dinas antar karyawan";
  } else if (isSakit) {
    bubbleClass = "bg-red-100 border-red-200";
    iconName = "medkit";
    iconColor = "#dc2626";
    modalTitle = "PENGAJUAN SAKIT";
    modalSubtitle = "Izin sakit dengan lampiran surat keterangan dokter";
  }

  // Status Theme
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
  const statusTitleText = `Status : ${statusType}`;
  const statusSubText = isApproved
    ? "Telah Disetujui"
    : isRejected
      ? "Pengajuan Ditolak"
      : "Menunggu Persetujuan";

  const dateRangeText =
    startDate === endDate || !endDate
      ? formatShortIndoDate(startDate)
      : `${formatShortIndoDate(startDate)} - ${formatShortIndoDate(endDate)}`;
  const durationText = calculateLeaveDuration(startDate, endDate);

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[86%]">
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: "center" }}
            >
              {/* Header Icon Bubble */}
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

              {/* Detail Content Box */}
              {isTukarShift ? (
                <View className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-4">
                  {/* Shift Comparison (2 Kolom) */}
                  <View className="flex-row mb-3">
                    <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 items-center mr-2">
                      <Text
                        className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 text-center"
                        numberOfLines={1}
                      >
                        Shift Pemohon
                      </Text>
                      <Text
                        className="text-xs font-extrabold text-slate-900 text-center"
                        numberOfLines={1}
                      >
                        {leave.originalShiftType || "Shift Asli"}
                      </Text>
                      <Text className="text-[10px] text-blue-600 font-semibold mt-0.5">
                        {formatShortIndoDate(startDate)}
                      </Text>
                    </View>

                    <View className="flex-1 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 items-center">
                      <Text
                        className="text-[10px] text-blue-600 font-bold uppercase mb-0.5 text-center"
                        numberOfLines={1}
                      >
                        {`Pengganti (${replacementName})`}
                      </Text>
                      <Text
                        className="text-xs font-extrabold text-blue-900 text-center"
                        numberOfLines={1}
                      >
                        {leave.targetShiftType || "Shift Pengganti"}
                      </Text>
                      <Text className="text-[10px] text-blue-700 font-semibold mt-0.5">
                        {formatShortIndoDate(endDate)}
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
                        {reason}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-3">
                  {/* Periode & Durasi */}
                  <View className="flex-row items-start justify-between border-b border-slate-200 pb-2.5 mb-2.5">
                    <Text className="text-xs text-slate-500 font-medium">
                      {isSakit ? "Periode Sakit" : "Periode Izin"}
                    </Text>
                    <View className="items-end flex-1 ml-2">
                      <Text className="text-xs font-bold text-slate-900 text-right">
                        {dateRangeText}
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded mt-1 ${
                          isSakit ? "bg-red-50" : "bg-blue-50"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-semibold ${
                            isSakit ? "text-red-600" : "text-blue-600"
                          }`}
                        >
                          Durasi: {durationText}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Alasan / Keluhan */}
                  <View className={attachmentUrl ? "mb-2.5" : ""}>
                    <Text className="text-xs text-slate-500 font-medium mb-1">
                      {isSakit ? "Diagnosa / Keluhan" : "Alasan Pengajuan"}
                    </Text>
                    <View className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <Text className="text-xs text-slate-700 font-semibold leading-relaxed">
                        {reason}
                      </Text>
                    </View>
                  </View>

                  {/* Lampiran Dokumen / Surat Dokter */}
                  {attachmentUrl && (
                    <View>
                      <Text className="text-xs text-slate-500 font-medium mb-1">
                        {isSakit ? "Lampiran Surat Dokter" : "Lampiran Form Izin"}
                      </Text>
                      <View className="bg-white p-2 rounded-xl border border-slate-200 flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 mr-2 min-w-0">
                          <View
                            className={`w-9 h-9 rounded-lg border items-center justify-center mr-2.5 ${
                              isSakit
                                ? "bg-red-50 border-red-100"
                                : "bg-blue-50 border-blue-100"
                            }`}
                          >
                            <Ionicons
                              name="image-outline"
                              size={18}
                              color={isSakit ? "#ef4444" : "#2563eb"}
                            />
                          </View>
                          <View className="flex-1 min-w-0">
                            <Text
                              className="text-xs font-bold text-slate-800"
                              numberOfLines={1}
                            >
                              {attachmentFileName}
                            </Text>
                            <Text className="text-[10px] text-slate-400">
                              {isSakit
                                ? "Bukti resmi terlampir"
                                : "Dokumen bertanda tangan"}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => setPreviewAttachmentUri(attachmentUrl)}
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
              )}

              {/* Status Card Ringkas */}
              <View
                className={`w-full border rounded-2xl p-3 mb-4 flex-row items-center justify-between ${cardStyle}`}
              >
                <View className="flex-1 mr-2">
                  <Text className={`text-xs font-extrabold ${titleStyle}`}>
                    {statusTitleText}
                  </Text>
                  <Text className={`text-[11px] font-medium ${subStyle}`}>
                    {statusSubText}
                  </Text>
                </View>
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center ${iconWrapStyle}`}
                >
                  <Ionicons
                    name={statusIconName as any}
                    size={16}
                    color={statusIconColor}
                  />
                </View>
              </View>

              {/* Tombol Tutup */}
              <TouchableOpacity
                onPress={onClose}
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

      {/* Fullscreen Image Lightbox dengan Pinch-to-Zoom & Tap backdrop to close */}
      <ImageViewerModal
        visible={!!previewAttachmentUri}
        imageUrl={previewAttachmentUri}
        onClose={() => setPreviewAttachmentUri(null)}
      />
    </>
  );
}
