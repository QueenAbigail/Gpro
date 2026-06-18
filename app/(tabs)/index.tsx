import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-sky-50 pt-14 px-5">
      {/* --- BAGIAN HEADER PROFIL --- */}
      <View className="flex-row justify-between items-center mb-8">
        <View className="flex-row items-center">
          <Image
            source={{
              uri: "https://ui-avatars.com/api/?name=Can&background=0b5394&color=fff&size=128",
            }}
            className="w-12 h-12 rounded-full mr-3 border-2 border-white shadow-sm"
          />
          <View>
            <Text className="text-gray-600 text-sm font-medium">
              Selamat Pagi,
            </Text>
            <Text className="text-xl font-extrabold text-gray-950">Can</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/profile/notifications")}
          className="bg-white p-2 rounded-full shadow-sm border border-gray-200"
        >
          <Ionicons name="notifications-outline" size={22} color="#1f2937" />
        </TouchableOpacity>
      </View>
      {/* --- AKHIR HEADER PROFIL --- */}

      {/* --- BAGIAN CARD STATUS KEHADIRAN --- */}
      <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-gray-800 text-base font-bold">
            Status Kehadiran
          </Text>
          <View className="bg-sky-50 px-3 py-1 rounded-full">
            <Text className="text-blue-600 font-semibold text-xs">
              28 Mei 2026
            </Text>
          </View>
        </View>
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-500 text-xs mb-1">Jam Masuk</Text>
            <Text className="text-gray-950 text-3xl font-extrabold">07:45</Text>
          </View>
          <View className="h-10 w-[1px] bg-gray-200" />
          <View className="items-end">
            <Text className="text-gray-500 text-xs mb-1">Jam Pulang</Text>
            <Text className="text-gray-400 text-3xl font-extrabold">--:--</Text>
          </View>
        </View>
      </View>
      {/* --- AKHIR CARD STATUS --- */}

      {/* --- BAGIAN MENU UTAMA (STYLE LIVIN' - CLEAN VERSION) --- */}
      <View className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-10">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-gray-900 font-bold text-lg">Menu Utama</Text>
          <TouchableOpacity className="flex-row items-center">
            <Text className="text-blue-500 font-semibold text-sm mr-1">
              Atur
            </Text>
            <Ionicons name="options-outline" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap items-start">
          <TouchableOpacity
            onPress={() => router.push("/beranda/absen/masuk")}
            className="w-1/4 items-center"
          >
            <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
              <Ionicons name="log-in" size={24} color="#3b82f6" />
            </View>
            <Text className="text-gray-600 text-xs text-center leading-tight">
              Absen{"\n"}Masuk
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/beranda/absen/pulang")}
            className="w-1/4 items-center"
          >
            <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
              <Ionicons name="log-out" size={24} color="#3b82f6" />
            </View>
            <Text className="text-gray-600 text-xs text-center leading-tight">
              Absen{"\n"}Pulang
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/beranda/bko" as any)} // <-- Tambahin ini
            className="w-1/4 items-center"
          >
            <View className="w-12 h-12 rounded-full bg-amber-50 items-center justify-center mb-2">
              <Ionicons name="briefcase" size={24} color="#f59e0b" />
            </View>
            <Text className="text-gray-600 text-xs text-center leading-tight">
              Ambil{"\n"}BKO
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/beranda/absen-anggota" as any)}
            className="w-1/4 items-center"
          >
            <View className="w-12 h-12 rounded-full bg-violet-50 items-center justify-center mb-2">
              <Ionicons name="people" size={24} color="#8b5cf6" />
            </View>
            <Text className="text-gray-600 text-xs text-center leading-tight">
              Absen{"\n"}Anggota
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* --- AKHIR MENU UTAMA --- */}

      {/* --- BAGIAN BANNER PENGUMUMAN --- */}
      <View className="mb-10">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-gray-900 font-bold text-lg">
            Informasi Perusahaan
          </Text>
          <TouchableOpacity>
            <Text className="text-blue-500 font-semibold text-sm">
              Lihat Semua
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="overflow-visible"
        >
          <View className="bg-blue-600 w-72 p-5 rounded-3xl mr-4 shadow-md">
            <View className="bg-blue-500/50 self-start px-2 py-1 rounded-md mb-3">
              <Text className="text-white text-[10px] font-bold tracking-wider">
                INFO HRD
              </Text>
            </View>
            <Text className="text-white font-bold text-base mb-1">
              Cek Slip Gaji Bulan Ini
            </Text>
            <Text className="text-blue-100 text-xs">
              Slip gaji untuk periode Mei 2026 sudah dapat diunduh melalui
              aplikasi.
            </Text>
          </View>

          <View className="bg-emerald-500 w-72 p-5 rounded-3xl mr-4 shadow-md">
            <View className="bg-emerald-400/50 self-start px-2 py-1 rounded-md mb-3">
              <Text className="text-white text-[10px] font-bold tracking-wider">
                PENGUMUMAN
              </Text>
            </View>
            <Text className="text-white font-bold text-base mb-1">
              Jadwal Libur Nasional
            </Text>
            <Text className="text-emerald-50 text-xs">
              Pemberitahuan operasional PT. Citra Abadi Sejati Bogor selama
              libur panjang akhir pekan.
            </Text>
          </View>

          <View className="bg-rose-500 w-72 p-5 rounded-3xl mr-4 shadow-md">
            <View className="bg-rose-400/50 self-start px-2 py-1 rounded-md mb-3">
              <Text className="text-white text-[10px] font-bold tracking-wider">
                KESEHATAN
              </Text>
            </View>
            <Text className="text-white font-bold text-base mb-1">
              Jadwal Medical Check Up
            </Text>
            <Text className="text-rose-50 text-xs">
              Jangan lewatkan MCU tahunan yang akan diselenggarakan minggu depan
              di klinik kantor.
            </Text>
          </View>
        </ScrollView>
      </View>
      {/* --- AKHIR BANNER PENGUMUMAN --- */}
    </ScrollView>
  );
}
