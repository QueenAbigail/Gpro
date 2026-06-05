import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function PatrolInputScreen() {
  const router = useRouter();
  const { locationId } = useLocalSearchParams();

  const [status, setStatus] = useState("Aman");
  const [note, setNote] = useState("");

  // State baru untuk menampung banyak foto (dummy data awal kosong)
  const [photos, setPhotos] = useState<number[]>([]);

  const locationName =
    locationId === "1" ? "Pos Gerbang Utama" : `Titik Lokasi #${locationId}`;

  // Fungsi simulasi tambah foto
  const handleAddPhoto = () => {
    setPhotos([...photos, Date.now()]); // Pakai timestamp sebagai ID unik dummy
  };

  // Fungsi simulasi hapus foto
  const handleRemovePhoto = (idToRemove: number) => {
    setPhotos(photos.filter((id) => id !== idToRemove));
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50 pt-12 px-5"
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header Halaman */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
        >
          <Ionicons name="close" size={24} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Form Laporan</Text>
      </View>

      {/* Info Lokasi Ter-scan */}
      <View className="bg-blue-500 rounded-2xl p-5 shadow-sm mb-6 flex-row items-center">
        <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-4">
          <Ionicons name="qr-code-outline" size={24} color="white" />
        </View>
        <View>
          <Text className="text-blue-100 text-sm mb-0.5">
            Lokasi Terdeteksi
          </Text>
          <Text className="text-white text-lg font-bold">{locationName}</Text>
        </View>
      </View>

      {/* Form Input: Status */}
      <Text className="text-slate-800 text-base font-bold mb-3 ml-1">
        Status Kondisi
      </Text>
      <View className="flex-row mb-6">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setStatus("Aman")}
          className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border mr-2 ${
            status === "Aman"
              ? "bg-green-50 border-green-500"
              : "bg-white border-slate-200"
          }`}
        >
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={status === "Aman" ? "#16a34a" : "#94a3b8"}
          />
          <Text
            className={`font-bold ml-2 ${status === "Aman" ? "text-green-600" : "text-slate-500"}`}
          >
            Aman
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setStatus("Temuan")}
          className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border ml-2 ${
            status === "Temuan"
              ? "bg-red-50 border-red-500"
              : "bg-white border-slate-200"
          }`}
        >
          <Ionicons
            name="warning"
            size={20}
            color={status === "Temuan" ? "#dc2626" : "#94a3b8"}
          />
          <Text
            className={`font-bold ml-2 ${status === "Temuan" ? "text-red-600" : "text-slate-500"}`}
          >
            Ada Temuan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form Input: Foto (Layout Horizontal) */}
      <View className="flex-row items-center justify-between mb-3 ml-1">
        <Text className="text-slate-800 text-base font-bold">Foto Bukti</Text>
        <Text className="text-slate-400 text-xs">
          {photos.length} Foto terpilih
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-6"
        contentContainerStyle={{ paddingRight: 20 }}
      >
        {/* Render foto-foto yang sudah diambil */}
        {photos.map((photoId) => (
          // 👇 Solusi: Bungkus pakai View yang ada padding atas (pt-2) dan kanan (pr-2)
          <View key={photoId} className="mr-3 pt-2 pr-2 relative">
            {/* Kotak Foto */}
            <View className="w-28 h-28 bg-slate-200 rounded-2xl items-center justify-center border border-slate-300">
              <Ionicons name="image" size={32} color="#94a3b8" />
            </View>

            {/* Tombol Silang: Sekarang posisinya top-0 dan right-0 (nempel di ujung padding wrapper) */}
            <TouchableOpacity
              onPress={() => handleRemovePhoto(photoId)}
              className="absolute top-0 right-0 w-7 h-7 bg-red-500 rounded-full items-center justify-center border-2 border-white shadow-sm"
              style={{ zIndex: 10, elevation: 5 }}
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Tombol Tambah Foto */}
        {/* 👇 Kasih pt-2 juga biar sejajar sama kotak foto di sebelahnya */}
        <View className="pt-2">
          <TouchableOpacity
            onPress={handleAddPhoto}
            activeOpacity={0.6}
            className="w-28 h-28 bg-white rounded-2xl items-center justify-center border border-blue-300 border-dashed bg-blue-50/50"
          >
            <Ionicons name="camera" size={28} color="#3b82f6" />
            <Text className="text-blue-500 text-xs mt-2 font-semibold">
              Tambah Foto
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Form Input: Catatan */}
      <Text className="text-slate-800 text-base font-bold mb-3 ml-1">
        Catatan Laporan
      </Text>
      <View className="bg-white rounded-2xl border border-slate-200 px-4 py-3 mb-8">
        <TextInput
          multiline
          numberOfLines={4}
          placeholder="Ketik catatan atau temuan di sini..."
          placeholderTextColor="#94a3b8"
          value={note}
          onChangeText={setNote}
          className="text-slate-800 text-base"
          style={{ minHeight: 100, textAlignVertical: "top" }}
        />
      </View>

      {/* Tombol Submit */}
      <TouchableOpacity
        onPress={() => {
          alert("Laporan berhasil dikirim!");
          router.back();
        }}
        className="bg-slate-800 flex-row items-center justify-center py-4 rounded-xl shadow-sm active:bg-slate-700"
      >
        <Ionicons name="send" size={20} color="white" />
        <Text className="text-white font-bold text-base ml-2">
          Submit Laporan
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
