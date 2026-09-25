import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { compressToWebP } from "../../lib/imageUtils";
import { getDistance } from "../../lib/locationUtils";
import { supabase } from "../../lib/supabase";
import { sendActivityLog } from "../../lib/tracker";

export default function PatrolInputScreen() {
  const router = useRouter();

  // 💡 Tangkap isSimulated dari parameter URL
  const { locationId, isSimulated } = useLocalSearchParams();

  const [status, setStatus] = useState("Aman");
  const [note, setNote] = useState("");

  const [photos, setPhotos] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_PHOTOS = 9;

  const [dbLocationName, setDbLocationName] = useState("");
  const [dbSiteName, setDbSiteName] = useState("");

  const [isPageLoading, setIsPageLoading] = useState(true);

  // STATE BUAT CUSTOM MODAL
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    buttonText: "OK",
    type: "info",
    onPress: () => {},
  });

  const showModal = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
    buttonText: string = "OK",
    action: () => void = () => setModalVisible(false),
  ) => {
    setModalContent({ title, message, type, buttonText, onPress: action });
    setModalVisible(true);
  };

  useEffect(() => {
    const validateAndFetchLocation = async () => {
      if (!locationId) {
        showModal(
          "Akses Ditolak",
          "ID Lokasi kosong! Harap gunakan Scanner QR.",
          "error",
          "Kembali",
          () => {
            setModalVisible(false);
            router.back();
          },
        );
        return;
      }

      try {
        const { data, error } = await supabase
          .from("patrol_locations")
          .select("name, isActive, latitude, longitude, radius, sites(name)")
          .eq("id", locationId)
          .maybeSingle();

        if (error || !data) {
          showModal(
            "Lokasi Tidak Valid",
            "QR Code tidak dikenali atau Anda mencoba mengakses titik gaib. Silakan scan QR resmi!",
            "error",
            "Mengerti",
            () => {
              setModalVisible(false);
              router.back();
            },
          );
          return;
        }

        if (data.isActive === false) {
          showModal(
            "Lokasi Nonaktif",
            "Titik patroli ini sedang ditutup/dinonaktifkan oleh Admin.",
            "warning",
            "Kembali",
            () => {
              setModalVisible(false);
              router.back();
            },
          );
          return;
        }

        // 💡 JURUS HYBRID: Bypass hanya berlaku kalau mode DEV dan dipanggil lewat tombol simulasi
        if (__DEV__ && isSimulated === "true") {
          console.log("🛠️ DEV MODE AKTIF: Bypass GPS...");
          setDbLocationName(`[DEV] ${data.name}`);

          if (data.sites) {
            const siteObj = Array.isArray(data.sites)
              ? data.sites[0]
              : data.sites;
            if (siteObj && (siteObj as any).name) {
              setDbSiteName((siteObj as any).name);
            }
          }

          setIsPageLoading(false);
          return; // 🚀 Langsung STOP di sini! Nggak lanjut ngecek GPS
        }

        // Kalau isSimulated nggak ada (lewat kamera asli), dia bakal nuntut cek GPS murni
        const locStatus = await Location.requestForegroundPermissionsAsync();
        if (locStatus.status !== "granted") {
          showModal(
            "Izin Ditolak",
            "Aplikasi butuh akses lokasi untuk validasi jarak.",
            "error",
            "Kembali",
            () => {
              setModalVisible(false);
              router.back();
            },
          );
          return;
        }

        const userLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const distance = getDistance(
          userLoc.coords.latitude,
          userLoc.coords.longitude,
          data.latitude,
          data.longitude,
        );

        if (distance > data.radius) {
          showModal(
            "Di Luar Area Patroli",
            `Anda terdeteksi ${Math.round(distance)} meter dari titik.\nMaksimal jarak adalah ${data.radius} meter. Silakan mendekat ke lokasi!`,
            "error",
            "Kembali",
            () => {
              setModalVisible(false);
              router.back();
            },
          );
          return;
        }

        setDbLocationName(data.name);

        if (data.sites) {
          const siteObj = Array.isArray(data.sites)
            ? data.sites[0]
            : data.sites;
          if (siteObj && (siteObj as any).name) {
            setDbSiteName((siteObj as any).name);
          }
        }
        setIsPageLoading(false);
      } catch (err) {
        showModal(
          "Error Jaringan",
          "Gagal menghubungi server atau memvalidasi GPS.",
          "error",
          "Kembali",
          () => {
            setModalVisible(false);
            router.back();
          },
        );
      }
    };
    validateAndFetchLocation();
  }, [locationId, isSimulated]);

  const handleAddPhotoCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      showModal(
        "Izin Ditolak",
        "Aplikasi butuh izin kamera untuk melampirkan foto.",
        "error",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) processAndSavePhoto(result.assets[0].uri);
  };

  const handleAddPhotoGallery = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showModal("Izin Ditolak", "Aplikasi butuh izin akses galeri.", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) processAndSavePhoto(result.assets[0].uri);
  };

  const processAndSavePhoto = async (uri: string) => {
    setIsCompressing(true);
    try {
      const compressedUri = await compressToWebP(uri, 0.7);
      setPhotos((prev) => [...prev, compressedUri]);
    } catch (error) {
      showModal("Error", "Gagal memproses foto.", "error");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemovePhoto = (uriToRemove: string) => {
    setPhotos(photos.filter((uri) => uri !== uriToRemove));
  };

  const submitPatrolReport = async () => {
    if (status === "Temuan" && note.trim().length === 0) {
      showModal(
        "Catatan Kosong",
        "Kalau ada temuan, catatan wajib diisi biar jelas bro!",
        "warning",
      );
      return;
    }
    if (photos.length === 0) {
      showModal(
        "Bukti Kosong",
        "Wajib lampirkan minimal 1 foto bukti patroli!",
        "warning",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !authData.user)
        throw new Error("Sesi pengguna tidak valid.");
      const userId = authData.user.id;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("siteId")
        .eq("id", userId)
        .single();
      if (userError || !userData?.siteId)
        throw new Error("Gagal mengambil data penempatan (site) kamu.");

      const locStatus = await Location.requestForegroundPermissionsAsync();
      if (locStatus.status !== "granted")
        throw new Error("Izin akses lokasi GPS ditolak.");

      const gps = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const now = new Date();
      const localDateTime = now.toISOString();
      const dateOnly = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const newPatrolId = `ptr_${Date.now()}`;
      const patrolStatusDB = status === "Aman" ? "COMPLETED" : "INCIDENT";

      const { error: insertPatrolError } = await supabase
        .from("patrols")
        .insert({
          id: newPatrolId,
          userId: userId,
          siteId: userData.siteId,
          patrolLocationId: locationId as string,
          date: dateOnly,
          status: patrolStatusDB,
          checkInTime: localDateTime,
          gpsLat: gps.coords.latitude,
          gpsLng: gps.coords.longitude,
          gpsAccuracy: gps.coords.accuracy,
          barcodeScanned: true, // Untuk Dev Test nggak masalah diset true
          description: note,
          updatedAt: localDateTime,
        });
      if (insertPatrolError)
        throw new Error(
          `Gagal menyimpan laporan: ${insertPatrolError.message}`,
        );

      const uploadPromises = photos.map(async (photoUri, index) => {
        const fileName = `${userId}/${newPatrolId}_ev_${index + 1}.webp`;
        let finalUploadData: any;

        if (Platform.OS === "web") {
          const res = await fetch(photoUri);
          finalUploadData = await res.blob();
        } else {
          const formData = new FormData();
          formData.append("file", {
            uri: photoUri,
            name: fileName,
            type: "image/webp",
          } as any);
          finalUploadData = formData;
        }

        const { data: storageData, error: storageError } =
          await supabase.storage
            .from("patrol-photos")
            .upload(fileName, finalUploadData, {
              contentType:
                Platform.OS === "web" ? "image/webp" : "multipart/form-data",
              upsert: true,
            });

        if (storageError) throw storageError;
        const { data: publicUrlData } = supabase.storage
          .from("patrol-photos")
          .getPublicUrl(storageData.path);
        return publicUrlData.publicUrl;
      });

      const uploadedImageUrls = await Promise.all(uploadPromises);

      const evidenceRecords = uploadedImageUrls.map((url, index) => ({
        id: `pev_${Date.now()}_${index}`,
        patrolId: newPatrolId,
        imageUrl: url,
        caption: `Bukti Foto ke-${index + 1}`,
      }));

      const { error: evidenceError } = await supabase
        .from("patrol_evidence")
        .insert(evidenceRecords);
      if (evidenceError)
        throw new Error(`Gagal menyimpan foto bukti: ${evidenceError.message}`);

      supabase.auth.getSession().then(({ data: currentSession }) => {
        sendActivityLog(
          "SUCCESS",
          currentSession?.session?.access_token || "",
          currentSession?.session?.user?.email || "unknown@hris.com",
          { action: "PATROL_SUBMIT" },
        ).catch(() => {});
      });

      setIsSubmitting(false);

      showModal(
        "Berhasil!",
        "Laporan patroli berhasil dikirim ke server.",
        "success",
        "Tutup",
        () => {
          setModalVisible(false);
          router.back();
        },
      );
    } catch (error: any) {
      setIsSubmitting(false);
      showModal(
        "Gagal Submit",
        error.message || "Terjadi kesalahan server.",
        "error",
      );
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {isPageLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-slate-500 font-medium">
            Memvalidasi Area Patroli...
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            className="flex-1 pt-12 px-5"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Halaman */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
              >
                <Ionicons name="close" size={24} color="#334155" />
              </TouchableOpacity>
              <Text className="text-xl font-bold text-slate-800">
                Form Laporan
              </Text>
            </View>

            {/* Info Lokasi */}
            <View className="bg-blue-500 rounded-2xl p-5 shadow-sm mb-6 flex-row items-center">
              <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-4">
                <Ionicons name="qr-code-outline" size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-0.5">
                  {dbSiteName || "Area Site"}
                </Text>
                <Text
                  className="text-white text-lg font-bold"
                  numberOfLines={2}
                >
                  {dbLocationName}
                </Text>
              </View>
            </View>

            {/* Form Status */}
            <Text className="text-slate-800 text-base font-bold mb-3 ml-1">
              Status Kondisi
            </Text>
            <View className="flex-row mb-6">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStatus("Aman")}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border mr-2 ${status === "Aman" ? "bg-green-50 border-green-500" : "bg-white border-slate-200"}`}
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
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border ml-2 ${status === "Temuan" ? "bg-red-50 border-red-500" : "bg-white border-slate-200"}`}
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

            {/* Form Foto */}
            <View className="flex-row items-center justify-between mb-3 ml-1">
              <Text className="text-slate-800 text-base font-bold">
                Foto Bukti <Text className="text-red-500">*</Text>
              </Text>
              <Text className="text-slate-400 text-xs">
                {photos.length}/{MAX_PHOTOS} Foto terpilih
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-6"
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {photos.map((uri, index) => (
                <View key={index} className="mr-3 pt-2 pr-2 relative">
                  <View className="w-28 h-28 bg-slate-200 rounded-2xl border border-slate-300 overflow-hidden">
                    <Image
                      source={{ uri: uri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemovePhoto(uri)}
                    className="absolute top-0 right-0 w-7 h-7 bg-red-500 rounded-full items-center justify-center border-2 border-white shadow-sm"
                    style={{ zIndex: 10, elevation: 5 }}
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}

              {photos.length < MAX_PHOTOS && (
                <View className="flex-row pt-2">
                  <TouchableOpacity
                    onPress={handleAddPhotoCamera}
                    disabled={isCompressing || isSubmitting}
                    activeOpacity={0.6}
                    className="w-28 h-28 mr-3 bg-blue-50/50 rounded-2xl items-center justify-center border border-dashed border-blue-300"
                  >
                    {isCompressing ? (
                      <ActivityIndicator color="#3b82f6" />
                    ) : (
                      <>
                        <Ionicons name="camera" size={28} color="#3b82f6" />
                        <Text className="text-blue-500 text-xs mt-2 font-semibold">
                          Kamera
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddPhotoGallery}
                    disabled={isCompressing || isSubmitting}
                    activeOpacity={0.6}
                    className="w-28 h-28 bg-purple-50/50 rounded-2xl items-center justify-center border border-dashed border-purple-300"
                  >
                    {isCompressing ? (
                      <ActivityIndicator color="#a855f7" />
                    ) : (
                      <>
                        <Ionicons name="images" size={28} color="#a855f7" />
                        <Text className="text-purple-500 text-xs mt-2 font-semibold">
                          Galeri
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Form Catatan */}
            <Text className="text-slate-800 text-base font-bold mb-3 ml-1">
              Catatan Laporan{" "}
              {status === "Temuan" && <Text className="text-red-500">*</Text>}
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
              onPress={submitPatrolReport}
              className="flex-row items-center justify-center py-4 rounded-xl shadow-sm bg-slate-800 active:bg-slate-700"
            >
              <Ionicons name="send" size={20} color="white" />
              <Text className="text-white font-bold text-base ml-2">
                Submit Laporan
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* LOADING OVERLAY SAAT SUBMIT */}
      <Modal transparent visible={isSubmitting} animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white p-6 rounded-3xl items-center w-3/4 shadow-2xl">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-4 text-slate-800 font-bold text-lg">
              Mengirim Laporan...
            </Text>
            <Text className="mt-2 text-slate-500 text-sm text-center">
              Sedang mengunggah foto & data. Mohon jangan tutup aplikasi.
            </Text>
          </View>
        </View>
      </Modal>

      {/* CUSTOM ERROR / SUCCESS MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-2xl">
            <View
              className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${modalContent.type === "success" ? "bg-green-100" : modalContent.type === "error" ? "bg-red-100" : modalContent.type === "warning" ? "bg-orange-100" : "bg-blue-100"}`}
            >
              <Ionicons
                name={
                  modalContent.type === "success"
                    ? "checkmark-circle"
                    : modalContent.type === "error"
                      ? "close-circle"
                      : modalContent.type === "warning"
                        ? "warning"
                        : "information-circle"
                }
                size={36}
                color={
                  modalContent.type === "success"
                    ? "#16a34a"
                    : modalContent.type === "error"
                      ? "#dc2626"
                      : modalContent.type === "warning"
                        ? "#ea580c"
                        : "#3b82f6"
                }
              />
            </View>
            <Text className="text-xl font-bold text-slate-800 mb-2 text-center">
              {modalContent.title}
            </Text>
            <Text className="text-slate-500 text-center mb-6 leading-relaxed">
              {modalContent.message}
            </Text>
            <TouchableOpacity
              onPress={modalContent.onPress}
              className={`w-full py-4 rounded-xl items-center shadow-sm ${modalContent.type === "success" ? "bg-green-600 active:bg-green-700" : modalContent.type === "error" ? "bg-red-600 active:bg-red-700" : modalContent.type === "warning" ? "bg-orange-600 active:bg-orange-700" : "bg-blue-600 active:bg-blue-700"}`}
            >
              <Text className="text-white font-bold text-base">
                {modalContent.buttonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
