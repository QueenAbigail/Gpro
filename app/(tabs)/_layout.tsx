import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
// 1. Import hook safe area untuk mendeteksi navbar sistem HP
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets(); // 👈 Ambil data jarak aman (insets) bawah HP
  const isWeb = Platform.OS === "web"; // 👈 Cek apakah berjalan di Web Browser

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0ea5e9", // Warna biru pas aktif
        tabBarInactiveTintColor: "#9ca3af", // Warna abu-abu pas mati
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#f3f4f6",

          // 🚀 KUNCI PERBAIKAN DI SINI
          // Di Web kita beri height & padding khusus agar teks tidak terpotong
          height: isWeb ? 80 : 65 + insets.bottom,
          paddingBottom: isWeb ? 12 : 10 + insets.bottom,
          paddingTop: isWeb ? 8 : 10,
          elevation: 10, // Shadow yang lebih tebal biar elegan
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: isWeb ? 2 : 0,
        },
      }}
    >
      {/* 1. KIRI PERTAMA */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      {/* 2. KIRI KEDUA */}
      <Tabs.Screen
        name="patrol"
        options={{
          title: "Patroli",
          tabBarIcon: ({ color }) => (
            <Ionicons name="binoculars" size={24} color={color} />
          ),
        }}
      />

      {/* 3. TENGAH (FLOATING BUTTON ALA LIVIN') */}
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: () => (
            <View
              className="bg-blue-500 w-16 h-16 rounded-full items-center justify-center border-[4px] border-white shadow-md"
              style={{ top: -15 }}
            >
              <Ionicons name="qr-code-outline" size={30} color="white" />
            </View>
          ),
        }}
      />

      {/* 4. KANAN PERTAMA */}
      <Tabs.Screen
        name="leave"
        options={{
          title: "Izin",
          tabBarIcon: ({ color }) => (
            <Ionicons name="newspaper" size={24} color={color} />
          ),
        }}
      />

      {/* 5. KANAN KEDUA */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}