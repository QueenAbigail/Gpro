import { Stack } from "expo-router";
import "../global.css"; // Ini wajib biar Tailwind jalan

export default function RootLayout() {
  return (
    <Stack>
      {/* Ini nyuruh mesin masuk ke folder (tabs) sebagai halaman awal */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
