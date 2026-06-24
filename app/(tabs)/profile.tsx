import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase"; // Pastikan path ini benar

export default function ProfileScreen() {
  const router = useRouter();

  // State untuk nyimpen data dari Supabase
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<any>(null);

  // Data statis sementara untuk kolom yang belum ada di database
  const staticData = {
    role: "Software Developer",
    client: "PT. Citra Abadi Sejati",
    site: "Bogor - Head Office",
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) throw new Error("Gagal ambil sesi user");

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      setDbUser(profileData);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Gagal memuat data profil.");
    } finally {
      setLoading(false);
    }
  };

  // Fungsi buat jalanin Logout
  const handleLogout = async () => {
    Alert.alert(
      "Konfirmasi Keluar",
      "Apakah Anda yakin ingin keluar dari aplikasi?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert("Gagal Logout", error.message);
            } else {
              router.replace("/login");
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50 pt-16 px-6"
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="items-center mb-8">
        <View className="w-28 h-28 bg-blue-100 rounded-full items-center justify-center mb-4 border-4 border-white shadow-md">
          <Ionicons name="person" size={50} color="#3b82f6" />
        </View>

        {/* Nampilin Nama dari Database */}
        {loading ? (
          <ActivityIndicator color="#3b82f6" className="mb-2" />
        ) : (
          <Text className="text-2xl font-bold text-slate-800">
            {dbUser?.name || "Nama Tidak Tersedia"}
          </Text>
        )}

        <Text className="text-slate-500 font-medium mb-4">
          {staticData.role}
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/profile/change-photo" as any)}
          className="bg-slate-800 px-6 py-2 rounded-full flex-row items-center active:bg-slate-700"
        >
          <Ionicons name="camera" size={16} color="white" />
          <Text className="text-white font-bold ml-2 text-sm">Ganti Foto</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <View className="mb-4">
          <Text className="text-slate-400 text-xs uppercase font-bold mb-1">
            ID Karyawan
          </Text>
          {/* Nampilin ID dari Database */}
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#cbd5e1"
              className="self-start"
            />
          ) : (
            <Text className="text-slate-800 text-base font-semibold">
              {dbUser?.employeeCode || "Belum ada ID"}
            </Text>
          )}
        </View>
        <View className="mb-4">
          <Text className="text-slate-400 text-xs uppercase font-bold mb-1">
            Client
          </Text>
          <Text className="text-slate-800 text-base font-semibold">
            {staticData.client}
          </Text>
        </View>
        <View>
          <Text className="text-slate-400 text-xs uppercase font-bold mb-1">
            Site Penempatan
          </Text>
          <Text className="text-slate-800 text-base font-semibold">
            {staticData.site}
          </Text>
        </View>
      </View>

      <Text className="text-slate-800 font-bold mb-3 ml-1">
        Pengaturan Akun
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/profile/account-info" as any)}
        className="bg-white rounded-2xl p-4 flex-row items-center justify-between mb-3 border border-slate-100"
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-3">
            <Ionicons name="person-circle" size={20} color="#3b82f6" />
          </View>
          <Text className="text-slate-700 font-semibold">Informasi Akun</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/profile/change-password" as any)}
        className="bg-white rounded-2xl p-4 flex-row items-center justify-between mb-3 border border-slate-100"
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="lock-closed" size={20} color="#64748b" />
          </View>
          <Text className="text-slate-700 font-semibold">Ubah Password</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/profile/notifications" as any)}
        className="bg-white rounded-2xl p-4 flex-row items-center justify-between mb-8 border border-slate-100"
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="notifications" size={20} color="#64748b" />
          </View>
          <Text className="text-slate-700 font-semibold">Notifikasi</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </TouchableOpacity>

      {/* 👇 Tombol Logout sudah disambungkan ke fungsi handleLogout */}
      <TouchableOpacity
        onPress={handleLogout}
        className="flex-row items-center justify-center py-6 border-t border-slate-100 mt-4"
      >
        <Ionicons name="log-out" size={20} color="#ef4444" />
        <Text className="text-red-500 font-bold ml-2">Keluar Aplikasi</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
