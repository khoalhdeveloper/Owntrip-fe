import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { decodeJWT } from '@/utils/jwtUtils';
import { userService, UserProfile } from '@/services/userService';
import { tripService, Trip } from '@/services/tripService';
import { useConfirm } from '@/components/ConfirmProvider';
import axiosClient from '@/services/axiosClient';
import { ENDPOINTS } from '@/constants/api';
import { getTabScreenBottomPadding } from '@/utils/mobileLayout';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const GRID_PADDING = 20;
const CARD_WIDTH = (width - GRID_PADDING * 2 - CARD_GAP) / 2;
export default function StoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [marketplaceTrips, setMarketplaceTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [buying, setBuying] = useState(false);
  const [pointsTopupVisible, setPointsTopupVisible] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const { alert: showAlert, confirm: showConfirm, show: customShow } = useConfirm();
  // Sử dụng 'points' làm 'coins' trong Store vì balance thường là tiền mặt/ví
  const coinBalance = profile?.points ?? 0;

  const loadProfile = useCallback(async () => {
    try {
      let userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('token');

      if (!userId && token) {
        const decoded = decodeJWT(token);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
          await AsyncStorage.setItem('userId', userId as string);
        }
      }

      if (userId) {
        const [p, localInv] = await Promise.all([
          userService.getMyProfile(userId as string),
          userService.getLocalInventory(userId as string),
        ]);

        if (p) {
          setProfile({ ...p, inventory: localInv });
        }
      }
    } catch {
      setProfile(null);
    }
  }, []);

  const loadMarketplaceTrips = useCallback(async () => {
    setLoadingTrips(true);
    try {
      const list = await tripService.getMarketplaceTrips(1, 6);
      setMarketplaceTrips(list);
    } catch {
      setMarketplaceTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadMarketplaceTrips();
    }, [loadProfile, loadMarketplaceTrips]),
  );

  const getDayCount = (trip: Trip) => {
    if (trip.totalDays) return trip.totalDays;
    if (trip.startDate && trip.endDate) {
      const diff = Math.round(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return diff > 0 ? diff : 1;
    }
    return 1;
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cửa hàng</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getTabScreenBottomPadding(insets.bottom) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Coin Balance Card */}
          <View style={styles.coinCard}>
            <View style={styles.coinRow}>
              <View style={styles.coinIconWrap}>
                <MaterialIcons name="stars" size={28} color="#FFB300" />
              </View>
              <View style={styles.coinTextWrap}>
                <Text style={styles.coinLabel}>Xu của tôi (Điểm)</Text>
                {profile ? (
                  <Text style={styles.coinValue}>{coinBalance.toLocaleString()}</Text>
                ) : (
                  <ActivityIndicator
                    size="small"
                    color="#0D9488"
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  />
                )}
              </View>
            </View>
            <View style={styles.coinButtons}>
              <TouchableOpacity
                style={styles.topUpBtnWrap}
                activeOpacity={0.85}
                onPress={() => {
                  setPointsTopupVisible(true);
                  setPointsAmount('');
                }}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.topUpBtn}
                >
                  <Text style={styles.topUpBtnText}>Nạp điểm</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.historyBtn}
                activeOpacity={0.7}
                onPress={() => router.push('/achievement')}
              >
                <Text style={styles.historyBtnText}>Thành tựu</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar & Frame Shop Promo */}
          <TouchableOpacity 
            style={styles.avatarShopPromo}
            activeOpacity={0.9}
            onPress={() => router.push('/avatar-shop')}
          >
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarShopPromoGradient}
            >
              <View style={styles.avatarShopPromoInfo}>
                <Text style={styles.avatarShopPromoTitle}>Avatar & Khung hình</Text>
                <Text style={styles.avatarShopPromoSub}>Làm mới diện mạo của bạn ngay</Text>
                <View style={styles.avatarShopPromoBadge}>
                  <Text style={styles.avatarShopPromoBadgeText}>MỚI</Text>
                </View>
              </View>
              <View style={styles.avatarShopPromoIcon}>
                <Feather name="user" size={32} color="#FFF" />

              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Plan đang bán của Creator */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Plan đang bán</Text>
              <TouchableOpacity onPress={() => router.push('/marketplace' as any)}>
                <Text style={styles.viewAll}>Xem tất cả &gt;</Text>
              </TouchableOpacity>
            </View>
            {loadingTrips ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : marketplaceTrips.length === 0 ? (
              <View style={styles.emptyPackages}>
                <Feather name="map" size={32} color="#CBD5E1" />
                <Text style={styles.emptyPackagesText}>Chưa có plan nào đang bán</Text>
              </View>
            ) : (
              <View style={styles.tripGrid}>
                {marketplaceTrips.slice(0, 6).map((trip) => {
                  const days = getDayCount(trip);
                  const coverImage = trip.provinceImage || trip.accommodation?.hotelImage;
                  return (
                    <TouchableOpacity
                      key={trip._id}
                      style={styles.tripCard}
                      activeOpacity={0.88}
                      onPress={() => router.push(`/trip/${trip._id}` as any)}
                    >
                      {/* Ảnh bìa */}
                      <View style={styles.tripImageWrap}>
                        {coverImage ? (
                          <Image source={{ uri: coverImage }} style={styles.tripImage} />
                        ) : (
                          <View style={[styles.tripImage, styles.tripImagePlaceholder]}>
                            <Feather name="map-pin" size={28} color="#94A3B8" />
                          </View>
                        )}
                        {/* Badge số ngày */}
                        <View style={styles.tripDayBadge}>
                          <Text style={styles.tripDayBadgeText}>{days} NGÀY</Text>
                        </View>
                      </View>

                      {/* Thông tin */}
                      <View style={styles.tripCardBody}>
                        <Text style={styles.tripCardTitle} numberOfLines={1}>
                          {trip.title}
                        </Text>
                        <View style={styles.tripLocationRow}>
                          <Feather name="map-pin" size={11} color="#64748B" />
                          <Text style={styles.tripLocationText} numberOfLines={1}>
                            {trip.destination || trip.province}
                          </Text>
                        </View>
                        <View style={styles.tripBottomRow}>
                          <Text style={styles.tripPrice}>
                            {(trip.price ?? 0).toLocaleString()}đ
                          </Text>
                          <View style={styles.tripRatingRow}>
                            <Feather name="star" size={11} color="#F59E0B" />
                            <Text style={styles.tripRatingText}>
                              {trip.averageRating?.toFixed(1) ?? '5.0'} ({trip.soldCount ?? 0} đã bán)
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>


          {/* Recent Activity */}
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
            </View>

            {!profile?.inventory || profile.inventory.length === 0 ? (
              <View style={styles.activityCard}>
                <View
                  style={[styles.activityIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                >
                  <Feather name="info" size={20} color="#3B82F6" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>Chưa có giao dịch gần đây</Text>
                  <Text style={styles.activitySubtitle}>Bắt đầu khám phá cửa hàng ngay!</Text>
                </View>
              </View>
            ) : (
              profile.inventory
                .slice(-3)
                .reverse()
                .map((item, idx) => (
                  <View key={idx} style={[styles.activityCard, { marginBottom: 8 }]}>
                    <View
                      style={[
                        styles.activityIconWrap,
                        { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                      ]}
                    >
                      <Feather name="shopping-bag" size={20} color="#EF4444" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>Đã mua {item.name}</Text>
                      <Text style={styles.activitySubtitle}>
                        {new Date(item.purchasedAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                    <Text style={[styles.activityAmount, { color: '#EF4444' }]}>-{item.price}</Text>
                  </View>
                ))
            )}
          </View>

        </ScrollView>



        {/* Modal Nạp Điểm bằng PayOS */}
        <Modal
          visible={pointsTopupVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPointsTopupVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nạp điểm</Text>
                <TouchableOpacity onPress={() => setPointsTopupVisible(false)}>
                  <Feather name="x" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                Nhập số điểm bạn muốn nạp (1 điểm = 1,000 VND)
              </Text>
              <TextInput
                style={styles.pointsInput}
                keyboardType="number-pad"
                placeholder="Ví dụ: 50"
                value={pointsAmount}
                onChangeText={setPointsAmount}
              />
              <TouchableOpacity
                style={styles.confirmTopUpBtn}
                onPress={async () => {
                  const pts = parseInt(pointsAmount, 10);
                  if (isNaN(pts) || pts <= 0) {
                    showAlert('Lỗi', 'Vui lòng nhập số điểm hợp lệ', 'error');
                    return;
                  }
                  
                  const amountVND = pts * 1000;
                  setPointsTopupVisible(false);
                  
                  try {
                    const bookingId = `topup_points_${Date.now()}`;
                    const res = await axiosClient.post<any, any>(ENDPOINTS.PAYMENT.CREATE_PAYMENT_LINK, {
                      bookingId,
                      amount: amountVND,
                      description: `Nap ${pts} diem`,
                    });
                    
                    if (res.success && res.data?.checkoutUrl) {
                      await WebBrowser.openBrowserAsync(res.data.checkoutUrl);
                      
                      // Bắt đầu polling
                      const intervalId = setInterval(async () => {
                        try {
                          const statusRes = await axiosClient.get<any, any>(ENDPOINTS.PAYMENT.STATUS(bookingId));
                          if (statusRes.success && statusRes.data?.paymentStatus === 'paid') {
                            clearInterval(intervalId);
                            setPollingIntervalId(null);
                            WebBrowser.dismissBrowser();
                            showAlert('Thành công', `Nạp thành công ${pts} điểm!`, 'success');
                            loadProfile();
                          }
                        } catch (e) {
                          // Ignore polling errors
                        }
                      }, 3000);
                      
                      setPollingIntervalId(intervalId);
                      
                      // Dọn dẹp interval sau 5 phút nếu không thanh toán
                      setTimeout(() => {
                        clearInterval(intervalId);
                        setPollingIntervalId(null);
                      }, 5 * 60 * 1000);
                    } else {
                      showAlert('Lỗi', 'Không thể tạo link thanh toán', 'error');
                    }
                  } catch (e: any) {
                    showAlert('Lỗi', e.message || 'Có lỗi xảy ra', 'error');
                  }
                }}
              >
                <Text style={styles.confirmTopUpBtnText}>Tiếp tục thanh toán</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: GRID_PADDING, paddingBottom: 16 },

  coinCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  coinRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  coinIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  coinTextWrap: { flex: 1 },
  coinLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  coinValue: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  coinButtons: { flexDirection: 'row', gap: 12 },
  topUpBtnWrap: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  topUpBtn: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  topUpBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  historyBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  historyBtnText: { color: '#0369A1', fontSize: 15, fontWeight: '700' },

  section: { marginBottom: 28 },
  loadingRow: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 0,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  viewAll: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#F1F5F9' },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
    marginBottom: 2,
  },
  productArtist: { fontSize: 12, color: '#64748B', marginBottom: 10 },
  priceBtn: { borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  priceBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },


  activitySection: { marginTop: 8, marginBottom: 28 },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(22, 163, 74, 0.4)',
  },
  activityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  activitySubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  activityAmount: { fontSize: 16, fontWeight: '800', color: '#16A34A' },

  avatarShopPromo: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  avatarShopPromoGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarShopPromoInfo: {
    flex: 1,
  },
  avatarShopPromoTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  avatarShopPromoSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 12,
  },
  avatarShopPromoBadge: {
    backgroundColor: '#FACC15',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  avatarShopPromoBadgeText: {
    color: '#1E293B',
    fontSize: 10,
    fontWeight: '900',
  },
  avatarShopPromoIcon: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  pointsInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
  },
  confirmTopUpBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmTopUpBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Creator Package styles
  packageList: { gap: 14 },
  packageCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  packageCardFeatured: {
    borderColor: '#7C3AED',
    borderWidth: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.15,
    elevation: 6,
  },
  packageBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  packageBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  packageCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  packageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Trip grid styles
  tripGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  tripCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  tripImageWrap: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  tripImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  tripImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripDayBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tripDayBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  tripCardBody: { padding: 10 },
  tripCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 3 },
  tripLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  tripLocationText: { fontSize: 11, color: '#64748B', flex: 1 },
  tripBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripPrice: { fontSize: 13, fontWeight: '800', color: '#10B981' },
  tripRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tripRatingText: { fontSize: 10, color: '#64748B' },

  emptyPackages: { alignItems: 'center' as const, paddingVertical: 32, gap: 10 },
  emptyPackagesText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' as const },
});
