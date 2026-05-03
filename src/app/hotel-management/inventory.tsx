import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, StatusBar, Dimensions,
  Modal, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { inventoryService, DashboardStats } from '@/services/inventoryService';
import { hotelManagementService } from '@/services/hotelManagementService';

const { width } = Dimensions.get('window');

export default function InventoryManagementScreen() {
  const router = useRouter();
  const { hotelId, hotelName } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any | null>(null);
  const [hotelRooms, setHotelRooms] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [totalInventoryInput, setTotalInventoryInput] = useState('');
  const [basePriceInput, setBasePriceInput] = useState('');

  const loadData = useCallback(async () => {
    if (!hotelId) return;
    try {
      // Load hotel details to get room types
      const allHotels = await hotelManagementService.getMyHotels();
      const hotelData = allHotels.find(h => h.hotelId === hotelId);
      if (hotelData?.rooms) {
        setHotelRooms(hotelData.rooms);
      }

      // Load inventory for CURRENT selected date
      const startStr = currentDate.toISOString().split('T')[0];
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endStr = tomorrow.toISOString().split('T')[0];

      const res = await inventoryService.getInventory(hotelId as string, startStr, endStr);
      if (res?.data) {
        // Group by roomTypeId
        const mappedStats: any = {};
        res.data.forEach((inv: any) => {
          mappedStats[inv.roomTypeId] = {
            totalInventory: inv.totalInventory,
            totalBooked: inv.bookedCount,
            availableRooms: inv.totalInventory - inv.bookedCount,
            price: inv.priceAtDate,
            occupancyRate: inv.totalInventory > 0 ? ((inv.bookedCount / inv.totalInventory) * 100).toFixed(0) : 0
          };
        });
        setStats(mappedStats);
      } else {
        setStats({});
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hotelId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const formatPrice = (price: number) => price?.toLocaleString('vi-VN') || '0';

  const handleBulkCreate = async () => {
    if (!selectedRoomTypeId || !totalInventoryInput || !basePriceInput) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    const today = new Date();
    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);

    const data = {
      hotelId: hotelId as string,
      roomTypeId: selectedRoomTypeId,
      startDate: today.toISOString().split('T')[0],
      endDate: next30Days.toISOString().split('T')[0],
      totalInventory: parseInt(totalInventoryInput, 10),
      basePrice: parseInt(basePriceInput, 10)
    };

    try {
      const res = await inventoryService.bulkCreateInventory(data);
      if (res?.success) {
        Alert.alert('Thành công', 'Đã mở kho phòng cho 30 ngày tới!');
        setModalVisible(false);
        setLoading(true);
        loadData();
      } else {
        Alert.alert('Lỗi', res?.message || 'Có lỗi xảy ra');
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ');
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0A1628', '#1A365D']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Đang tải dữ liệu kho phòng...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0A1628', '#1A365D', '#1E40AF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.2)' }]} onPress={() => setModalVisible(true)}>
              <Feather name="plus" size={20} color="#60A5FA" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerGreeting}>{hotelName}</Text>
            <Text style={styles.headerTitle}>Quản lý kho phòng</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#60A5FA" />}
      >
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateBtn}>
            <Feather name="chevron-left" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateLabel}>Tình trạng phòng ngày</Text>
            <Text style={styles.dateValue}>
              {currentDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateBtn}>
            <Feather name="chevron-right" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        
        {!stats || Object.keys(stats).length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient colors={['#FFF7ED', '#FFEDD5']} style={styles.emptyIconWrap}>
              <Feather name="layers" size={40} color="#EA580C" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Chưa mở bán ngày này</Text>
            <Text style={styles.emptyDesc}>Bấm dấu + ở góc trên để mở bán phòng cho 30 ngày tới.</Text>
          </View>
        ) : (
          Object.entries(stats).map(([roomTypeId, rStats]: [string, any]) => {
            const roomInfo = hotelRooms.find(r => r.roomTypeId === roomTypeId);
            return (
              <View key={roomTypeId} style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <Text style={styles.roomName}>{roomInfo?.name || roomTypeId}</Text>
                  <View style={[styles.badge, rStats.availableRooms === 0 && { backgroundColor: '#FEF2F2' }]}>
                    <Text style={[styles.badgeText, rStats.availableRooms === 0 && { color: '#EF4444' }]}>
                      {rStats.availableRooms === 0 ? 'Hết phòng' : `Lấp đầy: ${rStats.occupancyRate}%`}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Tổng phòng</Text>
                    <Text style={styles.statValue}>{rStats.totalInventory}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Đã đặt</Text>
                    <Text style={[styles.statValue, { color: '#EF4444' }]}>{rStats.totalBooked}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Còn trống</Text>
                    <Text style={[styles.statValue, { color: '#10B981' }]}>{rStats.availableRooms}</Text>
                  </View>
                </View>

                <View style={styles.revenueRow}>
                  <Ionicons name="pricetag-outline" size={16} color="#3B82F6" />
                  <Text style={styles.revenueText}>
                    Giá bán hôm nay: <Text style={{ fontWeight: '700' }}>{formatPrice(rStats.price)}đ/đêm</Text>
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Mở Kho Phòng */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mở bán kho phòng</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Chọn loại phòng</Text>
              <View style={styles.pickerContainer}>
                {hotelRooms.map(room => (
                  <TouchableOpacity
                    key={room.roomTypeId}
                    style={[styles.pickerItem, selectedRoomTypeId === room.roomTypeId && styles.pickerItemActive]}
                    onPress={() => setSelectedRoomTypeId(room.roomTypeId)}
                  >
                    <Text style={[styles.pickerItemText, selectedRoomTypeId === room.roomTypeId && styles.pickerItemTextActive]}>
                      {room.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Số lượng phòng cung cấp (mỗi ngày)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 10"
                keyboardType="numeric"
                value={totalInventoryInput}
                onChangeText={setTotalInventoryInput}
              />

              <Text style={styles.inputLabel}>Giá bán cơ bản (VND)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 500000"
                keyboardType="numeric"
                value={basePriceInput}
                onChangeText={setBasePriceInput}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleBulkCreate}>
                <Text style={styles.submitBtnText}>Cập nhật cho 30 ngày tới</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#93C5FD', fontWeight: '500' },

  header: { paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  headerBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  headerInfo: { paddingHorizontal: 24, marginTop: 16 },
  headerGreeting: { fontSize: 14, color: '#93C5FD', fontWeight: '500', marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },

  content: { flex: 1, marginTop: -1, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#F1F5F9', paddingTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21 },

  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 16, padding: 12, marginBottom: 20, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  dateBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  dateDisplay: { alignItems: 'center' },
  dateLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  dateValue: { fontSize: 15, fontWeight: '700', color: '#1E293B' },

  roomCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  roomName: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1 },
  badge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'center' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '500', marginBottom: 4, textAlign: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#1E293B' },

  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 12 },
  revenueText: { fontSize: 13, color: '#16A34A' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },

  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B' },

  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  pickerItemActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  pickerItemText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  pickerItemTextActive: { color: '#3B82F6', fontWeight: '700' },

  submitBtn: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 32, marginBottom: 20 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
