import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function MemberReportsScreen() {
  const router = useRouter();

  const membersOnDuty = [
    {
      id: 1,
      name: "Budi Santoso",
      role: "Danru - Shift Pagi",
      reported: 5,
      remaining: 0,
    },
    {
      id: 2,
      name: "Agus Setiawan",
      role: "Anggota - Shift Pagi",
      reported: 3,
      remaining: 2,
    },
    {
      id: 3,
      name: "Rian Hidayat",
      role: "Anggota - Shift Pagi",
      reported: 1,
      remaining: 4,
    },
    {
      id: 4,
      name: "Dedi Kurniawan",
      role: "Anggota - Shift Pagi",
      reported: 0,
      remaining: 5,
    },
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
          Laporan Anggota
        </Text>
      </View>

      {/* Card Ringkasan Info */}
      <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
        <Text className="text-slate-800 text-base font-bold mb-1">
          Status Shift Pagi
        </Text>
        <Text className="text-slate-500 text-sm">
          {membersOnDuty.length} Personil Standby • Total 20 Titik Pengecekan
        </Text>
      </View>

      <Text className="text-slate-800 text-base font-bold mb-4 ml-1">
        Daftar Personil
      </Text>

      {/* Looping List Anggota */}
      {membersOnDuty.map((member) => {
        const isAllDone = member.remaining === 0;

        return (
          // 👇 Ubah View ini jadi TouchableOpacity 👇
          <TouchableOpacity
            key={member.id}
            activeOpacity={0.6}
            onPress={() =>
              router.push({
                pathname: `/patrol/member/${member.id}` as any,
                // Bawa data personil sebagai parameter ke halaman detail
                params: {
                  name: member.name,
                  role: member.role,
                  reported: member.reported,
                  remaining: member.remaining,
                },
              })
            }
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4"
          >
            {/* Baris Atas: Nama & Role */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <View className="flex-row items-center">
                <View className="w-11 h-11 bg-slate-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="person-outline" size={20} color="#64748b" />
                </View>
                <View>
                  <Text className="text-base font-bold text-slate-800">
                    {member.name}
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    {member.role}
                  </Text>
                </View>
              </View>

              {/* Badge Status Kerja & Icon Chevron Biar Keliatan Bisa Diklik */}
              <View className="flex-row items-center">
                <View
                  className={`px-2.5 py-1 rounded-full mr-2 ${isAllDone ? "bg-green-50" : "bg-blue-50"}`}
                >
                  <Text
                    className={`text-xs font-bold ${isAllDone ? "text-green-600" : "text-blue-600"}`}
                  >
                    {isAllDone ? "Patroli Selesai" : "On Duty"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </View>
            </View>

            {/* Baris Bawah: Statistik Titik */}
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                <Text className="text-slate-600 text-sm">
                  <Text className="font-bold text-slate-800">
                    {member.reported}
                  </Text>{" "}
                  Titik Dilaporkan
                </Text>
              </View>

              <View className="flex-row items-center">
                <View
                  className={`w-2 h-2 rounded-full mr-2 ${member.remaining > 0 ? "bg-orange-500" : "bg-slate-300"}`}
                />
                <Text className="text-slate-600 text-sm">
                  Sisa{" "}
                  <Text className="font-bold text-slate-800">
                    {member.remaining}
                  </Text>{" "}
                  Titik
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
