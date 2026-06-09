import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <Stack>
      {/* Tab utama */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Folder lain yang udah aman */}
      <Stack.Screen name="patrol" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="leave" options={{ headerShown: false }} />

      {/* 👇 TAMBAHIN INI BIAR HEADER FOLDER BERANDA HILANG TOTAL 👇 */}
      <Stack.Screen name="beranda" options={{ headerShown: false }} />

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
