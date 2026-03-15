import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Linking,
  Animated,
  TextInput,
  FlatList,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { placesService, Place } from '../../services/placesService';
import { tripService, Trip, TripDetailResponse } from '../../services/tripService';
import { userService, UserProfile } from '../../services/userService';
import { notificationService, Notification } from '../../services/notificationService';
import { getImageSource } from '../../utils/imageUtils';

const MOCK_TRIP_REVIEWS = [
  {
    id: '1',
    userName: 'Trần Hoàng Nam',
    rating: 5,
    content: 'Lịch trình rất hợp lý, các điểm đến đều đẹp và dịch vụ tốt. Rất đáng tiền!',
    date: '3 ngày trước',
    userAvatar: 'https://i.pravatar.cc/150?u=4'
  },
  {
    id: '2',
    userName: 'Mai Phương Thảo',
    rating: 5,
    content: 'Gia đình tôi đã có một chuyến đi tuyệt vời nhờ lịch trình này. Cảm ơn OwnTrip!',
    date: '1 tuần trước',
    userAvatar: 'https://i.pravatar.cc/150?u=5'
  }
];

const MOCK_REVIEWS = [

  {
    id: '1',
    userName: 'Nguyễn Văn An',
    rating: 5,
    content: 'Địa điểm tuyệt vời, không khí rất trong lành và mát mẻ. Rất xứng đáng để ghé thăm!',
    date: '2 ngày trước',
    userAvatar: 'https://i.pravatar.cc/150?u=1'
  },
  {
    id: '2',
    userName: 'Lê Thị Bình',
    rating: 4,
    content: 'Cảnh quan đẹp tuyệt vời, tuy nhiên đường đi hơi đông đúc vào cuối tuần.',
    date: '1 tuần trước',
    userAvatar: 'https://i.pravatar.cc/150?u=2'
  },
  {
    id: '3',
    userName: 'Phạm Minh Đức',
    rating: 5,
    content: 'Hành trình chinh phục đỉnh núi rất thú vị. Tượng Phật Bà Tây Bổ Đà Sơn thật sự hùng vĩ.',
    date: '2 tuần trước',
    userAvatar: 'https://i.pravatar.cc/150?u=3'
  }
];

