import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { avatarShopService, AvatarItem } from '@/services/avatarShopService';
import { userService, UserProfile } from '@/services/userService';
import { useConfirm } from '@/components/ConfirmProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const GRID_PADDING = 20;
const GAP = 16;
const COLUMN_WIDTH = (width - GRID_PADDING * 2 - GAP) / 2;

export default function AvatarShopScreen() {
  const router = useRouter();
  const { alert: showAlert, confirm: showConfirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'avatar' | 'frame'>('avatar');
  const [items, setItems] = useState<AvatarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // Preview states
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemList, userId] = await Promise.all([
        avatarShopService.getItems(activeTab),
        AsyncStorage.getItem('userId'),
      ]);
      setItems(itemList);
      
      if (userId) {
        const [p, localInv] = await Promise.all([
          userService.getMyProfile(userId),
          userService.getLocalInventory(userId)
        ]);
        
        if (p) {
          setProfile({ ...p, inventory: localInv });
          // Set initial preview from profile if not set
          if (!previewAvatar) setPreviewAvatar(p.image || 'https://i.pravatar.cc/300');
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleItemPress = (item: AvatarItem) => {
    if (item.type === 'avatar') {
      setPreviewAvatar(item.image);
    } else {
      setPreviewFrame(item.image);
    }
  };

  const handleBuy = async (item: AvatarItem) => {
    if (!profile?.userId) {
      showAlert('Thông báo', 'Vui lòng đăng nhập để mua hàng', 'warning');
      return;
    }

    if (profile.points < item.price) {
      showAlert('Lỗi', 'Bạn không đủ điểm để mua vật phẩm này', 'error');
      return;
    }

    const confirmed = await showConfirm(
      'Xác nhận mua',
      `Bạn có muốn mua "${item.name}" với giá ${item.price} điểm?`,
      'Mua ngay'
    );

    if (confirmed) {
      setBuyingId(item.id);
      try {
        const res = await userService.purchaseItem(profile.userId, {
          id: item.id,
          name: item.name,
          image: item.image,
          type: item.type,
          price: item.price
        });

        if (res.success) {
          showAlert('Thành công', 'Vật phẩm đã được thêm vào kho của bạn!', 'success');
          loadData(); 
        } else {
          showAlert('Lỗi', res.message, 'error');
        }
      } catch (error) {
        showAlert('Lỗi', 'Đã có lỗi xảy ra', 'error');
      } finally {
        setBuyingId(null);
      }
    }
  };

  const handleEquip = async (item: AvatarItem) => {
    if (!profile?.userId) return;
    
    setBuyingId(item.id);
    try {
      if (item.type === 'avatar') {
        const success = await userService.updateProfile(profile.userId, {
          image: item.image
        });
        if (success) {
          showAlert('Thành công', 'Đã thay đổi ảnh đại diện!', 'success');
          loadData();
        } else {
          showAlert('Lỗi', 'Không thể cập nhật ảnh đại diện', 'error');
        }
      } else {
        // Xử lý frame nếu cần (hiện tại backend chưa hỗ trợ field frame)
        showAlert('Thông báo', 'Tính năng dùng khung sẽ sớm ra mắt!', 'info');
      }
    } catch (error) {
      showAlert('Lỗi', 'Đã có lỗi xảy ra', 'error');
    } finally {
      setBuyingId(null);
    }
  };

  const isOwned = (itemId: string) => {
    if (!profile?.inventory) return false;
    return profile.inventory.some(item => item.id === itemId);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.title}>Cửa hàng Avatar</Text>
          <View style={styles.balanceContainer}>
            <MaterialIcons name="stars" size={18} color="#FFB300" />
            <Text style={styles.balanceText}>{profile?.points?.toLocaleString() || 0}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Live Preview Area */}
          <View style={styles.previewSection}>
            <View style={styles.previewCard}>
              <View style={styles.previewAvatarContainer}>
                {previewFrame && (
                  <Image 
                    source={{ uri: previewFrame }} 
                    style={styles.previewFrame} 
                  />
                )}
                <Image 
                  source={{ uri: previewAvatar || 'https://i.pravatar.cc/300' }} 
                  style={styles.previewAvatar} 
                  resizeMode="cover"
                />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewLabel}>Xem trước diện mạo</Text>
                <Text style={styles.previewSublabel}>Kết hợp để tạo phong cách riêng</Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'avatar' && styles.activeTab]}
              onPress={() => setActiveTab('avatar')}
            >
              <Text style={[styles.tabText, activeTab === 'avatar' && styles.activeTabText]}>Avatar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'frame' && styles.activeTab]}
              onPress={() => setActiveTab('frame')}
            >
              <Text style={[styles.tabText, activeTab === 'frame' && styles.activeTabText]}>Khung hình</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <View style={styles.grid}>
              {items.map((item) => {
                const owned = isOwned(item.id);
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.itemCard}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemImageContainer}>
                      <Image source={{ uri: item.image }} style={styles.itemImage} />
                      {owned && (
                        <View style={styles.ownedBadge}>
                          <Text style={styles.ownedBadgeText}>Đã sở hữu</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.itemFooter}>
                        <View style={styles.priceContainer}>
                          <MaterialIcons name="stars" size={14} color="#FFB300" />
                          <Text style={styles.itemPrice}>{item.price}</Text>
                        </View>
                        <TouchableOpacity 
                          style={[styles.buyBtn, owned && styles.ownedBtn]}
                          onPress={() => owned ? handleEquip(item) : handleBuy(item)}
                          disabled={buyingId === item.id}
                        >
                          {buyingId === item.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.buyBtnText}>{owned ? 'Dùng' : 'Mua'}</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  balanceText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  scrollContent: {
    paddingTop: 16,
  },
  previewSection: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: 20,
  },
  previewCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  previewAvatarContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderRadius: 50,
  },
  previewAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    position: 'absolute',
    zIndex: 2,
  },
  previewFrame: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  previewInfo: {
    marginLeft: 16,
    flex: 1,
  },
  previewLabel: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewSublabel: {
    color: '#64748B',
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTab: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tabText: {
    color: '#64748B',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFF',
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GAP,
  },
  itemCard: {
    width: COLUMN_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    marginBottom: 4,
  },
  itemImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  ownedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ownedBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPrice: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  buyBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ownedBtn: {
    backgroundColor: '#10B981',
  },
  buyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
