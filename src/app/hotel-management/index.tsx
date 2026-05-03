import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, RefreshControl, StatusBar, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hotelManagementService, IHotelManage } from '@/services/hotelManagementService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export default function HotelManagementScreen() {
  const router = useRouter();
  const [hotels, setHotels] = useState<IHotelManage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHotels = useCallback(async () => {
    try {
      const data = await hotelManagementService.getMyHotels();
      setHotels(data);
    } catch (error) {
      console.error('Error loading hotels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadHotels(); }, [loadHotels]));

  const formatPrice = (price: number) => price?.toLocaleString('vi-VN') || '0';

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['token', 'userId']);
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0A1628', '#1A365D']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Gradient Header */}
      <LinearGradient colors={['#0A1628', '#1A365D', '#1E40AF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <View />
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.2)' }]} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#F87171" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerGreeting}>Xin chào, Host 👋</Text>
            <Text style={styles.headerTitle}>Quản lý khách sạn</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <LinearGradient colors={['rgba(96,165,250,0.2)', 'rgba(96,165,250,0.05)']} style={styles.statGradient}>
                <View style={styles.statIconWrap}>
                  <FontAwesome5 name="hotel" size={16} color="#60A5FA" />
                </View>
                <Text style={styles.statValue}>{hotels.length}</Text>
                <Text style={styles.statLabel}>Khách sạn</Text>
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient colors={['rgba(52,211,153,0.2)', 'rgba(52,211,153,0.05)']} style={styles.statGradient}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
                  <Feather name="layers" size={16} color="#34D399" />
                </View>
                <Text style={styles.statValue}>{hotels.reduce((s, h) => s + (h.rooms?.length || 0), 0)}</Text>
                <Text style={styles.statLabel}>Loại phòng</Text>
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient colors={['rgba(251,191,36,0.2)', 'rgba(251,191,36,0.05)']} style={styles.statGradient}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
                  <Feather name="star" size={16} color="#FBBF24" />
                </View>
                <Text style={styles.statValue}>
                  {hotels.length > 0 ? (hotels.reduce((s, h) => s + (h.reviewSummary?.score || 0), 0) / hotels.length).toFixed(1) : '—'}
                </Text>
                <Text style={styles.statLabel}>Đánh giá</Text>
              </LinearGradient>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHotels(); }} tintColor="#60A5FA" />}
      >
        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Khách sạn của tôi</Text>
          <Text style={styles.sectionCount}>{hotels.length} kết quả</Text>
        </View>

        {hotels.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient colors={['#EBF8FF', '#DBEAFE']} style={styles.emptyIconWrap}>
              <FontAwesome5 name="hotel" size={40} color="#3B82F6" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Chưa có khách sạn nào</Text>
            <Text style={styles.emptyDesc}>Liên hệ Admin để được thêm khách sạn vào tài khoản của bạn</Text>
          </View>
        ) : (
          hotels.map((hotel, index) => (
            <TouchableOpacity
              key={hotel.hotelId || index}
              style={styles.hotelCard}
              onPress={() => router.push(`/hotel-management/edit?hotelId=${hotel.hotelId}`)}
              activeOpacity={0.85}
            >
              {/* Image with Overlay */}
              <View style={styles.cardImageWrap}>
                <Image
                  source={{ uri: hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600' }}
                  style={styles.cardImage}
                />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.cardImageOverlay} />

                {/* Star Badge */}
                <View style={styles.starBadge}>
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={styles.starText}>{hotel.starRating}</Text>
                </View>

                {/* Bottom overlay info */}
                <View style={styles.cardOverlayInfo}>
                  <Text style={styles.cardOverlayName} numberOfLines={1}>{hotel.name}</Text>
                  <View style={styles.cardOverlayMeta}>
                    <Feather name="map-pin" size={11} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.cardOverlayAddress} numberOfLines={1}>
                      {hotel.address?.city || hotel.address?.fullAddress || 'Chưa có địa chỉ'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                {/* Quick Stats */}
                <View style={styles.cardQuickStats}>
                  <View style={styles.quickStat}>
                    <View style={[styles.quickStatIcon, { backgroundColor: '#EBF8FF' }]}>
                      <Feather name="layers" size={13} color="#3B82F6" />
                    </View>
                    <Text style={styles.quickStatText}>{hotel.rooms?.length || 0} phòng</Text>
                  </View>
                  <View style={styles.quickStatDivider} />
                  <View style={styles.quickStat}>
                    <View style={[styles.quickStatIcon, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="star" size={13} color="#D97706" />
                    </View>
                    <Text style={styles.quickStatText}>
                      {hotel.reviewSummary?.score || 0}/10 ({hotel.reviewSummary?.count || 0})
                    </Text>
                  </View>
                  {hotel.rooms?.[0] && (
                    <>
                      <View style={styles.quickStatDivider} />
                      <View style={styles.quickStat}>
                        <View style={[styles.quickStatIcon, { backgroundColor: '#F0FDF4' }]}>
                          <FontAwesome5 name="money-bill-wave" size={11} color="#16A34A" />
                        </View>
                        <Text style={styles.quickStatText}>
                          {formatPrice(Math.min(...hotel.rooms.map(r => r.basePrice || r.price || 0)))}đ
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Tags */}
                {hotel.tags && hotel.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {hotel.tags.slice(0, 3).map((tag, i) => (
                      <View key={i} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
                    ))}
                  </View>
                )}

                {/* Action Row */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => router.push(`/hotel-management/edit?hotelId=${hotel.hotelId}`)}>
                    <Feather name="edit-3" size={14} color="#3B82F6" />
                    <Text style={styles.editButtonText}>Chỉnh sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editButton, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]} 
                    onPress={() => router.push(`/hotel-management/bookings?hotelId=${hotel.hotelId}&hotelName=${encodeURIComponent(hotel.name)}`)}
                  >
                    <Feather name="calendar" size={14} color="#16A34A" />
                    <Text style={[styles.editButtonText, { color: '#16A34A' }]}>Đặt phòng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editButton, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]} 
                    onPress={() => router.push(`/hotel-management/inventory?hotelId=${hotel.hotelId}&hotelName=${encodeURIComponent(hotel.name)}`)}
                  >
                    <Feather name="layers" size={14} color="#EA580C" />
                    <Text style={[styles.editButtonText, { color: '#EA580C' }]}>Kho phòng</Text>
                  </TouchableOpacity>
                  <View style={styles.cardArrow}>
                    <Feather name="chevron-right" size={18} color="#CBD5E0" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#93C5FD', fontWeight: '500' },

  // Header
  header: { paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  headerBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  headerInfo: { paddingHorizontal: 24, marginTop: 16, marginBottom: 20 },
  headerGreeting: { fontSize: 14, color: '#93C5FD', fontWeight: '500', marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  statGradient: { padding: 14, alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(96,165,250,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#93C5FD', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Content
  content: { flex: 1, marginTop: -1, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#F1F5F9', paddingTop: 20, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  sectionCount: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  emptyBtn: { borderRadius: 16, overflow: 'hidden' },
  emptyBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16 },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Hotel Card
  hotelCard: { backgroundColor: '#FFF', borderRadius: 24, marginBottom: 18, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6, overflow: 'hidden' },
  cardImageWrap: { height: 190, position: 'relative' },
  cardImage: { width: '100%', height: '100%', backgroundColor: '#E2E8F0' },
  cardImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  starBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, backdropFilter: 'blur(10)' },
  starText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  cardOverlayInfo: { position: 'absolute', bottom: 14, left: 16, right: 16 },
  cardOverlayName: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  cardOverlayMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardOverlayAddress: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  // Card Body
  cardBody: { padding: 16 },
  cardQuickStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, marginBottom: 12 },
  quickStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickStatIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  quickStatText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  quickStatDivider: { width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 4 },

  tagsRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  tag: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#DBEAFE' },
  tagText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },

  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  editButtonText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  cardArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },

  // FAB
  fab: { position: 'absolute', bottom: 28, right: 24, borderRadius: 18, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 },
  fabGradient: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});
