import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase"; // Pastikan path ini benar

export default function AccountInfoScreen() {
  const router = useRouter();

  // State untuk nyimpen status apakah data rekening mau ditampilkan atau disembunyikan
  const [isBankVisible, setIsBankVisible] = useState(false);

  // State untuk nyimpen data dari Supabase
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<any>(null);

  // Fungsi fetch dengan gerbang cache
  const fetchAccountInfo = async (isManual = false) => {
    // GERBANG TOL CACHE: Kalau bukan fetch manual dan data udah ada, skip!
    if (!isManual && dbUser) {
      console.log("Data akun udah di cache, skip fetch!");
      return;
    }

    try {
      setLoading(true);
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) throw new Error("Gagal ambil sesi user");

      // 👇 Nanti lu tinggal ubah bagian select() ini kalau ada join tabel dll
      const { data: accountData, error: accountError } = await supabase
        .from("users")
        .select(`*`)
        .eq("id", authData.user.id)
        .maybeSingle();

      if (accountError) throw accountError;

      setDbUser(accountData);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Gagal memuat data informasi akun.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Trigger otomatis setiap kali halaman dibuka (tapi ketahan gerbang cache kalau udah ada)
  useFocusEffect(
    useCallback(() => {
      fetchAccountInfo();
    }, [dbUser]),
  );

  // Fungsi buat bikin teks jadi bintang-bintang (sensor) kalau lagi disembunyikan
  const renderSecureText = (text: string) => {
    if (loading) return "Memuat...";
    if (!text) return "Belum ada data";
    return isBankVisible ? text : "••••••••••••••••";
  };

  // 👇 NAH, TARUH DI SINI PAS DI BAWAHNYA, CAN!
  const formatTempatTanggalLahir = (city?: string, date?: string) => {
    if (loading) return "Memuat...";
    if (!city && !date) return "Belum ada data";

    let formattedDate = date;

    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }

    if (city && formattedDate) {
      return `${city}, ${formattedDate}`;
    }

    return city || formattedDate || "Belum ada data";
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50 pt-16 px-6"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Header Custom */}
      <View className="flex-row items-center mb-8">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Informasi Akun</Text>
      </View>

      {/* 1. Kategori Data Karyawan */}
      <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
        Data Perusahaan
      </Text>
      <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mb-6">
        <InfoItem
          label="ID Karyawan"
          value={
            loading ? "Memuat..." : dbUser?.employeeCode || "Belum ada data"
          }
        />
        <InfoItem
          label="Tanggal Bergabung"
          value={loading ? "Memuat..." : dbUser?.joinDate || "Belum ada data"}
          isLast
        />
      </View>

      {/* 2. Kategori Data Pribadi */}
      <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
        Data Pribadi
      </Text>
      <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mb-6">
        <InfoItem
          label="Nama Lengkap"
          value={loading ? "Memuat..." : dbUser?.name || "Belum ada data"}
        />
        <InfoItem
          label="Tempat, Tanggal Lahir"
          value={
            (loading ? "Memuat..." : dbUser?.birthCity,
            dbUser?.birthDate || "Belum ada data")
          }
        />
        <InfoItem
          label="Jenis Kelamin"
          value={loading ? "Memuat..." : dbUser?.gender || "Belum ada data"}
        />
        <InfoItem
          label="Agama"
          value={loading ? "Memuat..." : dbUser?.religion || "Belum ada data"}
        />
        <InfoItem
          label="Golongan Darah"
          value={loading ? "Memuat..." : dbUser?.bloodType || "Belum ada data"}
        />
        <InfoItem
          label="Status Pernikahan"
          value={
            loading ? "Memuat..." : dbUser?.maritalStatus || "Belum ada data"
          }
          isLast
        />
      </View>

      {/* 3. Kategori Kontak & Domisili */}
      <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
        Kontak & Domisili
      </Text>
      <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mb-6">
        <InfoItem
          label="Personal Email"
          value={
            loading ? "Memuat..." : dbUser?.personalEmail || "Belum ada data"
          }
        />
        <InfoItem
          label="Nomor Telepon"
          value={
            loading ? "Memuat..." : dbUser?.phoneNumber || "Belum ada data"
          }
        />
        <InfoItem
          label="Alamat Domisili"
          value={loading ? "Memuat..." : dbUser?.address || "Belum ada data"}
          isLast
        />
      </View>

      {/* 4. Kategori Legal & Administrasi */}
      <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
        Legal & Administrasi
      </Text>
      <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mb-6">
        <InfoItem
          label="Nomor KTP"
          value={loading ? "Memuat..." : dbUser?.ktpNumber || "Belum ada data"}
        />
        <InfoItem
          label="Nomor BPJS"
          value={loading ? "Memuat..." : dbUser?.bpjsNumber || "Belum ada data"}
        />
        <InfoItem
          label="Nomor NPWP"
          value={loading ? "Memuat..." : dbUser?.npwpNumber || "Belum ada data"}
          isLast
        />
      </View>

      {/* 5. Kategori Rekening / Payroll (Dengan Fitur Sensor) */}
      <View className="flex-row justify-between items-center mb-3 ml-1">
        <Text className="text-slate-800 font-bold text-base">
          Informasi Rekening
        </Text>
        <TouchableOpacity
          onPress={() => setIsBankVisible(!isBankVisible)}
          className="flex-row items-center bg-blue-50 px-3 py-1.5 rounded-full"
        >
          <Ionicons
            name={isBankVisible ? "eye-off" : "eye"}
            size={16}
            color="#3b82f6"
          />
          <Text className="text-blue-600 text-xs font-bold ml-1">
            {isBankVisible ? "Sembunyikan" : "Tampilkan"}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mb-6">
        <InfoItem
          label="Nama Bank"
          value={renderSecureText(dbUser?.bankName)}
        />
        <InfoItem
          label="Nama Nasabah"
          value={renderSecureText(dbUser?.accountHolder)}
        />
        <InfoItem
          label="Nomor Rekening"
          value={renderSecureText(dbUser?.accountNumber)}
          isLast
        />
      </View>

      {/* 👇 Tombol DEV - Cuma muncul kalau user ini SUPER_ADMIN atau ADMIN */}
      {(dbUser?.role === "SUPER_ADMIN" || dbUser?.role === "ADMIN") && (
        <TouchableOpacity
          onPress={() => fetchAccountInfo(true)} // parameter true buat maksa nembus cache
          className="bg-indigo-100 border border-indigo-200 py-4 rounded-xl items-center justify-center mb-6 flex-row border-dashed"
        >
          <Ionicons name="bug-outline" size={20} color="#4338ca" />
          <Text className="text-indigo-700 font-bold ml-2">
            [DEV] Tarik Ulang Data Akun
          </Text>
        </TouchableOpacity>
      )}

      {/* Banner Info Tambahan */}
      <View className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex-row items-center mb-4">
        <Ionicons name="information-circle" size={28} color="#3b82f6" />
        <Text className="text-blue-800 text-sm ml-3 flex-1 leading-relaxed font-medium">
          Jika ada kesalahan atau perubahan data, silakan hubungi pihak HRD
          untuk melakukan pembaruan di sistem.
        </Text>
      </View>
    </ScrollView>
  );
}

// Komponen Helper Biar Kode Lebih Bersih
function InfoItem({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View className={`px-4 py-4 ${!isLast ? "border-b border-slate-50" : ""}`}>
      <Text className="text-slate-400 text-xs font-bold uppercase mb-1">
        {label}
      </Text>
      <Text className="text-slate-800 text-base font-semibold tracking-wide">
        {value}
      </Text>
    </View>
  );
}
