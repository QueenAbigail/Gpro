import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentProfilePhoto();
  }, []);

  const fetchCurrentProfilePhoto = async () => {
    setIsFetchingAvatar(true);
    console.log(">> 1. Mulai narik data profil...");
    try {
      // Dapetin ID user yang lagi login
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error(">> ❌ Error Sesi:", authError);
        throw new Error("User tidak ditemukan");
      }

      console.log(">> 2. User ketemu, ID:", user.id);

      // 💡 PERBAIKAN: Tarik kolom 'avatar', bukan 'avatarUrl'
      const { data: profileData, error } = await supabase
        .from("users")
        .select("avatar")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(">> ❌ Error narik data users:", error);
        throw error;
      }

      console.log(">> 3. Data profil dapet nih:", profileData);

      // Cek dengan teliti, beneran ada isinya atau cuma string kosong ""
      if (
        profileData &&
        profileData.avatar &&
        profileData.avatar.trim() !== ""
      ) {
        console.log(">> ✅ Avatar URL valid! Isinya:", profileData.avatar);
        setCurrentAvatar(profileData.avatar);
      } else {
        console.log(">> ⚠️ Avatar kosong atau null di database.");
      }
    } catch (error) {
      console.log(">> 🚨 Error fatal fetch avatar:", error);
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
    <View className="flex-1 bg-slate-50 pt-16 px-6 items-center">
      <View className="w-full flex-row items-center mb-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800 ml-4">
          Ganti Foto Profil
        </Text>
      </View>

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
  );
}
