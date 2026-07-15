import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
// 1. Import hook safe area untuk mendeteksi navbar sistem HP
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets(); // 👈 2. Ambil data jarak aman (insets) bawah HP

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
          
          // 3. KUNCI PERBAIKAN DI SINI 🚀
          // Tinggi dasar 65 ditambah dengan tinggi tombol navigasi HP (insets.bottom)
          height: 65 + insets.bottom, 
          // Jarak bawah dasar 10 ditambah dengan insets.bottom supaya teks terdorong ke atas tombol HP
          paddingBottom: 10 + insets.bottom, 
          paddingTop: 10,
          elevation: 10, // Shadow yang lebih tebal biar elegan
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
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
          // Trik biar tombolnya melayang: kita bungkus icon pakai View bulat,
          // kasih background biru, border putih tebal, lalu kita dorong ke atas pakai `top: -15`
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