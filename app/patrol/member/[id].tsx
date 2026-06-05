import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function MemberDetailScreen() {
  const router = useRouter();

  // Nangkep parameter dari halaman list anggota
  const { name, role, reported, remaining } = useLocalSearchParams();

  // Dummy data titik lokasi yang menjadi tugas personil ini
  const assignedPoints = [
    {
      id: 1,
      location: "Pos Gerbang Utama",
      lastChecked: "08:15",
      reportCount: 3,
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
    <ScrollView
      className="flex-1 bg-slate-50 pt-12 px-5"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Header Halaman */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mr-4 active:bg-slate-50"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">
          Detail Patroli Anggota
        </Text>
      </View>

      {/* Card Info Personil (Header Profile) */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
        <View className="flex-row items-center mb-4 pb-4 border-b border-slate-100">
          <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="person" size={24} color="#3b82f6" />
          </View>
          <View>
            <Text className="text-lg font-bold text-slate-800">
              {name || "Nama Anggota"}
            </Text>
            <Text className="text-slate-500 text-sm">
              {role || "Role Anggota"}
            </Text>
          </View>
        </View>

        {/* Statistik Titik */}
        <View className="flex-row justify-between items-center">
          <View className="items-center flex-1 border-r border-slate-100">
            <Text className="text-2xl font-bold text-green-600">
              {reported || 0}
            </Text>
            <Text className="text-slate-500 text-xs mt-1">Titik Selesai</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-orange-500">
              {remaining || 0}
            </Text>
            <Text className="text-slate-500 text-xs mt-1">Belum Dicek</Text>
          </View>
        </View>
      </View>

      {/* List Titik Patroli */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-slate-800 text-lg font-bold">
            Tugas Titik Patroli
          </Text>
          <Text className="text-blue-500 text-sm font-semibold">
            {assignedPoints.length} Titik
          </Text>
        </View>

        {/* Looping data titik tugas */}
        {assignedPoints.map((item, index) => {
          const hasReport = item.reportCount > 0;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.6}
              // Langsung arahin ke halaman detail titik yang udah kita bikin sebelumnya!
              onPress={() => router.push(`/patrol/${item.id}` as any)}
              className={`flex-row items-center justify-between py-3 ${
                index !== assignedPoints.length - 1
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
    </ScrollView>
  );
}
