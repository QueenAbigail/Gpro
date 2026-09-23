import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

/**
 * Fungsi untuk mengkompres gambar menjadi format WebP
 * @param imageUri URI gambar asli yang mau dikompres
 * @param quality Kualitas kompresi (0.0 sampai 1.0). Default: 0.7 (70%)
 * @returns URI gambar baru yang sudah dikompres jadi WebP
 */
export const compressToWebP = async (
  imageUri: string,
  quality: number = 0.7,
) => {
  // Kalau dijalankan di Web, kita skip manipulatornya atau kembalikan URI aslinya
  // (Karena manipulasi WebP di web platform sering beda perilaku)
  if (Platform.OS === "web") {
    return imageUri;
  }

  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [], // Biarkan kosong kalau tidak mau merubah ukuran (resize/crop)
      { compress: quality, format: ImageManipulator.SaveFormat.WEBP },
    );

    return manipResult.uri;
  } catch (error) {
    console.error("Gagal kompres gambar ke WebP:", error);
    // Kalau gagal (misal karena HP gak support), fallback kembalikan foto aslinya biar app gak nge-crash
    return imageUri;
  }
};
