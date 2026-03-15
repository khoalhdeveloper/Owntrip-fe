import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { FlatList } from 'react-native';

import { userService, UserProfile } from '@/services/userService';
import { tripService, Trip, TripDetailResponse } from '@/services/tripService';
import { notificationService, Notification } from '@/services/notificationService';
import TripDetailModal from '@/components/TripDetailModal';
import { useChatbotSetting } from '@/context/ChatbotSettingContext';
import { getImageSource } from '@/utils/imageUtils';
import { decodeJWT } from '@/utils/jwtUtils';
import { useConfirm } from '@/components/ConfirmProvider';

const { width } = Dimensions.get('window');

// decodeJWT utility is now imported from @/utils/jwtUtils

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newImage, setNewImage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedTripDetail, setSelectedTripDetail] = useState<TripDetailResponse | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);
  const { aiButtonEnabled, setAiButtonEnabled } = useChatbotSetting();
  const { alert: showAlert, confirm: showConfirm } = useConfirm();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  const [selectedNotifForDetail, setSelectedNotifForDetail] = useState<Notification | null>(null);

  const handleTripPress = async (id: string) => {
    setLoadingTripDetail(true);
    const detail = await tripService.getTripById(id);
    if (detail) {
      setSelectedTripDetail(detail);
    }
    setLoadingTripDetail(false);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Profile: Starting loadData...');
      let userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('token');
      
      console.log('📦 Profile: Storage state:', { userId, hasToken: !!token });

      if (!token) {
        console.warn('⚠️ Profile: No token found, redirecting to login');
        router.replace('/(auth)/login');
        return;
      }

      // Fallback 1: Trích xuất userId từ token nếu bị mất trong storage
      if (!userId && token) {
        console.log('🔑 Profile: UserId missing, attempting to decode JWT...');
        const decoded = decodeJWT(token);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
          console.log('✅ Profile: Decoded userId from token:', userId);
          await AsyncStorage.setItem('userId', userId as string);
        }
      }

      // Nếu tất cả thất bại mới yêu cầu login lại
      if (!userId) {
        console.warn('❌ Profile: All userId recovery failed.');
        router.replace('/(auth)/login');
        return;
      }

      console.log('📡 Profile: Fetching profile, trips & inventory for:', userId);
      const [profileData, tripsData, localInv] = await Promise.all([
        userService.getMyProfile(userId as string),
        tripService.getMyTrips(),
        userService.getLocalInventory(userId as string)
      ]);

      console.log('✨ Profile: Data fetch complete');

      if (profileData) {
        setProfile({ ...profileData, inventory: localInv });
      }
      setTrips(tripsData || []);

      // Fetch notifications
      const notifs = await notificationService.getAll();
      setNotifications(notifs || []);
    } catch (error: any) {
      console.error('🔥 Profile: Critical error in loadData:', error);
      if (error?.response?.status === 401) {
        router.replace('/(auth)/login');
      } else {
        showAlert("Lỗi", "Không thể tải dữ liệu cá nhân. Vui lòng thử lại sau.", "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setNewImage(result.assets[0].uri);
    }
  };

  const handleLogout = async () => {
    const isConfirmed = await showConfirm(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất?",
      "Đăng xuất"
    );

    if (isConfirmed) {
      await AsyncStorage.multiRemove(['token', 'userId']);
      router.replace('/(auth)/login');
    }
  };
  const handleUpdate = async () => {
    if (!profile?.userId || !newDisplayName.trim()) return;

    try {
      setIsUpdating(true);
      let finalImageUrl = newImage;

      // 1. Nếu là ảnh từ máy (file://), upload lên Cloudinary trước
      if (newImage && newImage.startsWith('file://')) {
        console.log('☁️ Uploading to Cloudinary...');
        const formData = new FormData();
        formData.append('file', {
          uri: newImage,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);
        // QUAN TRỌNG: Bạn hãy vào Settings -> Upload -> Add upload preset
        // Đặt tên là 'owntrip' và CHỌN 'Unsigned' ở phần Signing Mode
        formData.append('upload_preset', 'owntrip'); 

        try {
          const cloudResponse = await fetch('https://api.cloudinary.com/v1_1/djm9x06oh/image/upload', {
            method: 'POST',
            body: formData,
          });
          const cloudData = await cloudResponse.json();
          if (cloudData.secure_url) {
            finalImageUrl = cloudData.secure_url;
            console.log('✅ Cloudinary URL:', finalImageUrl);
          } else {
            console.error('❌ Cloudinary Error:', cloudData);
            showAlert("Lỗi", "Không thể upload ảnh lên Cloudinary", "error");
            setIsUpdating(false);
            return;
          }
        } catch (err) {
          console.error('🔥 Cloudinary Fetch Error:', err);
          showAlert("Lỗi", "Lỗi kết nối Cloudinary", "error");
          setIsUpdating(false);
          return;
        }
      }

      // 2. Cập nhật Profile với URL ảnh cuối cùng
      console.log('🚀 Updating profile for:', profile.userId, { displayName: newDisplayName, image: finalImageUrl });
      
      const success = await userService.updateProfile(profile.userId, { 
        displayName: newDisplayName.trim(),
        image: finalImageUrl.trim() || undefined
      });

      console.log('✅ Update result:', success);

      if (success) {
        // Cập nhật giao diện trong máy ngay lập tức + cache buster để tránh ảnh cũ
        const finalUrl = finalImageUrl.trim();
        setProfile(prev => prev ? { 
          ...prev, 
          displayName: newDisplayName.trim(),
          image: finalUrl ? `${finalUrl}?t=${Date.now()}` : prev.image
        } : null);
        
        setEditModalVisible(false);
        setNewImage(''); // Xóa biến tạm
        showAlert("Thành công", "Đã cập nhật hồ sơ", "success");
        // Đợi 2 giây để server kịp đồng bộ DB
        setTimeout(() => loadData(), 2000);
      } else {
        showAlert("Lỗi", "Không thể cập nhật hồ sơ. Vui lòng thử lại.", "error");
      }
    } catch (error) {
      console.error('🔥 Update Error:', error);
      showAlert("Lỗi", "Đã có lỗi xảy ra", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const success = await notificationService.markAsRead(id);
    if (success) {
      setNotifications(prev => 
        prev.map(notif => notif._id === id ? { ...notif, isRead: true } : notif)
      );
    }
  };

  const handleNotifPress = (notif: Notification) => {
    setSelectedNotifForDetail(notif);
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
  };

  const hasUnread = notifications.some(n => !n.isRead);

  const openEditModal = () => {
    setNewDisplayName(profile?.displayName || '');
    setNewImage(profile?.image || '');
    setEditModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Background */}
        <LinearGradient
          colors={['#005CB8', '#007AFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBG}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>Hồ sơ</Text>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <Feather name="log-out" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <ExpoImage 
                source={getImageSource(profile?.image || 'https://i.pravatar.cc/300')} 
                style={styles.avatar} 
                contentFit="cover"
              />
              {profile?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={20} color="#007AFF" />
                </View>
              )}
            </View>
            
            <Text style={styles.userName}>{profile?.displayName || 'Người dùng'}</Text>
            <Text style={styles.userEmail}>{profile?.email}</Text>
            
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>{profile?.role?.toUpperCase()}</Text>
            </View>

            <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
              <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
          </View>

          {/* Assets Row */}
          <View style={styles.assetsRow}>
            <View style={styles.assetItem}>
              <View style={styles.assetIconContainer}>
                <FontAwesome5 name="wallet" size={20} color="#005CB8" />
              </View>
              <View>
                <Text style={styles.assetLabel}>Số dư</Text>
                <Text style={styles.assetValue}>${profile?.balance?.toLocaleString() || 0}</Text>
              </View>
            </View>

            <View style={styles.assetDivider} />

            <View style={styles.assetItem}>
              <View style={[styles.assetIconContainer, { backgroundColor: 'rgba(255, 179, 0, 0.1)' }]}>
                <MaterialIcons name="stars" size={24} color="#FFB300" />
              </View>
              <View>
                <Text style={styles.assetLabel}>Điểm thưởng</Text>
                <Text style={styles.assetValue}>{profile?.points?.toLocaleString() || 0}</Text>
              </View>
            </View>
          </View>

          {/* Trips Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chuyến đi của tôi</Text>
          </View>

          {trips.length === 0 ? (
            <View style={styles.emptyTrips}>
              <Feather name="map" size={40} color="#CBD5E0" />
              <Text style={styles.emptyText}>Chưa có chuyến đi nào</Text>
              <TouchableOpacity 
                style={styles.createBtn}
                onPress={() => router.push('/create-trip')}
              >
                <Text style={styles.createBtnText}>Tạo chuyến đi mới</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tripsList}>
              {trips.slice(0, 3).map((trip, index) => (
                <TouchableOpacity key={index} style={styles.tripItem} onPress={() => handleTripPress(trip._id)}>
                   <ExpoImage 
                    source={getImageSource(trip.provinceImage || 'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=800')} 
                    style={styles.tripImage} 
                    contentFit="cover"
                  />
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
                    <View style={styles.tripMeta}>
                      <Feather name="map-pin" size={12} color="#718096" />
                      <Text style={styles.tripDestination}>{trip.destination}</Text>
                      <View style={styles.dot} />
                      <Text style={styles.tripDays}>{trip.totalDays} ngày</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={20} color="#CBD5E0" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Inventory Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kho vật phẩm của tôi</Text>
            <TouchableOpacity onPress={() => router.push('/store')}>
              <Text style={styles.viewAll}>Cửa hàng &gt;</Text>
            </TouchableOpacity>
          </View>

          {!profile?.inventory || profile.inventory.length === 0 ? (
            <View style={styles.emptyInventory}>
              <Feather name="package" size={40} color="#CBD5E0" />
              <Text style={styles.emptyText}>Chưa có vật phẩm nào</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.inventoryList}
              style={styles.inventoryScroll}
            >
              {profile.inventory.map((item, index) => (
                <View key={index} style={styles.inventoryItemCard}>
                  <View style={styles.inventoryImageWrap}>
                    <ExpoImage 
                      source={getImageSource(item.image)} 
                      style={styles.inventoryImage} 
                      contentFit="cover"
                    />
                  </View>
                  <Text style={styles.inventoryName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.inventoryBadge}>
                    <Text style={styles.inventoryBadgeText}>{item.type.toUpperCase()}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Settings Section */}
          <View style={styles.settingsGroup}>
             <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setIsNotifModalVisible(true)}
              >
                <View style={[styles.settingIcon, { backgroundColor: '#F0FFF4' }]}>
                  <Feather name="bell" size={18} color="#38A169" />
                  {hasUnread && <View style={styles.notifDotMini} />}
                </View>
                <Text style={styles.settingLabel}>Thông báo</Text>
                <Feather name="chevron-right" size={20} color="#CBD5E0" />
             </TouchableOpacity>

             {/* AI Chatbot Toggle */}
             <View style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: '#EBF4FF' }]}>
                  <Feather name="message-square" size={18} color="#4A7CFF" />
                </View>
                <Text style={styles.settingLabel}>Nút trợ lý AI</Text>
                <Switch
                  value={aiButtonEnabled}
                  onValueChange={setAiButtonEnabled}
                  trackColor={{ false: '#E2E8F0', true: '#BEE3F8' }}
                  thumbColor={aiButtonEnabled ? '#4A7CFF' : '#A0AEC0'}
                />
             </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <BlurView intensity={10} style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
              
              <View style={styles.modalAvatarContainer}>
                <Image 
                  source={getImageSource(newImage || 'https://i.pravatar.cc/300')} 
                  style={styles.modalAvatar} 
                />
              </View>
              
              <View style={styles.editInputGroup}>
                <Text style={styles.editInputLabel}>Tên hiển thị</Text>
                <TextInput
                  style={styles.editInput}
                  value={newDisplayName}
                  onChangeText={setNewDisplayName}
                  placeholder="Nhập tên của bạn"
                />
              </View>

              <View style={styles.editInputGroup}>
                <Text style={styles.editInputLabel}>Ảnh đại diện</Text>
                <View style={styles.imageEditRow}>
                  <TouchableOpacity style={styles.pickImageBtn} onPress={pickImage}>
                    <Feather name="image" size={18} color="#007AFF" />
                    <Text style={styles.pickImageText}>Chọn từ máy</Text>
                  </TouchableOpacity>
                  <Text style={styles.orText}>- OR -</Text>
                </View>
                <TextInput
                  style={[styles.editInput, { marginTop: 10 }]}
                  value={newImage}
                  onChangeText={setNewImage}
                  placeholder="Hoặc dán URL ảnh tại đây"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveBtn} 
                  onPress={handleUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Lưu</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>

      {/* Trip Detail Modal */}
      <TripDetailModal
        visible={!!selectedTripDetail || loadingTripDetail}
        loading={loadingTripDetail}
        selectedTripDetail={selectedTripDetail}
        onClose={() => {
          if (!loadingTripDetail) setSelectedTripDetail(null);
        }}
        onRefresh={loadData}
      />

      {/* Notifications Modal */}
      <Modal
        visible={isNotifModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNotifModalVisible(false)}
      >
        <View style={styles.notifModalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPress={() => setIsNotifModalVisible(false)}
          />
          <View style={[styles.modalContentNotif, { height: '85%' }]}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Thông báo</Text>
              <TouchableOpacity onPress={() => setIsNotifModalVisible(false)}>
                <Feather name="x" size={24} color="#1A2B4A" />
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyNotifContainer}>
                <Feather name="bell-off" size={48} color="#E2E8F0" />
                <Text style={styles.emptyNotifText}>Bạn chưa có thông báo nào</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.notifItem, !item.isRead && styles.notifItemUnread]}
                    onPress={() => handleNotifPress(item)}
                  >
                    <View style={[styles.notifIcon, { backgroundColor: item.isRead ? '#F7FAFC' : '#EBF8FF' }]}>
                      <Feather
                        name={item.type === 'promotion' ? 'tag' : 'bell'}
                        size={18}
                        color={item.isRead ? '#718096' : '#4299E1'}
                      />
                    </View>
                    <View style={styles.notifInfo}>
                      <Text style={[styles.notifItemTitle, !item.isRead && styles.notifTextUnread]}>
                        {item.title}
                      </Text>
                      <Text style={styles.notifItemMessage} numberOfLines={2}>
                        {item.message}
                      </Text>
                      <Text style={styles.notifItemTime}>
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                    {!item.isRead && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Notification Detail Modal */}
      <Modal
        visible={!!selectedNotifForDetail}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedNotifForDetail(null)}
      >
        <View style={styles.detailNotifOverlay}>
          <View style={styles.detailNotifContent}>
            <View style={styles.detailNotifHeader}>
              <View style={[styles.notifIconDetail, { backgroundColor: '#EBF8FF', marginBottom: 0 }]}>
                 <Feather 
                  name={selectedNotifForDetail?.type === 'promotion' ? 'tag' : 'bell'} 
                  size={24} 
                  color="#4299E1" 
                />
              </View>
              <TouchableOpacity onPress={() => setSelectedNotifForDetail(null)}>
                <Feather name="x" size={20} color="#CBD5E0" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.detailNotifTitle}>{selectedNotifForDetail?.title}</Text>
            <Text style={styles.detailNotifTime}>
              {selectedNotifForDetail && new Date(selectedNotifForDetail.createdAt).toLocaleString('vi-VN')}
            </Text>
            
            <View style={styles.detailNotifDivider} />
            
            <ScrollView style={{ maxHeight: 200 }}>
              <Text style={styles.detailNotifMessage}>{selectedNotifForDetail?.message}</Text>
            </ScrollView>

            <TouchableOpacity 
              style={styles.detailNotifButton}
              onPress={() => setSelectedNotifForDetail(null)}
            >
              <Text style={styles.detailNotifButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBG: {
    height: 200,
    width: '100%',
  },
  headerContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginTop: -60,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1A2B4A',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  roleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 20,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 1,
  },
  editBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  editBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  assetsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#1A2B4A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  assetItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assetIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 92, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  assetValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  assetDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  viewAll: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '700',
  },
  emptyTrips: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
    marginBottom: 16,
    fontWeight: '600',
  },
  createBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  createBtnText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '700',
  },
  tripsList: {
    gap: 12,
    marginBottom: 24,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tripImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripDestination: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  tripDays: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E0',
    marginHorizontal: 2,
  },
  settingsGroup: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyInventory: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  inventoryScroll: {
    marginBottom: 28,
  },
  inventoryList: {
    paddingRight: 20,
    gap: 16,
  },
  inventoryItemCard: {
    width: 130,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  inventoryImageWrap: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  inventoryImage: {
    width: '100%',
    height: '100%',
  },
  inventoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  inventoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inventoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#F1F5F9',
  },
  editInputGroup: {
    marginBottom: 24,
  },
  editInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  editInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  imageEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  pickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BEE3F8',
  },
  pickImageText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '700',
  },
  orText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
    letterSpacing: 1,
  },
  modalCloseArea: {
    flex: 1,
  },
  notifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContentNotif: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  notifTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2B4A',
  },
  emptyNotifContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyNotifText: {
    marginTop: 16,
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    fontWeight: '500',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  notifItemUnread: {
    backgroundColor: '#F0F9FF',
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  notifIconDetail: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notifInfo: {
    flex: 1,
  },
  notifItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  notifTextUnread: {
    color: '#1A2B4A',
    fontWeight: '700',
  },
  notifItemMessage: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  notifItemTime: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4299E1',
    marginLeft: 8,
  },
  notifDotMini: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F56565',
    borderWidth: 1.5,
    borderColor: '#F0FFF4',
  },
  // Notification Detail Styles
  detailNotifOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailNotifContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  detailNotifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailNotifTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2B4A',
    marginBottom: 4,
  },
  detailNotifTime: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 16,
  },
  detailNotifDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginBottom: 16,
  },
  detailNotifMessage: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
  },
  detailNotifButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  detailNotifButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
