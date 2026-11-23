import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Modal, Text, TouchableOpacity, View } from "react-native";

interface AttendancePhotoModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  photoUrl?: string | null;
}

export function AttendancePhotoModal({
  visible,
  onClose,
  title = "Foto Kehadiran",
  subtitle,
  photoUrl,
}: AttendancePhotoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-white rounded-t-3xl overflow-hidden pb-8 max-h-[85%]">
          <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
            <View className="flex-1 mr-3">
              <Text className="text-lg font-bold text-gray-900">{title}</Text>
              {subtitle ? (
                <Text
                  className="text-gray-500 text-xs mt-0.5"
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View className="p-5 items-center">
            {photoUrl ? (
              <View className="w-full rounded-2xl bg-slate-100 overflow-hidden">
                <Image
                  source={{ uri: photoUrl }}
                  style={{ width: "100%", height: 440 }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View className="w-full h-80 rounded-2xl bg-gray-100 items-center justify-center border border-gray-200 border-dashed">
                <Ionicons
                  name="image-outline"
                  size={48}
                  color="#cbd5e1"
                  style={{ marginBottom: 8 }}
                />
                <Text className="text-gray-400 font-medium text-xs">
                  Foto tidak tersedia
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface AttendanceNoPhotoModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
}

export function AttendanceNoPhotoModal({
  visible,
  onClose,
  title = "Belum Ada Bukti Kehadiran",
}: AttendanceNoPhotoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-6 z-50">
        <View className="bg-white w-full max-w-xs rounded-3xl p-6 items-center shadow-xl">
          <View className="w-16 h-16 bg-amber-50 rounded-full items-center justify-center mb-4 border border-amber-100">
            <Ionicons name="camera-outline" size={32} color="#f59e0b" />
          </View>
          <Text className="text-slate-900 font-bold text-lg text-center mb-6">
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-full py-3.5 bg-slate-900 active:bg-slate-800 rounded-2xl items-center shadow-sm"
          >
            <Text className="text-white font-bold text-sm">Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
