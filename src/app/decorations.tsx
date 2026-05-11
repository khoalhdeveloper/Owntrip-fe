import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { avatarItemService, AvatarItem } from '@/services/avatarItemService';
import { userService } from '@/services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 12;
const COLS = 2; // Change to 2 for better visibility
const CARD_SIZE = (width - PADDING * 2 - GAP) / COLS;

const RARITY_COLORS: Record<string, string> = {
  common: '#94A3B8',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

export default function DecorationsScreen() {
  const router = useRouter();
  const [list, setList] = useState<AvatarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'frame' | 'avatar'>('frame');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      const [items, profileData, localInv, frame] = await Promise.all([
        avatarItemService.getShopItems(),
        userId ? userService.getMyProfile(userId) : null,
        userId ? userService.getLocalInventory(userId) : [],
        AsyncStorage.getItem('equipped_frame')
      ]);
      
      setList(items);
      setInventory(localInv || []);
      setEquippedFrame(frame);
      if (profileData) {
        setUserPoints(profileData.points || 0);
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUse = async (item: AvatarItem) => {
    if (item.type === 'frame') {
      if (equippedFrame === item.imageUrl) {
        // Tháo khung
        await AsyncStorage.removeItem('equipped_frame');
        setEquippedFrame(null);
        alert('Đã tháo khung ảnh!');
      } else {
        // Đội khung
        await AsyncStorage.setItem('equipped_frame', item.imageUrl);
        setEquippedFrame(item.imageUrl);
        alert('Đã áp dụng khung ảnh mới!');
      }
    } else if (item.type === 'avatar') {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        await userService.updateProfile(userId, { image: item.imageUrl });
        alert('Đã thay đổi ảnh đại diện!');
      }
    }
  };

  const handlePurchase = async (item: AvatarItem) => {
    if (userPoints < item.price) {
      alert(`Bạn không đủ điểm! Cần ${item.price} pts, bạn có ${userPoints} pts.`);
      return;
    }

    setBuyingId(item.itemId);
    const res = await avatarItemService.purchaseItem(item.itemId, item.price);
    if (res.success) {
      // Tự động sử dụng luôn sau khi mua
      if (item.type === 'frame') {
        await AsyncStorage.setItem('equipped_frame', item.imageUrl);
      } else if (item.type === 'avatar') {
        // Cập nhật avatar thật của user qua API
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          await userService.updateProfile(userId, { image: item.imageUrl });
        }
      }
      
      alert('Mua hàng thành công! Vật phẩm đã được áp dụng ngay lập tức.');
      setUserPoints(prev => prev - item.price);
      // Cập nhật inventory state để hiện nút "Sử dụng"
      setInventory(prev => [...prev, { id: item.itemId, name: item.name, image: item.imageUrl, type: item.type }]);
    } else {
      alert(res.message);
    }
    setBuyingId(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Feather name="arrow-left" size={24} color="#E2E8F0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trang trí</Text>
          <TouchableOpacity style={styles.headerBtn}>
            <Feather name="settings" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Points */}
            <View style={styles.pointsBanner}>
              <View>
                <Text style={styles.pointsLabel}>Số dư của bạn</Text>
                <Text style={styles.pointsValue}>{userPoints.toLocaleString()} pts</Text>
              </View>
              <TouchableOpacity style={styles.topUpBtn} onPress={() => router.push('/(tabs)/profile')}>
                <Text style={styles.topUpText}>Nạp thêm</Text>
              </TouchableOpacity>
            </View>

            {/* Shop Items Grid */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Vật phẩm độc quyền</Text>
                <Text style={styles.itemCount}>{list.filter(i => i.type === activeTab).length} item</Text>
              </View>

              {/* Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'frame' && styles.activeTab]}
                  onPress={() => setActiveTab('frame')}
                >
                  <Text style={[styles.tabText, activeTab === 'frame' && styles.activeTabText]}>Khung ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'avatar' && styles.activeTab]}
                  onPress={() => setActiveTab('avatar')}
                >
                  <Text style={[styles.tabText, activeTab === 'avatar' && styles.activeTabText]}>Ảnh đại diện</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.grid}>
                {list
                  .filter(item => item.type === activeTab)
                  .map((item) => {
                  const isOwned = inventory.some(inv => inv.id === item.itemId);
                  const isEquipped = item.type === 'frame' ? equippedFrame === item.imageUrl : false; // For avatar we check image URL

                  return (
                    <View key={item.itemId} style={styles.gridCard}>
                      <View style={styles.gridImageWrap}>
                        <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
                        <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[item.rarity] }]}>
                          <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.cardInfo}>
                        <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.gridType}>{item.type === 'frame' ? 'Khung ảnh' : 'Avatar'}</Text>
                        
                        <View style={styles.priceRow}>
                          <Feather name="award" size={14} color="#F59E0B" />
                          {isOwned ? (
                             <Text style={[styles.priceText, { color: '#34D399' }]}>Đã sở hữu</Text>
                          ) : (
                             <Text style={styles.priceText}>{item.price.toLocaleString()} pts</Text>
                          )}
                        </View>

                        <TouchableOpacity 
                          style={[
                            styles.buyBtn, 
                            isEquipped && { backgroundColor: '#EF4444' }, // Red for remove
                            buyingId === item.itemId && styles.buyBtnLoading
                          ]}
                          onPress={() => isOwned ? handleUse(item) : handlePurchase(item)}
                          disabled={buyingId === item.itemId}
                        >
                          {buyingId === item.itemId ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.buyBtnText}>
                              {isEquipped ? 'Tháo ra' : (isOwned ? 'Sử dụng' : 'Mua ngay')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0d18' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15, 13, 24, 0.95)',
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: PADDING, paddingTop: 16 },

  pointsBanner: {
    backgroundColor: '#312E81', // Brighter indigo
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.5)',
    elevation: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  pointsLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  pointsValue: { color: '#FFF', fontSize: 24, fontWeight: '800', marginTop: 4 },
  topUpBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  topUpText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 27, 75, 0.8)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFF',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  itemCount: { fontSize: 13, color: '#6366F1', fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  gridCard: {
    width: CARD_SIZE,
    backgroundColor: 'rgba(30, 27, 75, 0.5)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  gridImageWrap: {
    width: '100%',
    height: CARD_SIZE,
    backgroundColor: '#000',
    position: 'relative',
  },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  rarityBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  cardInfo: { padding: 12 },
  gridName: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  gridType: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  priceText: { fontSize: 16, fontWeight: '800', color: '#F59E0B' },

  buyBtn: { 
    backgroundColor: '#6366F1', 
    marginTop: 12, 
    paddingVertical: 10, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buyBtnDisabled: { backgroundColor: '#334155', shadowOpacity: 0 },
  buyBtnLoading: { backgroundColor: '#4F46E5' },
  buyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
