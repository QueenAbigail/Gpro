import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AttendanceNoPhotoModal,
  AttendancePhotoModal,
} from "../../../components/AttendancePhotoModal";
import { supabase } from "../../../lib/supabase";

type AttendanceSummary = {
  hadir: number;
  izin: number;
  belumAbsen: number;
};

const summarizeAttendance = (items: any[]): AttendanceSummary => {
  let hadir = 0;
  let belumAbsen = 0;
  let izin = 0;

  items.forEach((item) => {
    if (item.status === "Hadir" || item.status === "Terlambat") {
      hadir += 1;
    } else if (item.status === "Belum Absen") {
      belumAbsen += 1;
    } else {
      izin += 1;
    }
  });

  return { hadir, izin, belumAbsen };
};

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
  const [allAnggotaHO, setAllAnggotaHO] = useState<any[]>([]);
  const [hasLoadedAllHO, setHasLoadedAllHO] = useState(false);
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

        // 1. Query User: jika Head Office, tarik seluruh site sekaligus agar rekap modal langsung tersedia
        let usersQuery = supabase
          .from("users")
          .select("id, name, siteId")
          .neq("id", authData.user.id);

        if (!isHO) {
          usersQuery = usersQuery.eq("siteId", targetSiteId);
        }

        const { data: usersData, error: usersError } = await usersQuery;
        if (usersError) throw usersError;

        if (!usersData || usersData.length === 0) {
          if (isHO) {
            setAllAnggotaHO([]);
            setHasLoadedAllHO(true);
          }
          setDaftarAnggota([]);
          return;
        }

        const userIds = usersData.map((u) => u.id);

        // 2. Tarik Data Pendukung secara Paralel
        let assignmentsQuery = supabase
          .from("employee_pattern_assignments")
          .select("userId, startDate");
        let attendancesQuery = supabase
          .from("attendances")
          .select("userId, actualCheckIn, actualCheckOut, selfieCheckIn")
          .eq("date", todayDateOnly);
        let leavesQuery = supabase
          .from("leaves")
          .select("userId, leaveType, id")
          .lte("startDate", today.toISOString())
          .gte("endDate", today.toISOString());

        if (!isHO) {
          assignmentsQuery = assignmentsQuery.in("userId", userIds);
          attendancesQuery = attendancesQuery.in("userId", userIds);
          leavesQuery = leavesQuery.in("userId", userIds);
        }

        const [assignmentsRes, shiftsRes, attendancesRes, leavesRes, bkoRes] =
          await Promise.all([
            assignmentsQuery,
            supabase.from("shifts").select("*"),
            attendancesQuery,
            leavesQuery,
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
        const processedData: any[] = [];

        usersData.forEach((user: any) => {
          // Ambil assignment yang aktif
          const assignment = assignmentsData.find((a) => a.userId === user.id);

          let isDayOff = false;
          let shiftHariIni: any = null;
          let shiftOrder = 4;

          if (assignment?.startDate) {
            const startDate = new Date(assignment.startDate);
            startDate.setHours(0, 0, 0, 0);

            const diffTime = today.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
              // Pola per 8 hari (2 Pagi, 2 Sore, 2 Malam, 2 Off)
              const cycleDay = diffDays % 8;

              if (cycleDay === 0 || cycleDay === 1) {
                shiftOrder = 1;
                shiftHariIni = shiftsData.find((s) =>
                  s.name?.toLowerCase().includes("pagi"),
                );
              } else if (cycleDay === 2 || cycleDay === 3) {
                shiftOrder = 2;
                shiftHariIni = shiftsData.find((s) =>
                  s.name?.toLowerCase().includes("sore"),
                );
              } else if (cycleDay === 4 || cycleDay === 5) {
                shiftOrder = 3;
                shiftHariIni = shiftsData.find((s) =>
                  s.name?.toLowerCase().includes("malam"),
                );
              } else {
                isDayOff = true;
              }
            }
          }

          const hasValidShift = Boolean(
            shiftHariIni && shiftHariIni.startTime && shiftHariIni.endTime,
          );

          const leaveMatch = leavesData.find((l) => l.userId === user.id);
          const absenMatch = attendancesData.find((a) => a.userId === user.id);
          const hasAttendanceOrLeave = Boolean(
            leaveMatch || (absenMatch && absenMatch.actualCheckIn),
          );

          // Opsi B: Jika tidak punya jadwal aktif hari ini (tanpa schedule / Day Off),
          // tetap tampilkan jika yang bersangkutan absen masuk atau izin/sakit/BKO hari ini.
          if (!hasValidShift && !hasAttendanceOrLeave) {
            return;
          }

          let shiftStartDate: Date | null = null;
          if (hasValidShift) {
            const [shiftStartHour, shiftStartMinute] =
              shiftHariIni.startTime.split(":");
            shiftStartDate = new Date(today);
            shiftStartDate.setHours(
              parseInt(shiftStartHour, 10),
              parseInt(shiftStartMinute, 10),
              0,
              0,
            );
          }

          // --- TENTUKAN STATUS ---
          let status = "Belum Absen";
          let jamAbsen = "--:--";
          let selfieUrl = null;

          // Cek Sakit/Izin/BKO dulu
          if (leaveMatch) {
            if (lakuBKO.includes(leaveMatch.id)) {
              status = "BKO";
            } else {
              status = leaveMatch.leaveType;
            }
          } else if (absenMatch && absenMatch.actualCheckIn) {
            const checkInTime = new Date(absenMatch.actualCheckIn);
            jamAbsen = formatTime(absenMatch.actualCheckIn);
            selfieUrl = absenMatch.selfieCheckIn;

            if (shiftStartDate) {
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
            } else {
              status = "Hadir";
            }
          }

          const shiftLabel = hasValidShift
            ? `${shiftHariIni.name} (${shiftHariIni.startTime.substring(0, 5)} - ${shiftHariIni.endTime.substring(0, 5)})`
            : isDayOff
              ? absenMatch?.actualCheckIn
                ? "Day Off (Masuk)"
                : "Day Off"
              : null;

          processedData.push({
            id: user.id,
            nama: user.name,
            siteId: user.siteId,
            siteName: sitesMap.get(user.siteId) || "Head Office",
            shift: shiftLabel,
            shiftOrder,
            status: status,
            jamAbsen: jamAbsen,
            selfieUrl: selfieUrl,
          });
        });

        processedData.sort((a, b) => {
          if (a.shiftOrder !== b.shiftOrder) {
            return a.shiftOrder - b.shiftOrder;
          }
          return (a.nama || "").localeCompare(b.nama || "");
        });

        if (isHO) {
          setAllAnggotaHO(processedData);
          setHasLoadedAllHO(true);
          setDaftarAnggota(
            targetSiteId === "ALL"
              ? processedData
              : processedData.filter((item) => item.siteId === targetSiteId),
          );
        } else {
          setDaftarAnggota(processedData);
        }
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

    if (isHOUser && hasLoadedAllHO) {
      setDaftarAnggota(
        site.id === "ALL"
          ? allAnggotaHO
          : allAnggotaHO.filter((item) => item.siteId === site.id),
      );
      return;
    }

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

  const currentSummary = summarizeAttendance(daftarAnggota);
  const allSitesSummary = summarizeAttendance(allAnggotaHO);

  const siteSummaryMap = new Map<string, AttendanceSummary>();
  if (isHOUser) {
    const groupedBySite = new Map<string, any[]>();
    allAnggotaHO.forEach((item) => {
      const existing = groupedBySite.get(item.siteId) || [];
      existing.push(item);
      groupedBySite.set(item.siteId, existing);
    });
    sitesList.forEach((site) => {
      siteSummaryMap.set(
        site.id,
        summarizeAttendance(groupedBySite.get(site.id) || []),
      );
    });
  }

  const renderSummaryStack = (summary: AttendanceSummary) => (
    <View className="items-end">
      <Text className="text-emerald-600 text-xs font-bold">
        {summary.hadir} Hadir
      </Text>
      {summary.izin > 0 && (
        <Text className="text-amber-600 text-[11px] font-semibold mt-0.5">
          {summary.izin} Izin
        </Text>
      )}
      {summary.belumAbsen > 0 && (
        <Text className="text-slate-500 text-[11px] font-semibold mt-0.5">
          {summary.belumAbsen} Belum Absen
        </Text>
      )}
    </View>
  );

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
              {isHOUser
                ? "Monitoring Pusat (Head Office)"
                : "Monitoring Harian"}
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
          <View className="flex-1 mr-3">
            <Text className="text-gray-800 font-bold text-lg">
              Jadwal & Kehadiran Hari Ini
            </Text>
            <Text className="text-blue-600 text-xs font-bold mt-0.5">
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          {renderSummaryStack(currentSummary)}
        </View>

        {/* LOADING STATE */}
        {isFetching ? (
          <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
        ) : daftarAnggota.length === 0 ? (
          <View className="items-center justify-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <Ionicons name="people-outline" size={36} color="#cbd5e1" />
            <Text className="text-gray-400 text-sm mt-2 text-center px-4">
              Belum ada personel terjadwal atau absen hari ini di site ini.
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
                  {Boolean(
                    (selectedSiteId === "ALL" && item.siteName) || item.shift,
                  ) && (
                    <View className="flex-row items-center mb-2 flex-wrap">
                      {Boolean(selectedSiteId === "ALL" && item.siteName) && (
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
                      {Boolean(item.shift) && (
                        <Text className="text-blue-500 text-[10px] font-bold bg-blue-50 px-2 py-1 rounded mb-1">
                          {item.shift}
                        </Text>
                      )}
                    </View>
                  )}

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
                    {(item.status === "Hadir" || item.status === "Terlambat") &&
                      item.jamAbsen !== "--:--" && (
                        <Text className="text-gray-400 text-xs ml-2 flex-row items-center font-medium">
                          • Jam {item.jamAbsen}
                        </Text>
                      )}
                  </View>
                </View>

                {/* Tombol Aksi Kanan */}
                {(item.status === "Hadir" || item.status === "Terlambat") &&
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
                  <View className="flex-row items-center flex-1 mr-3">
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                        selectedSiteId === "ALL" ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <Ionicons
                        name="globe"
                        size={20}
                        color={selectedSiteId === "ALL" ? "white" : "#475569"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-bold text-sm ${
                          selectedSiteId === "ALL"
                            ? "text-blue-700"
                            : "text-gray-900"
                        }`}
                        numberOfLines={1}
                      >
                        Semua Site (All Sites)
                      </Text>
                      <Text className="text-gray-400 text-[10px]">
                        Monitoring seluruh site sekaligus
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    {renderSummaryStack(allSitesSummary)}
                    {selectedSiteId === "ALL" && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#2563eb"
                        style={{ marginLeft: 10 }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* List Masing-Masing Site */}
              {filteredSites.map((site) => {
                const isSelected = selectedSiteId === site.id;
                const siteSummary = siteSummaryMap.get(site.id) || {
                  hadir: 0,
                  izin: 0,
                  belumAbsen: 0,
                };
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
                    <View className="flex-row items-center flex-1 mr-3">
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
                      <View className="flex-1">
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
                    <View className="flex-row items-center">
                      {renderSummaryStack(siteSummary)}
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#2563eb"
                          style={{ marginLeft: 10 }}
                        />
                      )}
                    </View>
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

      {/* --- REUSABLE MODAL 1: PERINGATAN BELUM ADA FOTO --- */}
      <AttendanceNoPhotoModal
        visible={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="Belum Ada Bukti Kehadiran"
      />

      {/* --- REUSABLE MODAL 2: LIHAT FOTO SELFIE --- */}
      <AttendancePhotoModal
        visible={showSelfieModal}
        onClose={() => setShowSelfieModal(false)}
        title="Foto Kehadiran"
        subtitle={
          selectedAnggota
            ? `${selectedAnggota.nama} • Jam ${selectedAnggota.jamAbsen} (${selectedAnggota.status || "Hadir"})`
            : undefined
        }
        photoUrl={selectedAnggota?.selfieUrl}
      />
    </View>
  );
}
