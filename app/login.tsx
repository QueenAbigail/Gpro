import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { supabase } from "../lib/supabase";
import { handleDeviceVerification } from "../lib/device"; // 👈 1. IMPORT HELPER DEVICE VERIFICATION LU

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [appName, setAppName] = useState("Memuat...");
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [appDescription, setAppDescription] = useState(
    "Sistem Informasi Manajemen Kehadiran",
  );
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", "default")
        .single();

      if (error) throw error;

      if (data) {
        if (data.appName) setAppName(data.appName);
        if (data.logoUrl) setAppLogo(data.logoUrl);
        if (data.appDescription) setAppDescription(data.appDescription);
      }
    } catch (error) {
      console.log("Gagal menarik data dari database:", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage("ID dan kata sandi tidak boleh kosong!");
      setIsErrorModalVisible(true);
      return;
    }

    setLoading(true);

    const formattedEmail = email.includes("@") ? email : `${email}@hris.com`;

    // 1. Proses Otentikasi Email & Password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage("ID atau kata sandi tidak sesuai. Silakan coba lagi.");
      setIsErrorModalVisible(true);
    } else if (data?.user) {
      
      // 🚀 2. JALANKAN VERIFIKASI DEVICE ID SEBELUM MASUK BERANDA
      const verification = await handleDeviceVerification(data.user.id);

      if (!verification.success) {
        // Jika Device Ilegal / Diblokir Admin, paksa keluar lagi
        await supabase.auth.signOut();
        setLoading(false);
        setErrorMessage(verification.message); // Ambil pesan error dari helper device.ts
        setIsErrorModalVisible(true);
        return;
      }

      // 3. Jika Lolos Keduanya, Baru Boleh Masuk ke Beranda
      setLoading(false);
      router.replace({
        pathname: "/(tabs)",
        params: { showToast: "success" },
      } as any);
    }
  };

  return (
    <View className="flex-1 bg-sky-50">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: 60,
        }}
        enableOnAndroid={true}
        extraScrollHeight={60}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* --- HEADER LOGO & JUDUL --- */}
        <View className="items-center mb-10">
          <View className="w-28 h-28 bg-white rounded-3xl items-center justify-center mb-4 shadow-sm p-3 border border-sky-100">
            {settingsLoading ? (
              <ActivityIndicator color="#2563eb" />
            ) : appLogo ? (
              <Image
                source={{ uri: appLogo }}
                className="w-full h-full"
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="business" size={50} color="#cbd5e1" />
            )}
          </View>

          {settingsLoading ? (
            <ActivityIndicator color="#2563eb" className="mb-2" />
          ) : (
            <Text className="text-3xl font-extrabold text-gray-900 mb-2 text-center">
              {appName}
            </Text>
          )}

          <Text className="text-gray-500 text-center text-sm px-4">
            {settingsLoading ? "Memuat deskripsi..." : appDescription}
          </Text>
        </View>

        {/* --- FORM LOGIN --- */}
        <View className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 mb-4">
          <Text className="text-gray-800 font-bold text-lg mb-6">
            Masuk ke Akun Anda
          </Text>

          {/* Input Email */}
          <View className="mb-4">
            <Text className="text-gray-600 text-xs font-bold mb-2 ml-1">
              Alamat Email
            </Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
              <Ionicons
                name="person-outline"
                size={20}
                color="#9ca3af"
                className="mr-3"
              />
              <TextInput
                className="flex-1 text-gray-800 font-medium ml-2"
                placeholder="Contoh: admin@hris.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Input Password */}
          <View className="mb-8">
            <Text className="text-gray-600 text-xs font-bold mb-2 ml-1">
              Kata Sandi
            </Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#9ca3af"
                className="mr-3"
              />
              <TextInput
                className="flex-1 text-gray-800 font-medium ml-2"
                placeholder="Masukkan kata sandi"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tombol Login */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className={`w-full py-4 rounded-2xl items-center justify-center flex-row shadow-sm ${
              loading ? "bg-blue-400" : "bg-blue-600 active:bg-blue-700"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                Masuk Sekarang
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* 🔴 CUSTOM POP-UP MODAL (Gagal Login / Perangkat Tidak Cocok) */}
      <Modal
        transparent
        visible={isErrorModalVisible}
        animationType="fade"
        onRequestClose={() => setIsErrorModalVisible(false)}
      >
        {/* Backdrop Gelap */}
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          
          {/* Card Box */}
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl items-center">
            
            {/* Lingkaran Icon Silang */}
            <View className="w-14 h-14 bg-red-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="close-circle" size={32} color="#ef4444" />
            </View>

            {/* Judul & Pesan Error */}
            <Text className="text-slate-800 font-bold text-lg text-center mb-2">
              Akses Ditolak
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
              {errorMessage}
            </Text>

            {/* Tombol Aksi */}
            <TouchableOpacity
              onPress={() => setIsErrorModalVisible(false)}
              className="w-full bg-blue-600 py-3.5 rounded-2xl items-center active:bg-blue-700 shadow-sm"
            >
              <Text className="text-white font-bold text-sm">Coba Lagi</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}