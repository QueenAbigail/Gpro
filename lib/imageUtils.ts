import * as ImageManipulator from "expo-image-manipulator";
import { Image, Platform } from "react-native";

/**
 * Fungsi helper untuk mendapatkan ukuran asli gambar
 */
const getImageDimensions = (
  uri: string,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({ width: 0, height: 0 }),
    );
  });
};

/**
 * Fungsi untuk mengkompres dan me-resize gambar menjadi format WebP beresolusi Full HD (0% crop)
 * @param imageUri URI gambar asli yang mau dikompres
 * @param quality Kualitas kompresi (0.0 sampai 1.0). Default: 0.8
 * @param maxDimension Batas maksimal dimensi terpanjang (Full HD: 1920px). Default: 1920
 * @returns URI gambar baru yang sudah di-resize & dikompres jadi WebP
 */
export const compressToWebP = async (
  imageUri: string,
  quality: number = 0.8,
  maxDimension: number = 1920,
) => {
  // Kalau dijalankan di Web, kita skip manipulatornya atau kembalikan URI aslinya
  if (Platform.OS === "web") {
    return imageUri;
  }

  try {
    const { width, height } = await getImageDimensions(imageUri);

    const actions: ImageManipulator.Action[] = [];

    // Jika dimensi foto melebihi Full HD (1920px), resize sisi terpanjangnya secara proporsional (0% crop)
    if (width > 0 && height > 0) {
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          actions.push({ resize: { width: maxDimension } });
        } else {
          actions.push({ resize: { height: maxDimension } });
        }
      }
    } else {
      // Fallback jika getImageDimensions gagal: tetapkan batas lebar aman
      actions.push({ resize: { width: maxDimension } });
    }

    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      actions,
      { compress: quality, format: ImageManipulator.SaveFormat.WEBP },
    );

    return manipResult.uri;
  } catch (error) {
    console.error("Gagal kompres gambar ke WebP:", error);
    // Kalau gagal (misal format tidak didukung), fallback kembalikan foto aslinya biar app gak nge-crash
    return imageUri;
  }
};
