import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import ScreenHeader from "../../components/ScreenHeader";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// 💡 PASTIKAN path import supabase ini bener sesuai struktur folder lu ya!
import { supabase } from "../../lib/supabase";

export default function ChangePhotoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isFetchingAvatar, setIsFetchingAvatar] = useState(true);

  // STATE: Buat nyimpen URL foto profil yang ada di database sekarang
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);

  // STATE: Buat nyimpen gambar BARU dari galeri (belum di-upload)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentProfilePhoto();
  }, []);

  const fetchCurrentProfilePhoto = async () => {
    setIsFetchingAvatar(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("User tidak ditemukan");
      }

      const { data: profileData, error } = await supabase
        .from("users")
        .select("avatar")
        .eq("id", user.id)
        .single();

      if (error) {
        throw error;
      }

      if (
        profileData &&
        profileData.avatar &&
        profileData.avatar.trim() !== ""
      ) {
        setCurrentAvatar(profileData.avatar);
      }
    } catch (error) {
      console.error("Gagal mengambil foto profil:", error);
    } finally {
      setIsFetchingAvatar(false);
    }
  };

  const handleUpload = () => {
    setLoading(true);
    // Simulasi proses upload ke Supabase Storage
    setTimeout(() => {
      setLoading(false);
      alert("Foto profil berhasil diperbarui!");
      router.back();
    }, 2000);
  };

  // LOGIKA PREVIEW GAMBAR:
  // Kalau ada gambar baru yang dipilih dari galeri -> Tampilkan gambar baru
  // Kalau belum milih dari galeri, tapi di database ada foto -> Tampilkan foto database
  // Kalau dua-duanya kosong -> Tampilkan null (nanti di-render jadi icon abu-abu)
  const imageToDisplay = selectedImage || currentAvatar;

  return (
    <View className="flex-1 bg-sky-50 pt-12">
      <ScreenHeader title="Ganti Foto Profil" />
      <View className="flex-1 px-6 items-center">
        <View className="w-64 h-64 bg-slate-200 rounded-full mb-10 items-center justify-center border-4 border-white shadow-lg overflow-hidden">
        {isFetchingAvatar ? (
          // Tampilkan loading spinner khusus di dalam lingkaran pas lagi narik data foto awal
          <ActivityIndicator size="large" color="#3b82f6" />
        ) : imageToDisplay ? (
          <Image source={{ uri: imageToDisplay }} className="w-full h-full" />
        ) : (
          <Ionicons name="person" size={100} color="#cbd5e1" />
        )}
      </View>

      <TouchableOpacity
        className="w-full bg-white py-4 rounded-2xl mb-4 items-center border border-slate-200"
        onPress={() => alert("Buka kamera/galeri...")}
      >
        <Text className="text-slate-800 font-bold">Pilih dari Galeri</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`w-full py-4 rounded-2xl items-center ${selectedImage ? "bg-blue-600" : "bg-slate-300"}`}
        disabled={!selectedImage || loading}
        onPress={handleUpload}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold">Simpan Foto Profil</Text>
        )}
      </TouchableOpacity>
      </View>
    </View>
  );
}
