import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function ProfileScreen() {
  const router = useRouter();

  const userData = {
    name: "Adi Candra Listiawan",
    role: "Software Developer",
    employeeId: "CAS-2026-001",
    client: "PT. Citra Abadi Sejati",
    site: "Bogor - Head Office",
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
        <Text className="text-2xl font-bold text-slate-800">
          {userData.name}
        </Text>
        <Text className="text-slate-500 font-medium mb-4">{userData.role}</Text>

        <TouchableOpacity
          onPress={() => router.push("/profile/change-photo")}
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
          <Text className="text-slate-800 text-base font-semibold">
            {userData.employeeId}
          </Text>
        </View>
        <View className="mb-4">
          <Text className="text-slate-400 text-xs uppercase font-bold mb-1">
            Client
          </Text>
          <Text className="text-slate-800 text-base font-semibold">
            {userData.client}
          </Text>
        </View>
        <View>
          <Text className="text-slate-400 text-xs uppercase font-bold mb-1">
            Site Penempatan
          </Text>
          <Text className="text-slate-800 text-base font-semibold">
            {userData.site}
          </Text>
        </View>
      </View>

      <Text className="text-slate-800 font-bold mb-3 ml-1">
        Pengaturan Akun
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/profile/account-info")}
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
        onPress={() => router.push("/profile/change-password")} // <-- Tambahin ini
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
        onPress={() => router.push("/profile/notifications")} // <-- Sambungkan ke sini
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

      <TouchableOpacity
        onPress={() => console.log("Logout diklik!")}
        className="flex-row items-center justify-center py-6 border-t border-slate-100 mt-4"
      >
        <Ionicons name="log-out" size={20} color="#ef4444" />
        <Text className="text-red-500 font-bold ml-2">Keluar Aplikasi</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
