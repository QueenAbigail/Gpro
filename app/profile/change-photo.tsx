import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ChangePhotoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleUpload = () => {
    setLoading(true);
    // Simulasi proses upload ke Supabase Storage
    setTimeout(() => {
      setLoading(false);
      alert("Foto profil berhasil diperbarui!");
      router.back();
    }, 2000);
  };

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
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} className="w-full h-full" />
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
