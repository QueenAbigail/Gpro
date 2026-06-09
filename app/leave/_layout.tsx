import { Stack } from "expo-router";

export default function ProfileLayout() {
  // headerShown: false di sini mastiin halaman di dalem folder profile
  // gak bakal dipaksa punya header sama si Stack ini
  return <Stack screenOptions={{ headerShown: false }} />;
}
