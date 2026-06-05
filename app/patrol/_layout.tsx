import { Stack } from "expo-router";

export default function PatrolLayout() {
  return (
    // Ini saklar utama buat matiin semua header bawaan di dalam folder patrol
    <Stack screenOptions={{ headerShown: false }} />
  );
}
