import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase"; // Sesuaikan path ini dengan lokasi file Anda

export default function EmployeeListScreen() {
  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Helper untuk mengelompokkan data berdasarkan Nama Site
  const formatSections = (list: any[]) => {
    const groups: { [key: string]: any[] } = {};

    list.forEach((item) => {
      // Mengambil nama site dari relasi Supabase atau fallback ke siteId
      const siteName =
        item.sites?.name ||
        item.site?.name ||
        item.siteName ||
        item.siteId ||
        "Tanpa Site";

      if (!groups[siteName]) {
        groups[siteName] = [];
      }
      groups[siteName].push(item);
    });

    return Object.keys(groups).map((siteName) => ({
      title: siteName,
      data: groups[siteName],
    }));
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      // 1. Ambil data user yang sedang login
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Gagal mengambil sesi user");

      const { data: currentUser } = await supabase
        .from("users")
        .select("role, siteId, position")
        .eq("id", user.id)
        .single();

      if (!currentUser) throw new Error("User tidak ditemukan");

      // 2. Query data karyawan + Join tabel sites untuk mengambil nama site
      let query = supabase
        .from("users")
        .select("*, sites(name)")
        .order("name", { ascending: true });

      // 3. LOGIKA FILTER: Jika bukan SUPER_ADMIN / HR_ADMIN, filter berdasarkan siteId
      if (
        currentUser.role !== "SUPER_ADMIN" &&
        currentUser.role !== "HR_ADMIN"
      ) {
        query = query.eq("siteId", currentUser.siteId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setEmployees(data);
        setSections(formatSections(data));
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logika Pencarian
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() !== "") {
      const filtered = employees.filter((item) => {
        const name = item.name ? item.name.toUpperCase() : "";
        const pos = item.position ? item.position.toUpperCase() : "";
        const siteName = (
          item.sites?.name ||
          item.siteId ||
          ""
        ).toUpperCase();
        const search = text.toUpperCase();

        return (
          name.includes(search) ||
          pos.includes(search) ||
          siteName.includes(search)
        );
      });
      setSections(formatSections(filtered));
    } else {
      setSections(formatSections(employees));
    }
  };

  // Render Item Kartu Karyawan
  const renderEmployeeItem = ({ item }: { item: any }) => {
    const firstName = item.name ? item.name.split(" ")[0] : "User";
    const siteName = item.sites?.name || item.siteId || "Belum Ada Site";
    const positionText = item.position || "STAFF";

    return (
      <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-3 flex-row items-center">
        <Image
          source={{
            uri:
              item.photoUrl ||
              `https://ui-avatars.com/api/?name=${firstName}&background=0b5394&color=fff&size=128`,
          }}
          className="w-14 h-14 rounded-full mr-4 border-2 border-slate-50"
        />
        <View className="flex-1">
          <Text
            className="text-gray-900 font-bold text-base mb-1"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View className="flex-row items-center mb-1">
            <Ionicons name="business-outline" size={13} color="#64748b" />
            <Text
              className="text-slate-500 text-xs ml-1 mr-2"
              numberOfLines={1}
            >
              {siteName}
            </Text>
          </View>
        </View>

        {/* Badge Position (Jabatan) */}
        <View className="bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100">
          <Text className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider">
            {positionText}
          </Text>
        </View>
      </View>
    );
  };

  // Render Header Kelompok Site
  const renderSectionHeader = ({
    section: { title },
  }: {
    section: { title: string };
  }) => (
    <View className="bg-sky-50 py-2.5 mb-2 flex-row items-center">
      <Ionicons name="location-sharp" size={16} color="#0284c7" />
      <Text className="text-sky-900 font-extrabold text-xs ml-1.5 uppercase tracking-wider">
        {title}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-sky-50 pt-12">
      {/* Header */}
      <View className="flex-row items-center px-5 mb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-gray-200 mr-4"
        >
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-gray-900">
          Data Karyawan
        </Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-4">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm">
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 text-gray-900 font-medium ml-2 text-base py-1"
            placeholder="Cari nama atau jabatan..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Grouped List Karyawan */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className="text-gray-500 mt-4 font-medium">
            Memuat data karyawan...
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEmployeeItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View className="items-center justify-center mt-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="people-outline" size={40} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 font-medium">
                {searchQuery
                  ? "Karyawan tidak ditemukan."
                  : "Belum ada data karyawan."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}