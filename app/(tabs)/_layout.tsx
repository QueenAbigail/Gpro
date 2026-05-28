import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";

export default function TabLayout() {
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
          height: 65,
          paddingBottom: 10,
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
        name="history"
        options={{
          title: "Riwayat",
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={24} color={color} />
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
        name="inbox"
        options={{
          title: "Pesan",
          tabBarIcon: ({ color }) => (
            <Ionicons name="mail" size={24} color={color} />
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
