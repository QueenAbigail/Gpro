import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "@/lib/notifications";

interface NotificationPermissionModalProps {
  userId?: string;
}

export default function NotificationPermissionModal({
  userId,
}: NotificationPermissionModalProps) {
  const [showModal, setShowModal] = useState(false);
  const appState = useRef(AppState.currentState);

  const checkPermission = useCallback(async () => {
    // Abaikan jika di web atau di emulator (sesuai kebutuhan testing)
    if (Platform.OS === "web" || !Device.isDevice) {
      setShowModal(false);
      return;
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        setShowModal(false);
        if (userId) {
          registerForPushNotificationsAsync(userId);
        }
      } else {
        setShowModal(true);
      }
    } catch (err) {
      console.error("Gagal memeriksa izin notifikasi:", err);
    }
  }, [userId]);

  useEffect(() => {
    // Cek saat mount / user login
    if (userId) {
      checkPermission();
    }

    // Pantau saat user kembali dari background / menu Settings HP
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          checkPermission();
        }
        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [userId, checkPermission]);

  const handleAction = async () => {
    try {
      const { status, canAskAgain } =
        await Notifications.getPermissionsAsync();

      if (canAskAgain && status !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status === "granted") {
          setShowModal(false);
          if (userId) {
            registerForPushNotificationsAsync(userId);
          }
          return;
        }
      }

      // Jika sudah ditolak permanen, arahkan langsung ke Pengaturan Aplikasi HP
      await Linking.openSettings();
    } catch (err) {
      console.error("Error membuka pengaturan notifikasi:", err);
      Linking.openSettings();
    }
  };

  if (!showModal) return null;

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Kunci tombol back di Android
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl items-center border border-red-100">
          <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-4">
            <Ionicons name="notifications-off" size={40} color="#dc2626" />
          </View>

          <Text className="text-slate-900 font-extrabold text-xl text-center mb-2">
            Izin Notifikasi Wajib Aktif
          </Text>

          <Text className="text-slate-600 text-sm text-center mb-6 leading-relaxed">
            Untuk keselamatan dan keamanan kerja, aplikasi mewajibkan izin
            notifikasi agar Anda dapat menerima{" "}
            <Text className="font-bold text-red-600">Sinyal Darurat (SOS)</Text>{" "}
            dari rekan kerja satu site secara realtime.
          </Text>

          <TouchableOpacity
            onPress={handleAction}
            activeOpacity={0.8}
            className="w-full bg-red-600 py-4 rounded-2xl items-center flex-row justify-center shadow-lg active:bg-red-700"
          >
            <Ionicons name="settings-outline" size={20} color="white" />
            <Text className="text-white font-bold text-base ml-2">
              Buka Pengaturan HP
            </Text>
          </TouchableOpacity>

          <Text className="text-slate-400 text-xs text-center mt-4">
            Aktifkan izin notifikasi, lalu kembali ke aplikasi ini.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