export default function HomeScreen() {

  const router = useRouter();
  const [trendingPlaces, setTrendingPlaces] = useState<Place[]>([]);
  const [recommendedTrips, setRecommendedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const [selectedTripDetail, setSelectedTripDetail] = useState<TripDetailResponse | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [selectedNotifForDetail, setSelectedNotifForDetail] = useState<Notification | null>(null);

  const { width } = Dimensions.get('window');
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [isSearchingResults, setIsSearchingResults] = useState(false);

  const ITEM_WIDTH = width * 0.65;
  const ITEM_SPACING = 0;
  const ITEM_SIZE = ITEM_WIDTH + ITEM_SPACING;
  const SPACER_SIZE = (width - ITEM_WIDTH) / 2;

  useFocusEffect(
    useCallback(() => {
      const fetchTrending = async () => {
      try {
        setLoading(true);
        const places = await placesService.searchTrending();
        
        // Strictly filter: Must have BOTH 'photo' AND 'photos' array populated
        const placesWithPhotos = (places || []).filter(p => 
          p.photo && p.photo.trim() !== '' && 
          p.photos && p.photos.length > 0
        );

        // Để làm loop vô tận ảo, ta nhân 3 mảng dữ liệu (Triple buffer)
        if (placesWithPhotos.length > 0) {
          setTrendingPlaces([...placesWithPhotos, ...placesWithPhotos, ...placesWithPhotos]);
          setIsLooping(true);
        } else {
          setTrendingPlaces([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    const fetchTrips = async () => {
      try {
        setLoadingTrips(true);
        const trips = await tripService.getPublishedTrips(1, 10);
        // Strictly filter: Only keep trips with images
        const tripsWithImages = (trips || []).filter(t => getImageSource(t.provinceImage) !== null);
        setRecommendedTrips(tripsWithImages);
      } finally {
        setLoadingTrips(false);
      }
    };

    const fetchUserInfo = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          const profile = await userService.getMyProfile(userId);
          if (profile) {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error('Error fetching user info in Home:', error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const data = await notificationService.getAll();
        setNotifications(data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchTrending();
    fetchTrips();
    fetchUserInfo();
    fetchNotifications();
  }, [])
  );

  const handleTripPress = async (id: string) => {
    setLoadingTripDetail(true);
    try {
      const detail = await tripService.getTripById(id);
      if (detail) {
        setSelectedTripDetail(detail);
      }
    } finally {
      setLoadingTripDetail(false);
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

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearchingResults(true);
    try {
      const results = await placesService.searchText({ q: text, limit: 10 });
      const filtered = (results || []).filter(p => 
        p.photo && p.photo.trim() !== '' && 
        p.photos && p.photos.length > 0
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearchingResults(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Chào {userProfile?.displayName || 'bạn'} 👋</Text>
            <Text style={styles.headerTitle}>Khám phá</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.pointsBadge}>
              <Feather name="award" size={16} color="#48BB78" />
              <Text style={styles.pointsText}>{userProfile?.points?.toLocaleString() || '0'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.notifButton}
              onPress={() => setIsNotifModalVisible(true)}
            >
              <Feather name="bell" size={20} color="#1A2B4A" />
              {hasUnread && <View style={styles.notifDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <TouchableOpacity 
          style={styles.searchBar} 
          activeOpacity={0.8}
          onPress={() => setIsSearchModalVisible(true)}
        >
          <Feather name="search" size={18} color="#A0AEC0" />
          <Text style={styles.searchPlaceholder}>Tìm kiếm điểm đến...</Text>
        </TouchableOpacity>

        {/* Banner */}
        <ImageBackground 
          source={getImageSource('https://logico.com.vn/upload_images/images/2022/11/30/hinh-nen-dep-7.jpg')}
          style={styles.banner}
          imageStyle={styles.bannerImage}
        >
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>Đi đâu{'\n'}tiếp theo?</Text>
            <Text style={styles.bannerSubtitle}>Tạo ngay lịch trình du lịch dành riêng cho bạn.</Text>
            <TouchableOpacity 
              style={styles.bannerButton}
              onPress={() => router.push('/instant-plan')}
            >
              <Feather name="zap" size={16} color="#FFFFFF" />
              <Text style={styles.bannerButtonText}>Lên lịch ngay</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* Địa điểm thịnh hành */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Địa điểm thịnh hành</Text>
          <Text style={styles.viewAll}>Xem tất cả &gt;</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4A7CFF" style={{ paddingVertical: 40 }} />
        ) : trendingPlaces.length === 0 ? (
          <Text style={styles.comingSoon}>Không tìm thấy địa điểm thịnh hành nào.</Text>
        ) : (
          <View style={{ marginHorizontal: -20 }}>
            <Animated.ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: SPACER_SIZE,
              }}
              snapToInterval={ITEM_SIZE}
              decelerationRate="fast"
              onLayout={() => {
                if (isLooping && trendingPlaces.length > 0) {
                  const originalLength = trendingPlaces.length / 3;
                  // Nhảy tới bản sao ở giữa khi vừa load, thêm delay nhỏ để đảm bảo Layout hoàn tất
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ x: originalLength * ITEM_SIZE, animated: false });
                  }, 100);
                }
              }}
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const originalLength = trendingPlaces.length / 3;
                const totalWidth = originalLength * ITEM_SIZE;
                
                // Nếu lướt quá bản sao ở giữa (về trước hoặc sau), nhảy về bản sao ở giữa ngay lập tức
                if (offsetX < (originalLength - 1) * ITEM_SIZE) {
                   scrollViewRef.current?.scrollTo({ x: offsetX + totalWidth, animated: false });
                } else if (offsetX >= 2 * originalLength * ITEM_SIZE) {
                   scrollViewRef.current?.scrollTo({ x: offsetX - totalWidth, animated: false });
                }
              }}
              bounces={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
            >
            {trendingPlaces.map((place, index) => {
              const inputRange = [
                (index - 1) * ITEM_SIZE,
                index * ITEM_SIZE,
                (index + 1) * ITEM_SIZE,
              ];
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.8, 1, 0.8], 
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3], 
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={`${place.placeId}-${index}`}
                  style={{
                    width: ITEM_WIDTH,
                    marginRight: index === trendingPlaces.length - 1 ? 0 : ITEM_SPACING,
                    transform: [
                      { scale },
                    ],
                    opacity,
                  }}
                >
                  <TouchableOpacity
                    style={[styles.trendingCard, { width: ITEM_WIDTH }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedPlace(place);
                      setCurrentPhotoIndex(0);
                    }}
                  >
                    <View style={styles.trendingImageWrapper}>
                      {place.photo ? (
                        <ExpoImage
                          source={getImageSource(place.photo)}
                          style={styles.trendingImage}
                          contentFit="cover"
                          transition={300}
                        />
                      ) : (
                        <View style={styles.trendingImagePlaceholder}>
                          <Feather name="image" size={32} color="#CBD5E0" />
                        </View>
                      )}
                    </View>
                    <View style={styles.trendingInfo}>
                      <Text style={styles.trendingTitle} numberOfLines={1}>{place.name}</Text>
                      <View style={styles.trendingLocation}>
                        <Feather name="map-pin" size={12} color="#A0AEC0" />
                        <Text style={styles.trendingAddress} numberOfLines={1}>{place.address}</Text>
                      </View>
                      {place.rating != null && (
                        <View style={styles.trendingFooter}>
                          <View style={styles.trendingRatingContainer}>
                            <Feather name="star" size={14} color="#ECC94B" />
                            <Text style={styles.trendingRating}>{place.rating}</Text>
                            {place.totalReviews != null && (
                              <Text style={styles.trendingReviews}>({place.totalReviews.toLocaleString()})</Text>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
          </View>
        )}

        {/* Lịch trình gợi ý */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>Lịch trình gợi ý</Text>
          <Text style={styles.viewAll}>Xem tất cả &gt;</Text>
        </View>

        {loadingTrips ? (
          <ActivityIndicator size="large" color="#4A7CFF" style={{ paddingVertical: 40 }} />
        ) : recommendedTrips.length === 0 ? (
          <Text style={styles.comingSoon}>Không tìm thấy lịch trình gợi ý nào.</Text>
        ) : (
          <View style={styles.tripsList}>
            {recommendedTrips.map((trip) => (
              <TouchableOpacity 
                key={trip._id} 
                style={styles.tripCard} 
                activeOpacity={0.9} 
                onPress={() => handleTripPress(trip._id)}
              >
                <ExpoImage
                  source={getImageSource(trip.provinceImage || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800')}
                  style={styles.tripImage}
                  contentFit="cover"
                  transition={300}
                />
                
                {/* Gradient-like Overlay for text legibility */}
                <View style={styles.tripOverlay}>
                  <View style={styles.tripBadge}>
                    <Text style={styles.tripBadgeText}>{trip.totalDays} Ngày</Text>
                  </View>
                  
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
                    <View style={styles.tripLocationRow}>
                      <Feather name="map-pin" size={10} color="#E2E8F0" />
                      <Text style={styles.tripLocationText} numberOfLines={1}>{trip.destination}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedPlace} animationType="slide" transparent={true} onRequestClose={() => setSelectedPlace(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} activeOpacity={1} onPress={() => setSelectedPlace(null)} />
          <View style={styles.modalContent}>
            {selectedPlace && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Image Gallery */}
                <View style={styles.modalGallery}>
                  {selectedPlace.photos && selectedPlace.photos.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      pagingEnabled 
                      showsHorizontalScrollIndicator={false}
                      scrollEventThrottle={16}
                      onScroll={(e) => {
                        const contentOffsetX = e.nativeEvent.contentOffset.x;
                        const currentIndex = Math.max(0, Math.floor((contentOffsetX + width / 2) / width));
                        if(currentPhotoIndex !== currentIndex) {
                          setCurrentPhotoIndex(currentIndex);
                        }
                      }}
                    >
                      {selectedPlace.photos.map((photoUrl, index) => (
                        <ExpoImage key={index} source={getImageSource(photoUrl)} style={[styles.modalImage, { width }]} contentFit="cover" />
                      ))}
                    </ScrollView>
                  ) : selectedPlace.photo ? (
                    <ExpoImage source={getImageSource(selectedPlace.photo)} style={[styles.modalImage, { width }]} contentFit="cover" />
                  ) : (
                    <View style={[styles.modalImage, styles.modalImagePlaceholder, { width }]}>
                      <Feather name="image" size={48} color="#CBD5E0" />
                    </View>
                  )}
                  {/* Close button overlay */}
                  <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedPlace(null)}>
                    <Feather name="x" size={24} color="#FFF" />
                  </TouchableOpacity>
                  {selectedPlace.photos && selectedPlace.photos.length > 1 && (
                    <View style={styles.galleryBadge}>
                      <Text style={styles.galleryBadgeText}>{currentPhotoIndex + 1}/{selectedPlace.photos.length}</Text>
                    </View>
                  )}
                </View>

                {/* Details */}
                <View style={styles.modalInfoContent}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                    <TouchableOpacity style={styles.favButton}>
                      <Feather name="heart" size={20} color="#FF4D4D" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalLocationRow}>
                    <View style={styles.iconCircle}>
                      <Feather name="map-pin" size={14} color="#4A7CFF" />
                    </View>
                    <Text style={styles.modalAddress}>{selectedPlace.address}</Text>
                  </View>

                  <View style={styles.modalStatsRow}>
                    {selectedPlace.rating != null && (
                      <View style={styles.statItem}>
                        <Feather name="star" size={16} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.statValue}>{selectedPlace.rating}</Text>
                        {selectedPlace.totalReviews != null && (
                           <Text style={styles.statLabel}>({selectedPlace.totalReviews.toLocaleString()})</Text>
                        )}
                      </View>
                    )}
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Feather name="camera" size={16} color="#4A7CFF" />
                      <Text style={styles.statValue}>{selectedPlace.photos?.length || 1}</Text>
                      <Text style={styles.statLabel}>Ảnh</Text>
                    </View>
                  </View>

                  {selectedPlace.types && selectedPlace.types.length > 0 && (
                    <View style={styles.modalTypesContainer}>
                       {selectedPlace.types.slice(0, 4).map((type, idx) => (
                         <View key={idx} style={styles.modalTypeBadge}>
                           <Text style={styles.modalTypeText}>{type.replace(/_/g, ' ')}</Text>
                         </View>
                       ))}
                    </View>
                  )}

                  <View style={styles.modalDivider} />

                  {/* Actions */}
                  {selectedPlace.mapUrl && (
                    <TouchableOpacity
                      style={styles.modalPrimaryButton}
                      activeOpacity={0.8}
                      onPress={() => Linking.openURL(selectedPlace.mapUrl)}
                    >
                      <Feather name="navigation" size={20} color="#FFF" />
                      <Text style={styles.modalPrimaryButtonText}>Chỉ đường đến đây</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.modalDivider} />
                  
                  {/* Reviews Section */}
                  <View style={styles.reviewsSection}>
                    <View style={styles.reviewsHeader}>
                      <Text style={styles.reviewsTitle}>Đánh giá từ cộng đồng</Text>
                      <TouchableOpacity>
                        <Text style={styles.writeReviewText}>Viết đánh giá</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {MOCK_REVIEWS.map((review) => (
                      <View key={review.id} style={styles.reviewItem}>
                        <View style={styles.reviewUserRow}>
                          <ExpoImage source={getImageSource(review.userAvatar)} style={styles.reviewAvatar} contentFit="cover" />
                          <View style={styles.reviewUserInfo}>
                            <Text style={styles.reviewUserName}>{review.userName}</Text>
                            <Text style={styles.reviewDate}>{review.date}</Text>
                          </View>
                          <View style={styles.reviewRatingBadge}>
                            <Feather name="star" size={10} color="#FFF" fill="#FFF" />
                            <Text style={styles.reviewRatingText}>{review.rating}</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewContent}>{review.content}</Text>
                      </View>
                    ))}
                    
                    <TouchableOpacity style={styles.viewAllReviewsButton}>
                      <Text style={styles.viewAllReviewsText}>Xem tất cả {selectedPlace.totalReviews?.toLocaleString() || ''} đánh giá</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Detail Trip Modal */}
      <Modal visible={!!selectedTripDetail || loadingTripDetail} animationType="slide" transparent={true} onRequestClose={() => setSelectedTripDetail(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} activeOpacity={1} onPress={() => {
            if (!loadingTripDetail) setSelectedTripDetail(null);
          }} />
          <View style={styles.modalContent}>
            {loadingTripDetail ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4A7CFF" />
                <Text style={{ marginTop: 16, color: '#718096', fontWeight: '500' }}>Đang tải lịch trình...</Text>
              </View>
            ) : selectedTripDetail && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header Image */}
                <View style={[styles.modalGallery, { height: 260 }]}>
                  <ExpoImage source={getImageSource(selectedTripDetail.trip.provinceImage || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800')} style={[styles.modalImage, { width, height: 260 }]} contentFit="cover" />
                  <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedTripDetail(null)}>
                    <Feather name="x" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Body Details */}
                <View style={[styles.modalInfoContent, { paddingTop: 28 }]}>
                  <View style={styles.tripDetailHeader}>
                    <Text style={styles.tripDetailTitle}>{selectedTripDetail.trip.title}</Text>
                    <View style={styles.tripDetailMeta}>
                      <View style={styles.metaBadge}>
                        <Feather name="map-pin" size={12} color="#4A7CFF" />
                        <Text style={styles.metaBadgeText}>{selectedTripDetail.trip.destination}</Text>
                      </View>
                      <View style={[styles.metaBadge, { backgroundColor: '#FFF5F5' }]}>
                        <Feather name="clock" size={12} color="#FF4D4D" />
                        <Text style={[styles.metaBadgeText, { color: '#FF4D4D' }]}>{selectedTripDetail.trip.totalDays} Ngày</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionIconBox}>
                        <Feather name="align-left" size={16} color="#4A7CFF" />
                      </View>
                      <Text style={styles.modalSectionTitle}>Giới thiệu</Text>
                    </View>
                    <Text style={styles.modalSectionText}>
                      {selectedTripDetail.trip.description || 'Khám phá hành trình tuyệt vời này với những trải nghiệm thú vị và điểm đến độc đáo.'}
                    </Text>
                  </View>

                  <View style={styles.modalDivider} />

                  {/* Plan Itinerary */}
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionIconBox}>
                        <Feather name="calendar" size={16} color="#4A7CFF" />
                      </View>
                      <Text style={styles.modalSectionTitle}>Lịch trình chi tiết</Text>
                    </View>
                    
                    {selectedTripDetail.days.length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <Feather name="info" size={24} color="#A0AEC0" />
                        <Text style={styles.emptyStateText}>Chưa có lịch trình cụ thể.</Text>
                      </View>
                    ) : (
                      <View style={styles.timelineContainer}>
                        {selectedTripDetail.days.map((dayPlan, index) => (
                          <View key={index} style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                              <View style={styles.timelineDot} />
                              {index < selectedTripDetail.days.length - 1 && <View style={styles.timelineLine} />}
                            </View>
                            <View style={styles.timelineRight}>
                              <View style={styles.dayCard}>
                                <View style={styles.dayCardHeader}>
                                  <Text style={styles.dayNumberText}>NGÀY {dayPlan.day}</Text>
                                  <Text style={styles.dayStatusText}>
                                    {dayPlan.places && dayPlan.places.length > 0 ? `${dayPlan.places.length} địa điểm` : 'Ngày tự do'}
                                  </Text>
                                </View>
                                {dayPlan.places && dayPlan.places.length > 0 && (
                                  <View style={styles.dayPlacesList}>
                                    {dayPlan.places.map((p, pIdx) => (
                                      <View key={pIdx} style={pIdx === 0 ? styles.firstPlaceItem : styles.placeItem}>
                                        <View style={styles.placeDot} />
                                        <Text style={styles.placeNameText}>{p.name || 'Địa điểm tham quan'}</Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.modalDivider} />

                  {/* Trip Reviews Section */}
                  <View style={styles.reviewsSection}>
                    <View style={styles.reviewsHeader}>
                      <Text style={styles.reviewsTitle}>Đánh giá lịch trình</Text>
                      <View style={styles.tripRatingSummary}>
                        <Feather name="star" size={14} color="#ECC94B" fill="#ECC94B" />
                        <Text style={styles.tripRatingScore}>5.0</Text>
                        <Text style={styles.tripRatingCount}>(24)</Text>
                      </View>
                    </View>
                    
                    {MOCK_TRIP_REVIEWS.map((review) => (
                      <View key={review.id} style={styles.reviewItem}>
                        <View style={styles.reviewUserRow}>
                          <ExpoImage source={getImageSource(review.userAvatar)} style={styles.reviewAvatar} contentFit="cover" />
                          <View style={styles.reviewUserInfo}>
                            <Text style={styles.reviewUserName}>{review.userName}</Text>
                            <Text style={styles.reviewDate}>{review.date}</Text>
                          </View>
                          <View style={styles.reviewRatingBadge}>
                            <Feather name="star" size={10} color="#FFF" fill="#FFF" />
                            <Text style={styles.reviewRatingText}>{review.rating}</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewContent}>{review.content}</Text>
                      </View>
                    ))}
                    
                    <TouchableOpacity style={styles.viewAllReviewsButton}>
                      <Text style={styles.viewAllReviewsText}>Xem tất cả đánh giá</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal 
        visible={isSearchModalVisible} 
        animationType="fade" 
        transparent={false}
        onRequestClose={() => setIsSearchModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
          <View style={styles.searchModalHeader}>
            <TouchableOpacity 
              style={styles.searchModalBack} 
              onPress={() => {
                setIsSearchModalVisible(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Feather name="arrow-left" size={24} color="#1A2B4A" />
            </TouchableOpacity>
            <View style={styles.searchModalInputWrapper}>
              <Feather name="search" size={18} color="#A0AEC0" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Bạn muốn đi đâu?"
                placeholderTextColor="#A0AEC0"
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Feather name="x-circle" size={18} color="#CBD5E0" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isSearchingResults ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#4A7CFF" />
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.placeId}
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.searchResultCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsSearchModalVisible(false);
                    setSelectedPlace(item);
                  }}
                >
                  <ExpoImage 
                    source={getImageSource(item.photo)} 
                    style={styles.searchResultImage} 
                    contentFit="cover"
                  />
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.searchResultLocation}>
                      <Feather name="map-pin" size={12} color="#A0AEC0" />
                      <Text style={styles.searchResultAddress} numberOfLines={1}>{item.address}</Text>
                    </View>
                    <View style={styles.searchResultFooter}>
                      <View style={styles.searchResultRating}>
                        <Feather name="star" size={12} color="#ECC94B" fill="#ECC94B" />
                        <Text style={styles.searchResultRatingText}>{item.rating || 'N/A'}</Text>
                      </View>
                      <Text style={styles.searchResultLink}>Chi tiết →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : searchQuery.length > 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <Feather name="frown" size={48} color="#CBD5E0" />
              <Text style={{ marginTop: 16, fontSize: 16, color: '#718096', textAlign: 'center' }}>
                Không tìm thấy địa điểm nào khớp với "{searchQuery}"
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <Feather name="map" size={48} color="#E2E8F0" />
              <Text style={{ marginTop: 16, fontSize: 16, color: '#A0AEC0', textAlign: 'center' }}>
                Nhập tên địa danh bạn muốn đến...
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={isNotifModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNotifModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPress={() => setIsNotifModalVisible(false)}
          />
          <View style={[styles.modalContent, { height: '80%' }]}>
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
              <View style={[styles.notifIcon, { backgroundColor: '#EBF8FF', marginBottom: 0 }]}>
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: '#718096', marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A2B4A' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsText: { fontSize: 14, fontWeight: '700', color: '#48BB78' },
  notifButton: { position: 'relative', padding: 4 },
  notifDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F56565',
    borderWidth: 1.5,
    borderColor: '#FAFBFC',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    marginBottom: 20,
  },
  searchPlaceholder: { fontSize: 15, color: '#A0AEC0' },

  // Banner
  banner: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  bannerImage: {
    resizeMode: 'cover',
  },
  bannerOverlay: {
    backgroundColor: 'rgba(26, 43, 74, 0.65)',
    padding: 24,
  },
  bannerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  bannerSubtitle: { fontSize: 14, color: '#FFFFFF', marginBottom: 16, lineHeight: 20, fontWeight: '500' },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#48BB78',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bannerButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A2B4A' },
  viewAll: { fontSize: 14, color: '#4A7CFF', fontWeight: '600' },

  comingSoon: { fontSize: 15, color: '#A0AEC0', textAlign: 'center', paddingVertical: 40 },

  // Trending
  trendingList: { paddingRight: 20 },
  trendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1A2B4A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginVertical: 10,
  },
  
  // Recommended Plans
  tripsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  tripCard: {
    width: '48%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#FFF',
    shadowColor: '#1A2B4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tripImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  tripOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 12,
  },
  tripBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tripBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tripInfo: {
    gap: 2,
  },
  tripTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tripLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripLocationText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  trendingImageWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F7FAFC',
  },
  trendingImagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingInfo: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
  },
  trendingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2B4A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  trendingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  trendingAddress: {
    fontSize: 12,
    color: '#A0AEC0',
    flex: 1,
  },
  trendingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendingRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  trendingReviews: {
    fontSize: 12,
    color: '#A0AEC0',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '92%',
    overflow: 'hidden',
  },
  modalInfoContent: {
    padding: 24,
  },
  modalGallery: {
    height: 300,
    backgroundColor: '#EDF2F7',
    position: 'relative',
  },
  modalImage: {
    height: 300,
    resizeMode: 'cover',
  },
  modalImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  galleryBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  galleryBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A2B4A',
    flex: 1,
    lineHeight: 32,
  },
  favButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAddress: {
    fontSize: 14,
    color: '#718096',
    flex: 1,
    fontWeight: '500',
  },
  modalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
  },
  statLabel: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 24,
  },
  modalTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalTypeBadge: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  modalTypeText: {
    fontSize: 12,
    color: '#4A5568',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4A7CFF',
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  modalPrimaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // Trip Detail Specifics
  tripDetailHeader: {
    marginBottom: 24,
  },
  tripDetailTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A2B4A',
    marginBottom: 12,
    lineHeight: 34,
  },
  tripDetailMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A7CFF',
  },
  modalSection: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
  },
  modalSectionText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 24,
    fontWeight: '400',
  },

  // Timeline UI
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A7CFF',
    borderWidth: 3,
    borderColor: '#EBF4FF',
    marginTop: 6,
    zIndex: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#EBF2FF',
    marginTop: -2,
    marginBottom: -6,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 24,
  },
  dayCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F5FF',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4A7CFF',
    letterSpacing: 1,
  },
  dayStatusText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  dayPlacesList: {
    gap: 10,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
  },
  firstPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E0',
  },
  placeNameText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    gap: 12,
  },
  emptyStateText: {
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: '500',
  },
  tripDayEmpty: {
    fontSize: 14,
    color: '#A0AEC0',
    fontStyle: 'italic',
    paddingLeft: 46,
  },
  tripDayPlaces: {
    fontSize: 14,
    color: '#4A5568',
    paddingLeft: 46,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 90, 
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A7CFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 9999,
  },
  // Search Modal Styles
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  searchModalBack: {
    padding: 4,
    marginRight: 8,
  },
  searchModalInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchModalInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A2B4A',
    fontWeight: '500',
    padding: 0,
  },
  searchResultCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  searchResultImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B4A',
    marginBottom: 4,
  },
  searchResultLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  searchResultAddress: {
    fontSize: 12,
    color: '#718096',
    flex: 1,
  },
  searchResultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchResultRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D69E2E',
  },
  searchResultLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A7CFF',
  },

  // Reviews Styles
  reviewsSection: { marginTop: 8 },
  reviewsHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  reviewsTitle: { fontSize: 18, fontWeight: '700', color: '#1A2B4A' },
  writeReviewText: { fontSize: 14, color: '#4A7CFF', fontWeight: '600' },
  reviewItem: { 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  reviewUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  reviewUserInfo: { flex: 1 },
  reviewUserName: { fontSize: 14, fontWeight: '600', color: '#1A2B4A' },
  reviewDate: { fontSize: 12, color: '#A0AEC0' },
  reviewRatingBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#ECC94B', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  reviewRatingText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  reviewContent: { fontSize: 14, color: '#4A5568', lineHeight: 20 },
  viewAllReviewsButton: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  viewAllReviewsText: { fontSize: 14, color: '#718096', fontWeight: '600' },
  
  tripRatingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripRatingScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B4A',
  },
  tripRatingCount: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  // Notification Styles
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
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
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
    backgroundColor: '#4A7CFF',
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
