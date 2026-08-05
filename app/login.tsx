import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // 👈 Untuk simpan cache lokal
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { handleDeviceVerification } from "../lib/device"; // 🛡️ IMPORT SATPAM
import { supabase } from "../lib/supabase";

// Key unik untuk simpan cache di memori HP
const CACHE_KEY_APP_SETTINGS = "@app_system_settings";

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 1. Set Nilai Default Awal (Instan tampil tanpa spinner!)
  const [appName, setAppName] = useState("Pro Maxima Rajawali");
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [appDescription, setAppDescription] = useState(
    "Sistem Informasi Manajemen Kehadiran"
  );

  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Jalankan sistem cache & background sync
    initSystemSettings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (params?.error === "device_mismatch") {
        setErrorMessage(
          params?.message
            ? String(params.message)
            : "Akun terdeteksi di perangkat lain."
        );
        setIsErrorModalVisible(true);
        router.setParams({ error: undefined, message: undefined } as any);
      }
    }, [params?.error, params?.message])
  );

  const initSystemSettings = async () => {
    try {
      // Step A: Coba baca cache dari lokal HP dulu
      const cachedData = await AsyncStorage.getItem(CACHE_KEY_APP_SETTINGS);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed.appName) setAppName(parsed.appName);
        if (parsed.appDescription) setAppDescription(parsed.appDescription);
        if (parsed.logoUrl) setAppLogo(parsed.logoUrl);
      }

      // Step B: Tarik data terbaru dari Supabase secara SILENT di background
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", "default")
        .single();

      if (!error && data) {
        // Update state kalau ada perubahan dari database
        if (data.appName) setAppName(data.appName);
        if (data.appDescription) setAppDescription(data.appDescription);
        if (data.logoUrl) setAppLogo(data.logoUrl);

        // Simpan versi terbaru ke cache lokal HP
        await AsyncStorage.setItem(CACHE_KEY_APP_SETTINGS, JSON.stringify(data));
      }
    } catch (error) {
      console.log("Background sync settings info:", error);
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

    // 1. Proses Autentikasi
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage("ID atau kata sandi tidak sesuai.");
      setIsErrorModalVisible(true);
      return;
    }

    // 2. KUNCI PENGAMAN (Check Device)
    if (data?.user) {
      const verification = await handleDeviceVerification(data.user.id);

      if (!verification.success) {
        await supabase.auth.signOut(); // Tendang langsung
        setLoading(false);
        setErrorMessage(verification.message || "Perangkat tidak diizinkan.");
        setIsErrorModalVisible(true);
        return;
      }

      // 3. Jika Lolos, Masuk ke Beranda
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
        <View className="items-center mb-10">
          <View className="w-28 h-28 bg-white rounded-3xl items-center justify-center mb-4 shadow-sm p-3 border border-sky-100">
            <Image
              source={
                appLogo
                  ? { uri: appLogo }
                  : require("../assets/images/login_icon.png")
              }
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>

          {/* Render Instan Teks tanpa Spinner */}
          <Text className="text-3xl font-extrabold text-gray-900 mb-2 text-center">
            {appName}
          </Text>

          <Text className="text-gray-500 text-center text-sm px-4">
            {appDescription}
          </Text>
        </View>

        <View className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 mb-4">
          <Text className="text-gray-800 font-bold text-lg mb-6">
            Masuk ke Akun Anda
          </Text>

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
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

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

      <Modal
        transparent
        visible={isErrorModalVisible}
        animationType="fade"
        onRequestClose={() => setIsErrorModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl items-center">
            <View className="w-14 h-14 bg-red-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="close-circle" size={32} color="#ef4444" />
            </View>
            <Text className="text-slate-800 font-bold text-lg text-center mb-2">
              Akses Ditolak
            </Text>
            <Text className="text-slate-600 text-sm text-center mb-6 leading-relaxed">
              {errorMessage}
            </Text>
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