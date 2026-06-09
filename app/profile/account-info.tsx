import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function AccountInfoScreen() {
  const router = useRouter();

  // State untuk nyimpen status apakah data rekening mau ditampilkan atau disembunyikan
  const [isBankVisible, setIsBankVisible] = useState(false);

  // Dummy data lengkap
  const accountData = {
    // Karyawan
    employeeId: "CAS-2026-001",
    joinDate: "15 Januari 2026",

    // Kontak
    personalEmail: "adi.candra.personal@email.com",
    phoneNumber: "+62 812 3456 7890",
    address: "Bogor, Jawa Barat",

    // Pribadi
    fullName: "Adi Candra Listiawan",
    birthPlaceDate: "Bogor, 17 Agustus 1998",
    gender: "Laki-laki",
    religion: "Islam",
    bloodType: "O",
    maritalStatus: "Belum Kawin",

    // Legal
    ktp: "3201234567890001",
    bpjs: "0001234567890",
    npwp: "12.345.678.9-123.000",

    // Rekening / Payroll
    bankAccount: {
      bankName: "Bank Central Asia (BCA)",
      accountName: "Adi Candra Listiawan",
      accountNumber: "8765432109",
    },
  };

  // Fungsi buat bikin teks jadi bintang-bintang (sensor) kalau lagi disembunyikan
  const renderSecureText = (text: string) => {
    return isBankVisible ? text : "••••••••••••••••";
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
        <InfoItem label="ID Karyawan" value={accountData.employeeId} />
        <InfoItem
          label="Tanggal Bergabung"
          value={accountData.joinDate}
          isLast
        />
      </View>

      {/* 2. Kategori Data Pribadi */}
      <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
        Data Pribadi
      </Text>
      <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mb-6">
        <InfoItem label="Nama Lengkap" value={accountData.fullName} />
        <InfoItem
          label="Tempat, Tanggal Lahir"
          value={accountData.birthPlaceDate}
        />
        <InfoItem label="Jenis Kelamin" value={accountData.gender} />
        <InfoItem label="Agama" value={accountData.religion} />
        <InfoItem label="Golongan Darah" value={accountData.bloodType} />
        <InfoItem
          label="Status Pernikahan"
          value={accountData.maritalStatus}
          isLast
        />
      </View>

      {/* 3. Kategori Kontak & Domisili */}
      <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
        Kontak & Domisili
      </Text>
      <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mb-6">
        <InfoItem label="Personal Email" value={accountData.personalEmail} />
        <InfoItem label="Nomor Telepon" value={accountData.phoneNumber} />
        <InfoItem label="Alamat Domisili" value={accountData.address} isLast />
      </View>

      {/* 4. Kategori Legal & Administrasi */}
      <Text className="text-slate-800 font-bold mb-3 ml-1 text-base">
        Legal & Administrasi
      </Text>
      <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mb-6">
        <InfoItem label="Nomor KTP" value={accountData.ktp} />
        <InfoItem label="Nomor BPJS" value={accountData.bpjs} />
        <InfoItem label="Nomor NPWP" value={accountData.npwp} isLast />
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
          value={renderSecureText(accountData.bankAccount.bankName)}
        />
        <InfoItem
          label="Nama Nasabah"
          value={renderSecureText(accountData.bankAccount.accountName)}
        />
        <InfoItem
          label="Nomor Rekening"
          value={renderSecureText(accountData.bankAccount.accountNumber)}
          isLast
        />
      </View>

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
