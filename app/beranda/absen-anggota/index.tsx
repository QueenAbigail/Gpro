import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { supabase } from "../../../lib/supabase";

export default function AbsenAnggotaScreen() {
  const router = useRouter();

  // States Utama
  const [daftarAnggota, setDaftarAnggota] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // States Khusus Head Office
  const [isHOUser, setIsHOUser] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedSiteName, setSelectedSiteName] = useState("Head Office");
  const [sitesList, setSitesList] = useState<any[]>([]);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [searchSite, setSearchSite] = useState("");

  // States Modal Detail
  const [selectedAnggota, setSelectedAnggota] = useState<any>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSelfieModal, setShowSelfieModal] = useState(false);

  // Fungsi Pembantu: Format Jam (HH:mm)
  const formatTime = (dateString: string) => {
    if (!dateString) return "--:--";
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchAbsenData = useCallback(
    async (targetSiteId: string, isHO: boolean, currentSitesList: any[]) => {
      setIsFetching(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) throw new Error("Sesi tidak ditemukan");

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Mulai dari jam 00:00 hari ini

        const todayDateOnly = `${today.getFullYear()}-${String(
          today.getMonth() + 1,
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        // 1. Query User: filter berdasarkan site (atau semua site jika HO memilih "ALL")
        let usersQuery = supabase
          .from("users")
          .select("id, name, siteId")
          .neq("id", authData.user.id);

        if (isHO && targetSiteId === "ALL") {
          // Tarik semua user lintas site
        } else {
          usersQuery = usersQuery.eq("siteId", targetSiteId);
        }

        const { data: usersData, error: usersError } = await usersQuery;
        if (usersError) throw usersError;

        if (!usersData || usersData.length === 0) {
          setDaftarAnggota([]);
          return;
        }

        const userIds = usersData.map((u) => u.id);

        // 2. Tarik Data Pendukung secara Paralel
        const [assignmentsRes, shiftsRes, attendancesRes, leavesRes, bkoRes] =
          await Promise.all([
            supabase
              .from("employee_pattern_assignments")
              .select("userId, startDate")
              .in("userId", userIds),
            supabase.from("shifts").select("*"),
            supabase
              .from("attendances")
              .select("userId, actualCheckIn, actualCheckOut, selfieCheckIn")
              .eq("date", todayDateOnly)
              .in("userId", userIds),
            supabase
              .from("leaves")
              .select("userId, leaveType, id")
              .lte("startDate", today.toISOString())
              .gte("endDate", today.toISOString())
              .in("userId", userIds),
            supabase
              .from("bko_assignments")
              .select("leaveId")
              .eq("status", "Aktif"),
          ]);

        const assignmentsData = assignmentsRes.data || [];
        const shiftsData = shiftsRes.data || [];
        const attendancesData = attendancesRes.data || [];
        const leavesData = leavesRes.data || [];
        const bkoData = bkoRes.data || [];
        const lakuBKO = bkoData.map((b) => b.leaveId);

        // Map nama site untuk badge
        const sitesMap = new Map<string, string>();
        currentSitesList.forEach((s) => sitesMap.set(s.id, s.name));

        // --- LOGIC PERHITUNGAN & PENGGABUNGAN DATA ---
        const currentTime = new Date();
        const processedData: any[] = [];

        usersData.forEach((user: any) => {
          // Ambil assignment yang aktif
          const assignment = assignmentsData.find((a) => a.userId === user.id);
          if (!assignment || !assignment.startDate) return; // Lewati kalau gak punya jadwal

          const startDate = new Date(assignment.startDate);
          startDate.setHours(0, 0, 0, 0);

          const diffTime = today.getTime() - startDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 0) return;

          // Pola per 8 hari (2 Pagi, 2 Sore, 2 Malam, 2 Off)
          const cycleDay = diffDays % 8;
          let shiftHariIni: any = null;

          if (cycleDay === 0 || cycleDay === 1) {
            shiftHariIni = shiftsData.find((s) =>
              s.name?.toLowerCase().includes("pagi"),
            );
          } else if (cycleDay === 2 || cycleDay === 3) {
            shiftHariIni = shiftsData.find((s) =>
              s.name?.toLowerCase().includes("sore"),
            );
          } else if (cycleDay === 4 || cycleDay === 5) {
            shiftHariIni = shiftsData.find((s) =>
              s.name?.toLowerCase().includes("malam"),
            );
          } else {
            return; // Day Off, tidak perlu dimasukkan ke list
          }

          if (!shiftHariIni || !shiftHariIni.startTime || !shiftHariIni.endTime) {
            return;
          }

          // --- FILTER SHIFT JARAK 2 JAM & LEWAT ---
          const [shiftStartHour, shiftStartMinute] =
            shiftHariIni.startTime.split(":");
          const shiftStartDate = new Date(today);
          shiftStartDate.setHours(
            parseInt(shiftStartHour, 10),
            parseInt(shiftStartMinute, 10),
            0,
            0,
          );

          const [shiftEndHour, shiftEndMinute] =
            shiftHariIni.endTime.split(":");
          const shiftEndDate = new Date(today);
          shiftEndDate.setHours(
            parseInt(shiftEndHour, 10),
            parseInt(shiftEndMinute, 10),
            0,
            0,
          );

          // Kalau shift malam tembus besok hari
          if (shiftEndDate < shiftStartDate) {
            shiftEndDate.setDate(shiftEndDate.getDate() + 1);
          }

          // Filter: Cuma tampilin kalau (Sekarang >= 2 Jam sebelum mulai) DAN (Sekarang < Jam Selesai Shift)
          const twoHoursBeforeStart = new Date(
            shiftStartDate.getTime() - 2 * 60 * 60 * 1000,
          );
          if (currentTime < twoHoursBeforeStart || currentTime > shiftEndDate) {
            return; // Skip! Belum masuk radar 2 jam atau shift udah kelar
          }

          // --- TENTUKAN STATUS ---
          let status = "Belum Absen";
          let jamAbsen = "--:--";
          let selfieUrl = null;

          // Cek Sakit/Izin/BKO dulu
          const leaveMatch = leavesData.find((l) => l.userId === user.id);
          if (leaveMatch) {
            if (lakuBKO.includes(leaveMatch.id)) {
              status = "BKO";
            } else {
              status = leaveMatch.leaveType;
            }
          } else {
            // Cek Kehadiran Aktual
            const absenMatch = attendancesData.find((a) => a.userId === user.id);
            if (absenMatch && absenMatch.actualCheckIn) {
              const checkInTime = new Date(absenMatch.actualCheckIn);
              jamAbsen = formatTime(absenMatch.actualCheckIn);
              selfieUrl = absenMatch.selfieCheckIn;

              // Hitung toleransi keterlambatan (grace period)
              const graceMinutes = Number(
                shiftHariIni.gracePeriodMinutes ??
                  shiftHariIni.gracePeriod ??
                  0,
              );
              const lateThreshold = new Date(
                shiftStartDate.getTime() + graceMinutes * 60 * 1000,
              );

              if (checkInTime.getTime() > lateThreshold.getTime()) {
                status = "Terlambat";
              } else {
                status = "Hadir";
              }
            }
          }

          processedData.push({
            id: user.id,
            nama: user.name,
            siteId: user.siteId,
            siteName: sitesMap.get(user.siteId) || "Head Office",
            shift: `${shiftHariIni.name} (${shiftHariIni.startTime.substring(0, 5)} - ${shiftHariIni.endTime.substring(0, 5)})`,
            status: status,
            jamAbsen: jamAbsen,
            selfieUrl: selfieUrl,
          });
        });

        setDaftarAnggota(processedData);
      } catch (error) {
        console.error("Error tarik data absen anggota:", error);
      } finally {
        setIsFetching(false);
      }
    },
    [],
  );

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return;

        // Ambil profil user dan data sitenya
        const { data: myProfile } = await supabase
          .from("users")
          .select("id, role, siteId, sites(id, name, code)")
          .eq("id", authData.user.id)
          .single();

        if (!myProfile?.siteId) {
          setIsFetching(false);
          return;
        }

        const siteObj = Array.isArray(myProfile.sites)
          ? myProfile.sites[0]
          : myProfile.sites;
        const sName = siteObj?.name || "";
        const sCode = siteObj?.code || "";

        // Deteksi apakah user dari Head Office
        const isHO =
          sName.toLowerCase().includes("head office") ||
          sCode === "HO" ||
          myProfile.role === "SUPER_ADMIN";

        setIsHOUser(isHO);
        setSelectedSiteId(myProfile.siteId);
        setSelectedSiteName(sName || "Head Office");

        let sites: any[] = [];
        if (isHO) {
          const { data: allSites } = await supabase
            .from("sites")
            .select("id, name, code")
            .order("name");
          sites = allSites || [];
          setSitesList(sites);
        }

        // Default buka: ambil data site Head Office terlebih dahulu
        fetchAbsenData(myProfile.siteId, isHO, sites);
      } catch (err) {
        console.error("Error inisialisasi absen anggota:", err);
        setIsFetching(false);
      }
    };

    initPage();
  }, [fetchAbsenData]);

  const handleSelectSite = (site: { id: string; name: string }) => {
    setSelectedSiteId(site.id);
    setSelectedSiteName(site.name);
    setShowSiteModal(false);
    setSearchSite("");
    fetchAbsenData(site.id, isHOUser, sitesList);
  };

  const filteredSites = sitesList.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchSite.toLowerCase()) ||
      (s.code && s.code?.toLowerCase().includes(searchSite.toLowerCase())),
  );

  const handlePilihAnggota = (anggota: any) => {
    setSelectedAnggota(anggota);
    if (
      anggota.status === "Belum Absen" ||
      anggota.status === "Sakit" ||
      anggota.status === "Izin" ||
      anggota.status === "BKO"
    ) {
      setShowWarningModal(true);
    } else {
      setShowSelfieModal(true);
    }
  };

  // Helper Warna Badge Berdasarkan Status
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Hadir":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
          initialBg: "bg-emerald-100",
        };
      case "Terlambat":
        return {
          bg: "bg-orange-50",
          text: "text-orange-700",
          dot: "bg-orange-500",
          initialBg: "bg-orange-100",
        };
      case "Sakit":
        return {
          bg: "bg-rose-50",
          text: "text-rose-700",
          dot: "bg-rose-500",
          initialBg: "bg-rose-100",
        };
      case "Izin":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          dot: "bg-amber-500",
          initialBg: "bg-amber-100",
        };
      case "BKO":
        return {
          bg: "bg-purple-50",
          text: "text-purple-700",
          dot: "bg-purple-500",
          initialBg: "bg-purple-100",
        };
      default: // Belum Absen
        return {
          bg: "bg-slate-100",
          text: "text-slate-600",
          dot: "bg-slate-400",
          initialBg: "bg-blue-50",
        };
    }
  };

  return (
    <View className="flex-1 bg-sky-50">
      {/* --- HEADER --- */}
      <View className="pt-16 pb-4 px-6 bg-white flex-row items-center border-b border-sky-100 shadow-sm z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-sky-50 rounded-full items-center justify-center mr-4 active:bg-sky-100"
        >
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">Absen Anggota</Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            {isHOUser
              ? "Monitoring Kehadiran Seluruh Site"
              : "Pantau kehadiran harian"}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* INFO BANNER KOMANDAN / HO */}
        <View className="bg-violet-600 rounded-2xl p-4 flex-row items-center mb-5 shadow-sm">
          <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
            <Ionicons name="eye" size={24} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold mb-0.5">
              {isHOUser ? "Monitoring Pusat (Head Office)" : "Monitoring Harian"}
            </Text>
            <Text className="text-violet-100 text-xs leading-relaxed">
              {isHOUser
                ? "Pantau absensi personel di Head Office maupun di site-site operasional lapangan."
                : "Menampilkan seluruh jadwal anggota hari ini. Anda dapat mencatat kehadiran jika ada kendala sistem di lapangan."}
            </Text>
          </View>
        </View>

        {/* --- KHUSUS USER HEAD OFFICE: DROPDOWN FILTER LOKASI SITE --- */}
        {isHOUser && (
          <View className="mb-5">
            <Text className="text-gray-600 text-xs font-bold mb-1.5 ml-1">
              Filter Lokasi Site
            </Text>
            <TouchableOpacity
              onPress={() => setShowSiteModal(true)}
              activeOpacity={0.8}
              className="bg-white p-3.5 rounded-2xl flex-row items-center justify-between border border-sky-150 shadow-sm active:bg-sky-50"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mr-3">
                  <Ionicons
                    name={selectedSiteId === "ALL" ? "globe" : "business"}
                    size={18}
                    color="#2563eb"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-semibold">
                    Site yang Dipantau:
                  </Text>
                  <Text
                    className="text-gray-900 font-bold text-sm"
                    numberOfLines={1}
                  >
                    {selectedSiteName}
                  </Text>
                </View>
              </View>
              <View className="bg-gray-100 px-2 py-1 rounded-lg flex-row items-center">
                <Text className="text-gray-600 text-xs font-semibold mr-1">
                  Ganti
                </Text>
                <Ionicons name="chevron-down" size={14} color="#64748b" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-gray-800 font-bold text-lg">
              Jadwal Shift Terdekat
            </Text>
            <Text className="text-blue-600 text-xs font-bold mt-0.5">
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          <Text className="text-gray-500 text-xs font-medium">
            {daftarAnggota.length} Personel
          </Text>
        </View>

        {/* LOADING STATE */}
        {isFetching ? (
          <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
        ) : daftarAnggota.length === 0 ? (
          <View className="items-center justify-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <Ionicons name="people-outline" size={36} color="#cbd5e1" />
            <Text className="text-gray-400 text-sm mt-2">
              Belum ada personel masuk radar shift di site ini.
            </Text>
          </View>
        ) : (
          /* LIST ANGGOTA */
          daftarAnggota.map((item) => {
            const styles = getStatusStyles(item.status);

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handlePilihAnggota(item)}
                activeOpacity={0.7}
                className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 flex-row items-center"
              >
                {/* Avatar Initial */}
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${styles.initialBg}`}
                >
                  <Text className={`font-bold text-lg ${styles.text}`}>
                    {item.nama.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Info Anggota */}
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-base mb-1">
                    {item.nama}
                  </Text>

                  {/* Shift & Badge Site (Khusus mode Semua Site) */}
                  <View className="flex-row items-center mb-2 flex-wrap">
                    {selectedSiteId === "ALL" && item.siteName && (
                      <View className="bg-slate-100 px-2 py-0.5 rounded-md mr-1.5 mb-1 flex-row items-center">
                        <Ionicons
                          name="location-sharp"
                          size={10}
                          color="#475569"
                        />
                        <Text className="text-[10px] font-semibold text-slate-700 ml-0.5">
                          {item.siteName}
                        </Text>
                      </View>
                    )}
                    <Text className="text-blue-500 text-[10px] font-bold bg-blue-50 px-2 py-1 rounded mb-1">
                      {item.shift}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <View
                      className={`px-2 py-1 rounded-md flex-row items-center ${styles.bg}`}
                    >
                      <View
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${styles.dot}`}
                      />
                      <Text
                        className={`text-[10px] font-bold uppercase ${styles.text}`}
                      >
                        {item.status}
                      </Text>
                    </View>
                    {(item.status === "Hadir" ||
                      item.status === "Terlambat") &&
                      item.jamAbsen !== "--:--" && (
                        <Text className="text-gray-400 text-xs ml-2 flex-row items-center font-medium">
                          • Jam {item.jamAbsen}
                        </Text>
                      )}
                  </View>
                </View>

                {/* Tombol Aksi Kanan */}
                {(item.status === "Hadir" ||
                  item.status === "Terlambat") &&
                item.selfieUrl ? (
                  <View className="bg-emerald-50 w-10 h-10 rounded-full items-center justify-center">
                    <Ionicons name="image-outline" size={20} color="#10b981" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* --- MODAL PILIH LOKASI SITE (KHUSUS HEAD OFFICE) --- */}
      <Modal visible={showSiteModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl max-h-[80%] pb-8">
            <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  Pilih Lokasi Site
                </Text>
                <Text className="text-gray-500 text-xs">
                  Pantau kehadiran anggota per site atau seluruhnya
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowSiteModal(false);
                  setSearchSite("");
                }}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Input Pencarian Site */}
            <View className="px-5 py-3 border-b border-gray-100">
              <View className="flex-row items-center bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200">
                <Ionicons name="search" size={18} color="#94a3b8" />
                <TextInput
                  value={searchSite}
                  onChangeText={setSearchSite}
                  placeholder="Cari nama site atau kode..."
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-2 text-sm text-gray-900"
                />
                {searchSite.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchSite("")}>
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView className="px-5 py-3">
              {/* Opsi: Semua Site (Hanya tampil jika tidak sedang mencari atau cocok kata 'semua') */}
              {(!searchSite ||
                "semua site all".includes(searchSite.toLowerCase())) && (
                <TouchableOpacity
                  onPress={() =>
                    handleSelectSite({
                      id: "ALL",
                      name: "Semua Site (All Sites)",
                    })
                  }
                  className={`p-3.5 mb-2.5 rounded-2xl flex-row items-center justify-between ${
                    selectedSiteId === "ALL"
                      ? "bg-blue-50 border border-blue-300"
                      : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                        selectedSiteId === "ALL"
                          ? "bg-blue-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <Ionicons
                        name="globe"
                        size={20}
                        color={selectedSiteId === "ALL" ? "white" : "#475569"}
                      />
                    </View>
                    <View>
                      <Text
                        className={`font-bold text-sm ${
                          selectedSiteId === "ALL"
                            ? "text-blue-700"
                            : "text-gray-900"
                        }`}
                      >
                        Semua Site (All Sites)
                      </Text>
                      <Text className="text-gray-400 text-[10px]">
                        Monitoring seluruh site sekaligus
                      </Text>
                    </View>
                  </View>
                  {selectedSiteId === "ALL" && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#2563eb"
                    />
                  )}
                </TouchableOpacity>
              )}

              {/* List Masing-Masing Site */}
              {filteredSites.map((site) => {
                const isSelected = selectedSiteId === site.id;
                return (
                  <TouchableOpacity
                    key={site.id}
                    onPress={() => handleSelectSite(site)}
                    className={`p-3.5 mb-2.5 rounded-2xl flex-row items-center justify-between ${
                      isSelected
                        ? "bg-blue-50 border border-blue-300"
                        : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                          isSelected ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <Ionicons
                          name="business"
                          size={18}
                          color={isSelected ? "white" : "#475569"}
                        />
                      </View>
                      <View className="flex-1 mr-2">
                        <Text
                          className={`font-bold text-sm ${
                            isSelected ? "text-blue-700" : "text-gray-900"
                          }`}
                          numberOfLines={1}
                        >
                          {site.name}
                        </Text>
                        {site.code && (
                          <Text className="text-gray-400 text-[10px]">
                            Kode: {site.code}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#2563eb"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              {filteredSites.length === 0 && searchSite.length > 0 && (
                <View className="py-8 items-center">
                  <Text className="text-gray-400 text-sm">
                    Site tidak ditemukan.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DETAIL 1: WARNING BELUM ABSEN / TIDAK ADA SELFIE --- */}
      <Modal visible={showWarningModal} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-5">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="information-circle" size={40} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-2">
              Belum Ada Selfie
            </Text>
            <Text className="text-slate-500 text-center mb-6">
              Personel{" "}
              <Text className="font-bold text-slate-700">
                {selectedAnggota?.nama}
              </Text>{" "}
              belum melakukan Attendances Selfie atau sedang berhalangan (
              {selectedAnggota?.status}).
            </Text>
            <TouchableOpacity
              onPress={() => setShowWarningModal(false)}
              className="w-full bg-slate-900 py-4 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-base">Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DETAIL 2: LIHAT FOTO SELFIE --- */}
      <Modal visible={showSelfieModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl overflow-hidden pb-8">
            <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  Foto Kehadiran
                </Text>
                <Text className="text-gray-500 text-sm">
                  {selectedAnggota?.nama} • {selectedAnggota?.jamAbsen}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSelfieModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="p-5 items-center">
              {selectedAnggota?.selfieUrl ? (
                <Image
                  source={{ uri: selectedAnggota.selfieUrl }}
                  className="w-full h-80 rounded-2xl bg-gray-100"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-80 rounded-2xl bg-gray-100 items-center justify-center border border-gray-200 border-dashed">
                  <Ionicons
                    name="image-outline"
                    size={48}
                    color="#cbd5e1"
                    style={{ marginBottom: 8 }}
                  />
                  <Text className="text-gray-400 font-medium">
                    Gambar tidak ditemukan di database
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
