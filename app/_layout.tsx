import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <Stack>
      {/* Tab utama */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Folder patrol (udah aman) */}
      <Stack.Screen name="patrol" options={{ headerShown: false }} />

      {/* 👇 TAMBAHIN INI: Biar folder profile gak bikin header ganda 👇 */}
      <Stack.Screen name="profile" options={{ headerShown: false }} />

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
