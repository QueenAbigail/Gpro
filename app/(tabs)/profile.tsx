import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  // Fungsi fetch data pintar (SWR Pattern)
  const fetchUserProfile = async (isManualRefresh = false) => {
    try {
      if (!dbUser && !isManualRefresh) {
        setLoading(true);
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select(
          `
          *,
          companies ( name ),
          sites ( name )
        `,
        )
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setDbUser(profileData);
    } catch (error: any) {
      console.error("Gagal refresh profil:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile(true);
  };

  const userAvatarUrl = dbUser?.avatar || null;

  const handleExecuteLogout = async () => {
    setIsLogoutModalVisible(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Gagal Logout", error.message);
    } else {
      setDbUser(null);
      router.replace("/login");
    }
  };

  if (loading && !dbUser) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50 pt-16 px-6"
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false} // 👈 Sembunyikan Scrollbar
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#3b82f6"]}
          tintColor="#3b82f6"
        />
      }
    >
      <View className="items-center mb-8">
        {/* Container Foto Profil */}
        <View className="w-28 h-28 bg-blue-100 rounded-full items-center justify-center mb-4 border-4 border-white shadow-md overflow-hidden">
          {userAvatarUrl ? (
            <Image
              source={{ uri: userAvatarUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={50} color="#3b82f6" />
          )}
        </View>

        {/* Nampilin Nama */}
        <Text className="text-2xl font-bold text-slate-800">
          {dbUser?.name || "Nama Tidak Tersedia"}
        </Text>

        {/* Nampilin Jabatan */}
        <Text className="text-slate-500 font-medium mb-4">
          {dbUser?.position || "Jabatan Tidak Tersedia"}
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/profile/change-photo" as any)}
          className="bg-slate-800 px-6 py-2 rounded-full flex-row items-center active:bg-slate-700"
        >
          <Ionicons name="camera" size={16} color="white" />
          <Text className="text-white font-bold ml-2 text-sm">Ganti Foto</Text>
        </TouchableOpacity>

        {(dbUser?.role === "SUPER_ADMIN" || dbUser?.role === "ADMIN") && (
          <TouchableOpacity
            onPress={() => onRefresh()}
            className="bg-indigo-100 border border-indigo-200 py-2 px-4 rounded-xl items-center justify-center mt-4 flex-row border-dashed"
          >
            <Ionicons name="bug-outline" size={16} color="#4338ca" />
            <Text className="text-indigo-700 font-bold ml-2 text-sm">
              [DEV] Tarik Data Manual
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <View className="mb-4">
          <Text className="text-slate-400 text-xs uppercase font-bold mb-1">
            ID Karyawan
          </Text>
          <Text className="text-slate-800 text-base font-semibold">
            {dbUser?.employeeCode || "Belum ada ID"}
          </Text>
        </View>
        <View className="mb-4">
          <Text className="text-slate-400 text-xs uppercase font-bold mb-1">
            Client
          </Text>
          <Text className="text-slate-800 text-base font-semibold">
            {dbUser?.companies?.name || "Belum ada data"}
          </Text>
        </View>
        <View>
          <Text className="text-slate-400 text-xs uppercase font-bold mb-1">
            Site Penempatan
          </Text>
          <Text className="text-slate-800 text-base font-semibold">
            {dbUser?.sites?.name || "Belum ada data"}
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

      {/* Tombol Logout */}
      <TouchableOpacity
        onPress={() => setIsLogoutModalVisible(true)}
        className="flex-row items-center justify-center py-5 border-t border-slate-100 mt-2"
      >
        <Ionicons name="log-out" size={20} color="#ef4444" />
        <Text className="text-red-500 font-bold ml-2">Keluar Aplikasi</Text>
      </TouchableOpacity>

      {/* Teks Versi Aplikasi */}
      <View className="items-center pt-2 pb-6">
        <Text className="text-slate-400 text-xs font-semibold">
          GlobalPro Mobile v{Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </View>

      {/* Modal Konfirmasi Logout */}
      <Modal
        transparent
        visible={isLogoutModalVisible}
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl items-center">
            <View className="w-14 h-14 bg-red-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="log-out" size={26} color="#ef4444" />
            </View>

            <Text className="text-slate-800 font-bold text-lg text-center mb-2">
              Konfirmasi Keluar
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
              Apakah Anda yakin ingin keluar dari aplikasi? Jangan lupa pastikan semua tugas patroli Anda hari ini sudah selesai.
            </Text>

            <View className="flex-row w-full justify-between gap-3">
              <TouchableOpacity
                onPress={() => setIsLogoutModalVisible(false)}
                className="flex-1 bg-slate-100 py-3.5 rounded-2xl items-center active:bg-slate-200"
              >
                <Text className="text-slate-600 font-bold text-sm">Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExecuteLogout}
                className="flex-1 bg-red-500 py-3.5 rounded-2xl items-center active:bg-red-600 shadow-sm"
              >
                <Text className="text-white font-bold text-sm">Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}