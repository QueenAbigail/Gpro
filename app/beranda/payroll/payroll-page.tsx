import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase"; // Pastikan path supabase ini sesuai di project lu

export default function PayrollPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<any[]>([]);

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("payrolls")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayrollData(data || []);
    } catch (error) {
      console.error("Error fetching payroll:", error);
      Alert.alert("Gagal", "Tidak dapat mengambil data slip gaji.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleOpenPdf = (pdfUrl: string | null) => {
    if (pdfUrl) {
      Linking.openURL(pdfUrl);
    } else {
      Alert.alert("Info", "File slip gaji tidak tersedia.");
    }
  };

  const currentPayroll = payrollData[0];
  const payrollHistory = payrollData.slice(1);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-sky-50 items-center justify-center" edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
      {/* Custom Header */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100"
        >
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Slip Gaji</Text>
        <View className="w-10" /> 
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        
        {/* Section Bulan Ini (Tetap Tampil Walau Kosong) */}
        <View className="mb-8">
          <Text className="text-gray-500 text-sm font-semibold mb-3 ml-1 uppercase tracking-wider">
            Bulan Ini
          </Text>
          
          <View className="bg-blue-600 rounded-3xl p-6 shadow-lg shadow-blue-200">
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="text-blue-100 text-sm font-medium mb-1">Periode</Text>
                <Text className="text-white text-2xl font-extrabold">
                  {currentPayroll ? currentPayroll.month : "Belum Ada Slip Gaji"}
                </Text>
              </View>
              <View className="bg-white/20 p-2.5 rounded-2xl">
                <Ionicons name="wallet-outline" size={28} color="white" />
              </View>
            </View>

            <View className="flex-row justify-between items-center bg-blue-700/50 p-4 rounded-2xl mb-4">
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={16} color="#bfdbfe" />
                <Text className="text-blue-100 text-xs ml-2">
                  Tanggal Terbit: {currentPayroll ? formatDate(currentPayroll.publish_date) : "-"}
                </Text>
              </View>
              <View className={currentPayroll ? "bg-emerald-400/20 px-2 py-1 rounded-md" : "bg-amber-400/20 px-2 py-1 rounded-md"}>
                <Text className={currentPayroll ? "text-emerald-300 text-[10px] font-bold uppercase tracking-wider" : "text-amber-300 text-[10px] font-bold uppercase tracking-wider"}>
                  {currentPayroll ? (currentPayroll.status || "Diterbitkan") : "Belum Terbit"}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={currentPayroll ? 0.8 : 1}
              onPress={() => {
                if (currentPayroll) {
                  handleOpenPdf(currentPayroll.pdf_url);
                } else {
                  Alert.alert("Info", "Slip gaji bulan ini belum diterbitkan oleh HR.");
                }
              }}
              className={`py-3.5 rounded-xl flex-row items-center justify-center shadow-sm ${
                currentPayroll ? "bg-white" : "bg-white/60"
              }`}
            >
              <Ionicons 
                name="document-text" 
                size={18} 
                color={currentPayroll ? "#2563eb" : "#64748b"} 
              />
              <Text className={`font-bold text-sm ml-2 ${currentPayroll ? "text-blue-600" : "text-gray-500"}`}>
                {currentPayroll ? "Lihat Slip Gaji" : "Belum Tersedia"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Riwayat */}
        {payrollHistory.length > 0 && (
          <View className="mb-10">
            <Text className="text-gray-500 text-sm font-semibold mb-3 ml-1 uppercase tracking-wider">
              Riwayat Sebelumnya
            </Text>
            
            <View className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100">
              {payrollHistory.map((item, index) => (
                <TouchableOpacity 
                  key={item.id}
                  onPress={() => handleOpenPdf(item.pdf_url)}
                  className={`flex-row items-center justify-between p-4 ${
                    index !== payrollHistory.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-sky-50 rounded-2xl items-center justify-center mr-4">
                      <Ionicons name="receipt-outline" size={22} color="#0284c7" />
                    </View>
                    <View>
                      <Text className="text-gray-900 font-bold text-base mb-0.5">{item.month}</Text>
                      <Text className="text-gray-400 text-xs">Tgl: {formatDate(item.publish_date)}</Text>
                    </View>
                  </View>

                  <View className="w-8 h-8 bg-gray-50 rounded-full items-center justify-center">
                    <Ionicons name="download-outline" size={16} color="#64748b" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}