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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '@/utils/jwtUtils';
import { userService, UserProfile } from '@/services/userService';
import { souvenirsService, Souvenir } from '@/services/souvenirsService';
import { decorationsService, Decoration } from '@/services/decorationsService';
import { useConfirm } from '@/components/ConfirmProvider';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const GRID_PADDING = 20;
const CARD_WIDTH = (width - GRID_PADDING * 2 - CARD_GAP) / 2;
const DECORATION_CARD_WIDTH = 140;
const DECORATION_SCROLL_PADDING_RIGHT = width - GRID_PADDING * 2 - DECORATION_CARD_WIDTH - 16;

const DECORATION_TYPE_LABEL: Record<string, string> = {
  banner: 'Ảnh bìa hồ sơ',
  avatar: 'Khung ảnh đại diện',
  bundle: 'Gói trang trí',
};
function getDecorationCategory(type?: string) {
  return (type && DECORATION_TYPE_LABEL[type]) || 'Trang trí';
}

export default function StoreScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [loadingSouvenirs, setLoadingSouvenirs] = useState(true);
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [loadingDecorations, setLoadingDecorations] = useState(true);
  const [selectedDecoration, setSelectedDecoration] = useState<Decoration | null>(null);
  const [selectedSouvenir, setSelectedSouvenir] = useState<Souvenir | null>(null);
  const [buying, setBuying] = useState(false);
  const { alert: showAlert, confirm: showConfirm, show: customShow } = useConfirm();
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
          userService.getLocalInventory(userId as string)
        ]);
        
        if (p) {
          setProfile({ ...p, inventory: localInv });
        }
      }
    } catch {
      setProfile(null);
    }
  }, []);

  const loadSouvenirs = useCallback(async () => {
    setLoadingSouvenirs(true);
    try {
      const list = await souvenirsService.getList();
      setSouvenirs(list);
    } catch {
      setSouvenirs([]);
    } finally {
      setLoadingSouvenirs(false);
    }
  }, []);

  const loadDecorations = useCallback(async () => {
    setLoadingDecorations(true);
    try {
      const list = await decorationsService.getList();
      setDecorations(list);
    } catch {
      setDecorations([]);
    } finally {
      setLoadingDecorations(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadSouvenirs();
      loadDecorations();
    }, [loadProfile, loadSouvenirs, loadDecorations])
  );

  const handleBuyItem = async (item: { id: string, name: string, image: string, type: string, price: number }) => {
    if (!profile?.userId) {
      showAlert('Thông báo', 'Vui lòng đăng nhập để mua hàng', 'warning');
      return;
    }

    const isConfirmed = await showConfirm(
      'Xác nhận mua hàng',
      `Bạn có muốn mua "${item.name}" với giá ${item.price} xu không?`,
      'Mua ngay'
    );

    if (isConfirmed) {
      setBuying(true);
      try {
        const res = await userService.purchaseItem(profile.userId, item);
        if (res.success) {
          showAlert('Thành công', 'Vật phẩm đã được thêm vào kho của bạn!', 'success');
          loadProfile(); // Refresh balance
          setSelectedDecoration(null);
          setSelectedSouvenir(null);
        } else {
          showAlert('Lỗi', res.message, 'error');
        }
      } catch (e) {
        showAlert('Lỗi', 'Đã có lỗi xảy ra', 'error');
      } finally {
        setBuying(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cửa hàng</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => {}}>
            <Feather name="settings" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
                  <ActivityIndicator size="small" color="#0D9488" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                )}
              </View>
            </View>
            <View style={styles.coinButtons}>
              <TouchableOpacity 
                style={styles.topUpBtnWrap} 
                activeOpacity={0.85}
                onPress={async () => {
                  const res = await userService.topUpPoints(50000);
                  if (res.success) {
                    showAlert('Thành công', `Đã nhận được ${res.pointsEarned} điểm!`, 'success');
                    loadProfile();
                  }
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
              <TouchableOpacity style={styles.historyBtn} activeOpacity={0.7} onPress={() => router.push('/achievement')}>
                <Text style={styles.historyBtnText}>Thành tựu</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bộ sưu tập lưu niệm</Text>
              <TouchableOpacity>
                <Text style={styles.viewAll}>Xem tất cả &gt;</Text>
              </TouchableOpacity>
            </View>
            {loadingSouvenirs ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : (
              <View style={styles.grid}>
                {souvenirs.slice(0, 4).map((item) => (
                  <TouchableOpacity key={item.id} style={styles.productCard} activeOpacity={0.85} onPress={() => setSelectedSouvenir(item)}>
                    <Image source={{ uri: item.image }} style={styles.productImage} />
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.productArtist}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
                    <LinearGradient
                      colors={['#3B82F6', '#10B981']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.priceBtn}
                    >
                      <Text style={styles.priceBtnText}>{item.amount} xu</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.decorationSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trang trí</Text>
              <TouchableOpacity onPress={() => router.push('/decorations')}>
                <Text style={styles.viewAll}>Xem tất cả &gt;</Text>
              </TouchableOpacity>
            </View>
            {loadingDecorations ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.decorationScroll}>
                {decorations.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.decorationCard} activeOpacity={0.85} onPress={() => setSelectedDecoration(item)}>
                    <Image source={{ uri: item.image }} style={styles.decorationImage} />
                    <Text style={styles.decorationName} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
            </View>
            
            {!profile?.inventory || profile.inventory.length === 0 ? (
              <View style={styles.activityCard}>
                <View style={[styles.activityIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Feather name="info" size={20} color="#3B82F6" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>Chưa có giao dịch gần đây</Text>
                  <Text style={styles.activitySubtitle}>Bắt đầu khám phá cửa hàng ngay!</Text>
                </View>
              </View>
            ) : (
              profile.inventory.slice(-3).reverse().map((item, idx) => (
                <View key={idx} style={[styles.activityCard, { marginBottom: 8 }]}>
                  <View style={[styles.activityIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Feather name="shopping-bag" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Đã mua {item.name}</Text>
                    <Text style={styles.activitySubtitle}>{new Date(item.purchasedAt).toLocaleDateString('vi-VN')}</Text>
                  </View>
                  <Text style={[styles.activityAmount, { color: '#EF4444' }]}>-{item.price}</Text>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
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
  settingsBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  viewAll: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 3,
  },
  productImage: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#F1F5F9' },
  productName: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginTop: 10 },
  productArtist: { fontSize: 12, color: '#64748B', marginBottom: 10 },
  priceBtn: { borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  priceBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  decorationSection: { marginBottom: 28 },
  decorationScroll: { gap: 16 },
  decorationCard: { width: DECORATION_CARD_WIDTH, alignItems: 'center' },
  decorationImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#000' },
  decorationName: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 8 },
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
});
