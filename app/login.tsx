import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function LoginScreen() {
  const router = useRouter();

  // State Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State Pengaturan dari Database
  const [appName, setAppName] = useState("Memuat...");
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [appDescription, setAppDescription] = useState(
    "Sistem Informasi Manajemen Kehadiran",
  );
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Tarik data pas halaman dibuka
  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      // Narik spesifik baris yang id-nya 'default' sesuai gambar
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", "default")
        .single();

      if (error) throw error;

      if (data) {
        // 👇 Sekarang penulisan kolomnya udah persis sama database kamu!
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
      Alert.alert("Gagal", "Email dan password tidak boleh kosong!");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Login Gagal", error.message);
    } else {
      Alert.alert("Sukses", "Berhasil masuk!", [
        { text: "OK", onPress: () => router.replace("/(tabs)" as any) },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-sky-50"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* --- HEADER LOGO & JUDUL --- */}
          <View className="items-center mb-10 mt-10">
            <View className="w-28 h-28 bg-white rounded-3xl items-center justify-center mb-4 shadow-sm p-3 border border-sky-100">
              {settingsLoading ? (
                <ActivityIndicator color="#2563eb" />
              ) : appLogo ? (
                // Murni render pake URL gambar dari logoUrl
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
          <View className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 mb-10">
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
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
