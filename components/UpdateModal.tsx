// components/UpdateModal.tsx
import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase"; // Path disesuaikan ke lib/supabase
import { needsNativeUpdate } from "@/lib/versionCheck"; // Path ke lib/versionCheck

export default function UpdateModal() {
  const [showModal, setShowModal] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      const localVersion = Constants.expoConfig?.version || "1.0.0";

      const { data, error } = await supabase
        .from("system_settings")
        .select("AppVersions")
        .single();

      if (error || !data?.AppVersions) return;

      const serverVersion = data.AppVersions;

      if (needsNativeUpdate(localVersion, serverVersion)) {
        setLatestVersion(serverVersion);
        setShowModal(true);
      }
    } catch (err) {
      console.error("Gagal ngecek versi:", err);
    }
  };

  const handleRedirectToPlayStore = () => {
    const packageName = Constants.expoConfig?.android?.package || "com.promaxima.hr";
    const playStoreUrl = `market://details?id=${packageName}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;

    Linking.canOpenURL(playStoreUrl).then((supported) => {
      Linking.openURL(supported ? playStoreUrl : webUrl);
    });
  };

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl items-center">
          
          <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-4">
            <Ionicons name="cloud-download-outline" size={32} color="#2563eb" />
          </View>

          <Text className="text-slate-800 font-bold text-xl text-center mb-2">
            Pembaruan Aplikasi
          </Text>
          <Text className="text-slate-500 text-sm text-center mb-6 leading-relaxed">
            Versi baru ({latestVersion}) telah tersedia. Silakan perbarui aplikasi Anda melalui Play Store untuk melanjutkan.
          </Text>

          <TouchableOpacity
            onPress={handleRedirectToPlayStore}
            activeOpacity={0.8}
            className="w-full bg-blue-600 py-3.5 rounded-2xl items-center flex-row justify-center shadow-md active:bg-blue-700"
          >
            <Ionicons name="logo-google-playstore" size={18} color="white" />
            <Text className="text-white font-bold text-sm ml-2">
              Update di Play Store
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}