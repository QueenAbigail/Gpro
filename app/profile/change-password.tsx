import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// 👇 WAJIB IMPORT SUPABASE DI SINI
import { supabase } from "../../lib/supabase";

export default function ChangePasswordScreen() {
  const router = useRouter();

  // State untuk form input
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // State untuk toggle show/hide mata di masing-masing input
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // State loading saat submit
  const [isLoading, setIsLoading] = useState(false);

  // 👇 FUNGSI INI UDAH DIUBAH JADI ASYNC BUAT NEMBAK DATABASE
  const handleSavePassword = async () => {
    // 1. Validasi basic sebelum nembak ke database
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Perhatian", "Semua kolom password harus diisi!");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Perhatian",
        "Password baru dan konfirmasi password tidak cocok!",
      );
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Perhatian", "Password baru minimal 6 karakter!");
      return;
    }

    setIsLoading(true);

    try {
      // 2. Ambil data sesi user yang lagi login sekarang buat dapet emailnya
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user?.email) {
        throw new Error(
          "Gagal memverifikasi sesi pengguna. Silakan login ulang.",
        );
      }

      const userEmail = authData.user.email;

      // 3. Verifikasi Password Lama (Login Ulang Diam-diam)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: oldPassword,
      });

      if (signInError) {
        throw new Error("Password saat ini yang Anda masukkan salah!");
      }

      // 4. Kalau password lama bener, baru Update Password Baru
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // 5. Sukses!
      Alert.alert(
        "Berhasil",
        "Password berhasil diperbarui! Silakan gunakan password baru untuk login berikutnya.",
      );

      // Bersihin form biar rapi sebelum balik
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      router.back();
    } catch (error: any) {
      Alert.alert(
        "Gagal Menyimpan",
        error.message || "Terjadi kesalahan sistem.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50 pt-16 px-6"
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* Header */}
      <View className="flex-row items-center mb-8">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Ubah Password</Text>
      </View>

      {/* Ilustrasi & Teks Info */}
      <View className="items-center mb-8">
        <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="shield-checkmark" size={40} color="#3b82f6" />
        </View>
        <Text className="text-slate-800 text-lg font-bold text-center">
          Buat Password Baru
        </Text>
        <Text className="text-slate-500 text-sm text-center mt-2 px-4 leading-relaxed">
          Gunakan kombinasi yang kuat agar akunmu tetap aman. Jangan bagikan
          password ini ke siapa pun.
        </Text>
      </View>

      {/* Form Area */}
      <View className="mb-8">
        {/* Input Password Lama */}
        <Text className="text-slate-800 font-bold mb-2 ml-1">
          Password Saat Ini
        </Text>
        <View className="flex-row items-center bg-white rounded-2xl border border-slate-200 mb-5 px-4 h-14">
          <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 text-slate-800 text-base ml-3 h-full"
            placeholder="Masukkan password lama..."
            placeholderTextColor="#cbd5e1"
            secureTextEntry={!showOld}
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TouchableOpacity
            onPress={() => setShowOld(!showOld)}
            className="p-2"
          >
            <Ionicons
              name={showOld ? "eye-off" : "eye"}
              size={20}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>

        {/* Input Password Baru */}
        <Text className="text-slate-800 font-bold mb-2 ml-1">
          Password Baru
        </Text>
        <View className="flex-row items-center bg-white rounded-2xl border border-slate-200 mb-5 px-4 h-14">
          <Ionicons name="key-outline" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 text-slate-800 text-base ml-3 h-full"
            placeholder="Ketik password baru..."
            placeholderTextColor="#cbd5e1"
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity
            onPress={() => setShowNew(!showNew)}
            className="p-2"
          >
            <Ionicons
              name={showNew ? "eye-off" : "eye"}
              size={20}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>

        {/* Input Konfirmasi Password Baru */}
        <Text className="text-slate-800 font-bold mb-2 ml-1">
          Konfirmasi Password Baru
        </Text>
        <View className="flex-row items-center bg-white rounded-2xl border border-slate-200 px-4 h-14">
          <Ionicons name="checkmark-circle-outline" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 text-slate-800 text-base ml-3 h-full"
            placeholder="Ulangi password baru..."
            placeholderTextColor="#cbd5e1"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirm(!showConfirm)}
            className="p-2"
          >
            <Ionicons
              name={showConfirm ? "eye-off" : "eye"}
              size={20}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tombol Simpan */}
      <TouchableOpacity
        onPress={handleSavePassword}
        disabled={isLoading}
        className={`w-full py-4 rounded-2xl items-center flex-row justify-center ${
          isLoading ? "bg-blue-400" : "bg-blue-600 active:bg-blue-700"
        }`}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="save" size={20} color="white" />
            <Text className="text-white font-bold ml-2 text-base">
              Simpan Password
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
