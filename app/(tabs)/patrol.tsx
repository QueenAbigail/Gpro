import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router"; // <-- Import ini wajib ada
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function PatrolScreen() {
  const router = useRouter(); // <-- Variabel router wajib dikenalin di sini

  const dummyPatrolPoints = [
    {
      id: 1,
      location: "Pos Gerbang Utama",
      lastChecked: "08:15",
      reportCount: 2,
    },
    {
      id: 2,
      location: "Lobby Utama Gedung",
      lastChecked: "10:05",
      reportCount: 1,
    },
    { id: 3, location: "Gudang Belakang", lastChecked: null, reportCount: 0 },
    {
      id: 4,
      location: "Area Parkir Karyawan",
      lastChecked: null,
      reportCount: 0,
    },
    { id: 5, location: "Ruang Server", lastChecked: null, reportCount: 0 },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-50 pt-12 px-5">
      {/* 1. Card Laporan Patroli */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-5">
        <Text className="text-slate-500 text-sm font-semibold mb-3">
          Pantau Aktivitas
        </Text>
        <TouchableOpacity
          // Tambahkan baris onPress ini biar dia pindah ke halaman laporan anggota
          onPress={() => router.push("/patrol/member-reports")}
          className="bg-blue-500 flex-row items-center justify-center py-4 rounded-xl shadow-sm active:bg-blue-600"
        >
          <Ionicons name="clipboard" size={24} color="white" />
          <Text className="text-white font-bold text-base ml-3">
            Laporan Patroli Anggota
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Card List Titik Patroli */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-slate-800 text-lg font-bold">
            Titik Patroli Hari Ini
          </Text>
          <Text className="text-blue-500 text-sm font-semibold">5 Titik</Text>
        </View>

        {/* Looping data dummy */}
        {dummyPatrolPoints.map((item, index) => {
          const hasReport = item.reportCount > 0;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.6}
              onPress={() => router.push(`/patrol/${item.id}`)} // <-- Sekarang routernya udah bisa dipanggil
              className={`flex-row items-center justify-between py-3 ${
                index !== dummyPatrolPoints.length - 1
                  ? "border-b border-slate-100"
                  : ""
              }`}
            >
              <View className="flex-row items-center flex-1">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    hasReport ? "bg-green-100" : "bg-slate-100"
                  }`}
                >
                  <Ionicons
                    name={hasReport ? "checkmark-circle" : "location"}
                    size={20}
                    color={hasReport ? "#16a34a" : "#94a3b8"}
                  />
                </View>

                <View>
                  <Text
                    className={`text-base font-semibold ${hasReport ? "text-slate-800" : "text-slate-600"}`}
                  >
                    {item.location}
                  </Text>
                  <Text className="text-slate-400 text-sm mt-0.5">
                    Terakhir di Check:{" "}
                    {item.lastChecked ? `${item.lastChecked} WIB` : "Belum"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View
                  className={`px-3 py-1 rounded-full mr-1 ${
                    hasReport ? "bg-green-50" : "bg-orange-50"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      hasReport ? "text-green-600" : "text-orange-500"
                    }`}
                  >
                    {item.reportCount} Report
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* ... kode card list titik lokasi yang ada di atasnya ... */}

      {/* 👇 TOMBOL TESTING / BACKDOOR 👇 */}
      {/* Nanti dihapus kalau fitur scan QR beneran udah jadi */}
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/patrol/input" as any,
            params: { locationId: "1" }, // Pura-puranya kita berhasil nge-scan QR lokasi ID 1
          })
        }
        className="bg-indigo-100 border border-indigo-200 py-4 rounded-xl items-center justify-center mb-10 flex-row border-dashed"
      >
        <Ionicons name="bug-outline" size={20} color="#4338ca" />
        <Text className="text-indigo-700 font-bold ml-2">
          [DEV] Simulasi Scan QR
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
