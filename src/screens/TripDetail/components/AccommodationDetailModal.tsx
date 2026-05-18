import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Linking,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather, FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import {
  Accommodation,
  AccommodationReview,
  accommodationService,
  IRoomType,
} from '@/services/accommodationService';
import { Trip, TripDay } from '@/services/tripService';
import { placesService } from '@/services/placesService';
import { generateAccommodationMapHtml } from './accommodation/map-html';
import { bookingService } from '@/services/bookingService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND = '#4A7CFF';

interface AccommodationDetailModalProps {
  visible: boolean;
  hotel: Accommodation | null;
  trip: Trip;
  days: TripDay[];
  onClose: () => void;
  onBook: (hotel: Accommodation, room: IRoomType) => void;
  onWriteReview: (hotel: Accommodation) => void;
  /** When true, CTA shows "Hủy phòng" instead of "Đặt phòng" */
  isBooked?: boolean;
  onCancelBooking?: (hotel: Accommodation) => void;
}

const STAR_LABELS = ['', 'Tệ', 'Trung bình', 'Tốt', 'Rất tốt', 'Tuyệt vời'];

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + '₫';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Hôm nay';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return `${Math.floor(days / 30)} tháng trước`;
}

export default function AccommodationDetailModal({
  visible,
  hotel,
  trip,
  days,
  onClose,
  onBook,
  onWriteReview,
  isBooked = false,
  onCancelBooking,
}: AccommodationDetailModalProps) {
  const [reviews, setReviews] = useState<AccommodationReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedRoomImages, setSelectedRoomImages] = useState<string[] | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<
    { name: string; latitude: number; longitude: number }[]
  >([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [locatingUser, setLocatingUser] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomAvailability, setRoomAvailability] = useState<
    Record<string, { total: number; booked: number }>
  >({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (visible && hotel) {
      setActiveImageIndex(0);
      setLiked(false);
      setShowAllAmenities(false);
      setSelectedRoomId(null);
      fetchReviews(hotel.id || hotel.hotelId);
      fetchRoomAvailability(hotel);
    }
  }, [visible, hotel]);

  // Fetch room availability from inventory
  const fetchRoomAvailability = async (h: Accommodation) => {
    try {
      setLoadingAvailability(true);
      const hotelId = h.id || h.hotelId;
      // Use today + 1 day as default check period
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      const startStr = today.toISOString().split('T')[0];
      const endStr = tomorrow.toISOString().split('T')[0];

      const result = await bookingService.getInventory(hotelId, startStr, endStr);
      if (result?.data) {
        const availability: Record<string, { total: number; booked: number }> = {};
        result.data.forEach((inv: any) => {
          if (!availability[inv.roomTypeId]) {
            availability[inv.roomTypeId] = { total: inv.totalInventory, booked: inv.bookedCount };
          } else {
            // Use the max booked across dates for the period
            const existing = availability[inv.roomTypeId];
            if (inv.bookedCount > existing.booked) {
              existing.booked = inv.bookedCount;
            }
            existing.total = inv.totalInventory;
          }
        });
        setRoomAvailability(availability);
      }
    } catch (error) {
      console.error('Error fetching room availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const getAmenityIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('wifi')) return 'wifi';
    if (n.includes('bể bơi') || n.includes('pool')) return 'droplet';
    if (n.includes('gym') || n.includes('thể hình')) return 'activity';
    if (n.includes('spa') || n.includes('massage')) return 'heart';
    if (n.includes('nhà hàng') || n.includes('ăn')) return 'coffee';
    if (n.includes('đỗ xe') || n.includes('parking')) return 'truck';
    if (n.includes('điều hòa') || n.includes('ac')) return 'wind';
    if (n.includes('tivi') || n.includes('tv')) return 'tv';
    return 'check-circle';
  };

  const openImageViewer = (images: string[]) => {
    setSelectedRoomImages(images);
    setIsImageViewerVisible(true);
  };

  const fetchReviews = async (hotelId: string) => {
    setLoadingReviews(true);
    const data = await accommodationService.getReviews(hotelId);
    setReviews(data);
    setLoadingReviews(false);
  };

  // Extract places from trip days for map
  const itineraryPlaces = useMemo(() => {
    if (!days) return [];
    const places: { name: string; latitude: number; longitude: number }[] = [];
    days.forEach((day) => {
      day.places?.forEach((p: any) => {
        if (p.latitude && p.longitude) {
          places.push({
            name: p.name || p.placeName || '',
            latitude: typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude,
            longitude: typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude,
          });
        }
      });
    });
    return places;
  }, [days]);

  // Auto-fetch nearby POIs when itinerary places are empty
  useEffect(() => {
    if (!visible || !hotel) return;
    if (itineraryPlaces.length > 0) {
      setNearbyPlaces([]);
      return;
    }
    // Fetch tourist_attraction near hotel
    (async () => {
      try {
        const lat = hotel.latitude ?? hotel.address?.coordinates?.lat ?? 0;
        const lng = hotel.longitude ?? hotel.address?.coordinates?.lng ?? 0;
        const results = await placesService.searchNearby({
          lat,
          lng,
          radius: 3000,
          type: 'tourist_attraction',
        });
        setNearbyPlaces(
          results.slice(0, 5).map((p) => ({
            name: p.name,
            latitude: p.latitude,
            longitude: p.longitude,
          })),
        );
      } catch {
        setNearbyPlaces([]);
      }
    })();
  }, [visible, hotel, itineraryPlaces.length]);

  // Merge: itinerary places take priority, fallback to nearby
  const placesForMap = useMemo(() => {
    return itineraryPlaces.length > 0 ? itineraryPlaces : nearbyPlaces;
  }, [itineraryPlaces, nearbyPlaces]);

  const mapHtml = useMemo(() => {
    if (!hotel) return '';
    return generateAccommodationMapHtml(hotel, placesForMap, BRAND);
  }, [hotel, placesForMap]);

  const handleCall = () => {
    if (hotel?.phone) {
      Linking.openURL(`tel:${hotel.phone}`);
    }
  };

  const handleWebsite = () => {
    if (hotel?.website) {
      Linking.openURL(hotel.website);
    }
  };

  const handleDirections = () => {
    if (!hotel) return;
    const lat = hotel.latitude;
    const lng = hotel.longitude;
    const label = encodeURIComponent(hotel.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  // Handle My Location — native button
  const handleMyLocation = useCallback(async () => {
    try {
      setLocatingUser(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      webViewRef.current?.injectJavaScript(
        `showUserLocation(${loc.coords.latitude}, ${loc.coords.longitude}); true;`,
      );
    } catch {
      // ignore
    } finally {
      setLocatingUser(false);
    }
  }, []);

  // Handle FitAll — native button
  const handleFitAll = useCallback(() => {
    webViewRef.current?.injectJavaScript(`fitAllBounds(); true;`);
  }, []);

  // Handle WebView messages (my-location from HTML, marker taps)
  const handleWebViewMessage = useCallback(
    async (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'requestLocation') {
          handleMyLocation();
        }
      } catch {}
    },
    [handleMyLocation],
  );

  if (!hotel) return null;

  const amenitiesDisplay = showAllAmenities ? hotel.amenities : hotel.amenities?.slice(0, 6) ?? [];
  const hasMoreAmenities = (hotel.amenities?.length ?? 0) > 6;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : hotel.rating?.toFixed(1) ?? '0';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Handle */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBackBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="arrow-left" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết khách sạn</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLiked(!liked);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="heart" size={20} color={liked ? '#EF4444' : '#9CA3AF'} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* ===== Hero Image Slider ===== */}
          <View style={styles.heroContainer}>
            {hotel.images && hotel.images.length > 0 ? (
              <View>
                <FlatList
                  data={hotel.images}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => {
                    const offset = e.nativeEvent.contentOffset.x;
                    const index = Math.round(offset / SCREEN_WIDTH);
                    setActiveImageIndex(index);
                  }}
                  scrollEventThrottle={16}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item }) => (
                    <Image source={{ uri: item }} style={styles.heroImage} />
                  )}
                />
                {/* Pagination Dots */}
                {hotel.images.length > 1 && (
                  <View style={styles.paginationRow}>
                    {hotel.images.map((_, i) => (
                      <View
                        key={i}
                        style={[styles.dot, activeImageIndex === i && styles.activeDot]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <Feather name="image" size={48} color="#D1D5DB" />
              </View>
            )}
            {/* Star + Category overlay */}
            <View style={styles.heroOverlay}>
              <View style={styles.starRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <FontAwesome
                    key={i}
                    name="star"
                    size={14}
                    color={i < (hotel.starRating || 0) ? '#F59E0B' : '#D1D5DB'}
                  />
                ))}
              </View>
              {hotel.tags && hotel.tags.length > 0 ? (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{hotel.tags[0]}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ===== Info Section ===== */}
          <View style={styles.infoSection}>
            <Text style={styles.hotelName}>{hotel.name}</Text>

            <View style={styles.infoRow}>
              <Feather name="map-pin" size={14} color="#9CA3AF" />
              <Text style={styles.infoText}>
                {hotel.address?.fullAddress || ''}
                {hotel.address?.city ? `, ${hotel.address.city}` : ''}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingValue}>{avgRating}</Text>
                <Feather name="star" size={12} color="#FFF" />
              </View>
              <Text style={styles.ratingLabel}>
                {STAR_LABELS[Math.round(Number(avgRating))] || ''} · (
                {hotel.reviewsCount?.toLocaleString() ?? reviews.length} đánh giá)
              </Text>
            </View>
          </View>

          {/* ===== Amenities Grid ===== */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tiện ích khách sạn</Text>
                <TouchableOpacity onPress={() => setShowAllAmenities(!showAllAmenities)}>
                  <Text style={styles.seeAllText}>
                    {showAllAmenities ? 'Thu gọn' : `Xem tất cả (${hotel.amenities.length})`}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.amenitiesGrid}>
                {(showAllAmenities ? hotel.amenities : hotel.amenities.slice(0, 8)).map(
                  (item, index) => (
                    <View key={index} style={styles.amenityItem}>
                      <View style={styles.amenityIconCircle}>
                        <Feather name={getAmenityIcon(item)} size={18} color={BRAND} />
                      </View>
                      <Text style={styles.amenityText} numberOfLines={1}>
                        {item}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          )}

          {/* ===== Check-in/out + Contact ===== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin</Text>

            <View style={styles.infoGrid}>
              {hotel.checkIn && (
                <View style={styles.infoItem}>
                  <Feather name="log-in" size={16} color={BRAND} />
                  <View>
                    <Text style={styles.infoItemLabel}>Nhận phòng</Text>
                    <Text style={styles.infoItemValue}>{hotel.checkIn}</Text>
                  </View>
                </View>
              )}
              {hotel.checkOut && (
                <View style={styles.infoItem}>
                  <Feather name="log-out" size={16} color={BRAND} />
                  <View>
                    <Text style={styles.infoItemLabel}>Trả phòng</Text>
                    <Text style={styles.infoItemValue}>{hotel.checkOut}</Text>
                  </View>
                </View>
              )}
            </View>

            {hotel.phone && (
              <TouchableOpacity style={styles.contactRow} onPress={handleCall} activeOpacity={0.7}>
                <Feather name="phone" size={16} color={BRAND} />
                <Text style={styles.contactText}>{hotel.phone}</Text>
                <Feather name="external-link" size={12} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {hotel.website && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={handleWebsite}
                activeOpacity={0.7}
              >
                <Feather name="globe" size={16} color={BRAND} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {hotel.website}
                </Text>
                <Feather name="external-link" size={12} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* ===== Room Types ===== */}
          {hotel.rooms && hotel.rooms.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Loại phòng</Text>
              {hotel.rooms.map((room) => {
                const isSelected = selectedRoomId === room.roomTypeId;
                const avail = roomAvailability[room.roomTypeId];
                const availableRooms = avail ? avail.total - avail.booked : -1; // -1 = unknown
                const isSoldOut = avail ? availableRooms <= 0 : false;
                return (
                  <TouchableOpacity
                    key={room.roomTypeId}
                    style={[
                      styles.roomCard,
                      isSelected && styles.roomCardSelected,
                      isSoldOut && styles.roomCardSoldOut,
                    ]}
                    activeOpacity={isSoldOut ? 1 : 0.9}
                    onPress={() => {
                      if (isSoldOut) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedRoomId(room.roomTypeId);
                    }}
                  >
                    {room.images && room.images.length > 0 ? (
                      <View style={styles.roomImageContainer}>
                        <Image
                          source={{ uri: room.images[0] }}
                          style={[styles.roomCardImage, isSoldOut && { opacity: 0.5 }]}
                        />
                        {room.images.length > 1 && (
                          <View style={styles.imageCountBadge}>
                            <Text style={styles.imageCountText}>+{room.images.length - 1}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={[styles.roomCardImage, styles.heroPlaceholder]}>
                        <Feather name="image" size={20} color="#D1D5DB" />
                      </View>
                    )}
                    <View style={[styles.roomInfo, isSoldOut && { opacity: 0.5 }]}>
                      <Text style={styles.roomName}>{room.name}</Text>
                      <View style={styles.roomMeta}>
                        <Feather name="users" size={13} color="#6B7280" />
                        <Text style={styles.roomCapacity}>{room.capacity} khách</Text>
                        {(room.totalRooms ?? 0) > 0 && (
                          <>
                            <Text style={styles.roomCapacity}> · </Text>
                            <Feather name="layers" size={12} color="#6B7280" />
                            <Text style={styles.roomCapacity}>{room.totalRooms} phòng</Text>
                          </>
                        )}
                      </View>
                      {/* Room Availability Badge */}
                      {avail ? (
                        <View
                          style={[
                            styles.availBadge,
                            isSoldOut ? styles.availBadgeSoldOut : styles.availBadgeAvailable,
                          ]}
                        >
                          <View
                            style={[
                              styles.availDot,
                              isSoldOut ? styles.availDotSoldOut : styles.availDotAvailable,
                            ]}
                          />
                          <Text style={[styles.availText, isSoldOut && styles.availTextSoldOut]}>
                            {isSoldOut ? 'Hết phòng' : `Còn ${availableRooms} phòng`}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            if (room.images && room.images.length > 0) openImageViewer(room.images);
                          }}
                        >
                          <Text style={styles.viewDetailText}>Xem chi tiết ảnh</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.roomRight}>
                      <Text style={[styles.roomPrice, isSoldOut && { color: '#9CA3AF' }]}>
                        {formatCurrency(room.basePrice || room.price || 0)}
                      </Text>
                      <Text style={styles.roomPriceUnit}>/đêm</Text>
                      {isSelected && !isSoldOut && (
                        <View style={styles.selectedBadge}>
                          <Feather name="check" size={12} color="#FFF" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ===== Map Section ===== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vị trí</Text>
            <View style={styles.mapContainer}>
              {mapLoading && (
                <View style={styles.mapLoadingOverlay}>
                  <ActivityIndicator size="small" color={BRAND} />
                  <Text style={styles.mapLoadingText}>Đang tải bản đồ...</Text>
                </View>
              )}
              <WebView
                ref={webViewRef}
                source={{ html: mapHtml }}
                style={styles.mapWebview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
                androidLayerType="software"
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                onMessage={handleWebViewMessage}
                onLoadEnd={() => setMapLoading(false)}
                startInLoadingState={false}
              />

              {/* Floating My Location button */}
              <TouchableOpacity
                style={styles.mapFloatingBtn}
                onPress={handleMyLocation}
                activeOpacity={0.8}
                disabled={locatingUser}
              >
                {locatingUser ? (
                  <ActivityIndicator size="small" color={BRAND} />
                ) : (
                  <Feather name="crosshair" size={16} color={BRAND} />
                )}
              </TouchableOpacity>

              {/* Floating FitAll button */}
              <TouchableOpacity
                style={[styles.mapFloatingBtn, styles.mapFloatingBtnSecond]}
                onPress={handleFitAll}
                activeOpacity={0.8}
              >
                <Feather name="maximize-2" size={16} color={BRAND} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.directionsBtn}
              onPress={handleDirections}
              activeOpacity={0.7}
            >
              <Feather name="navigation" size={16} color={BRAND} />
              <Text style={styles.directionsBtnText}>Chỉ đường trên bản đồ</Text>
            </TouchableOpacity>
            {placesForMap.length > 0 && (
              <Text style={styles.mapHint}>
                📍 {placesForMap.length} điểm tham quan được hiển thị trên bản đồ
              </Text>
            )}
          </View>

          {/* ===== Description ===== */}
          {hotel.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mô tả</Text>
              <Text style={styles.descriptionText}>{hotel.description}</Text>
            </View>
          )}

          {/* ===== Reviews Section ===== */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Đánh giá</Text>
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() => onWriteReview(hotel)}
                activeOpacity={0.7}
              >
                <Feather name="edit-3" size={14} color={BRAND} />
                <Text style={styles.writeReviewText}>Viết đánh giá</Text>
              </TouchableOpacity>
            </View>

            {loadingReviews ? (
              <ActivityIndicator color={BRAND} style={{ paddingVertical: 20 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Feather name="message-square" size={32} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
                <Text style={styles.emptySubtext}>Hãy là người đầu tiên đánh giá!</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Image
                      source={{ uri: review.userAvatar || 'https://i.pravatar.cc/100' }}
                      style={styles.reviewAvatar}
                    />
                    <View style={styles.reviewMeta}>
                      <Text style={styles.reviewUserName}>{review.userName}</Text>
                      <Text style={styles.reviewDate}>{timeAgo(review.createdAt)}</Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Feather key={i} name="star" size={11} color="#F59E0B" />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  {review.images && review.images.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.reviewImagesScroll}
                    >
                      {review.images.map((img, i) => (
                        <Image key={i} source={{ uri: img }} style={styles.reviewImage} />
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* ===== CTA Footer ===== */}
        <View style={styles.footer}>
          {isBooked ? (
            <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.bookCTA, { backgroundColor: '#FEE2E2', flex: 1 }]}
                activeOpacity={0.8}
                onPress={() => {
                  if (onCancelBooking) onCancelBooking(hotel);
                }}
              >
                <Feather name="trash-2" size={18} color="#EF4444" />
                <Text style={[styles.bookCTAText, { color: '#EF4444' }]}>Hủy phòng</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.footerPriceSection}>
                <Text style={styles.footerPrice}>
                  {(() => {
                    const room = hotel.rooms.find(r => r.roomTypeId === selectedRoomId);
                    const displayPrice = room ? (room.basePrice || room.price || 0) : hotel.pricePerNight;
                    return displayPrice > 0 ? formatCurrency(displayPrice) : 'Liên hệ';
                  })()}
                </Text>
                <Text style={styles.footerPriceUnit}>/đêm</Text>
              </View>
              <TouchableOpacity
                style={[styles.bookCTA, !selectedRoomId && styles.bookCTADisabled]}
                activeOpacity={0.8}
                onPress={() => {
                  const room = hotel.rooms.find(r => r.roomTypeId === selectedRoomId);
                  if (room) {
                    onBook(hotel, room);
                  } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    alert('Vui lòng chọn loại phòng trước khi đặt.');
                  }
                }}
              >
                <Feather name="calendar" size={18} color="#FFF" />
                <Text style={styles.bookCTADisabled ? styles.bookCTAText : styles.bookCTAText}>{selectedRoomId ? 'Đặt phòng ngay' : 'Chọn loại phòng'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ===== Full Screen Image Viewer Modal ===== */}
      <Modal visible={isImageViewerVisible} transparent={false} animationType="fade">
        <View style={styles.viewerContainer}>
          <TouchableOpacity
            style={styles.closeViewerBtn}
            onPress={() => setIsImageViewerVisible(false)}
          >
            <Feather name="x" size={28} color="#FFF" />
          </TouchableOpacity>

          <FlatList
            data={selectedRoomImages}
            horizontal
            pagingEnabled
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View style={styles.viewerSlide}>
                <Image source={{ uri: item }} style={styles.viewerImage} resizeMode="contain" />
              </View>
            )}
          />
        </View>
      </Modal>
    </Modal>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  handleBar: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', flex: 1, textAlign: 'center' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: 36,
    justifyContent: 'flex-end',
  },

  scroll: { paddingBottom: 20 },

  // Hero
  heroContainer: { position: 'relative', width: SCREEN_WIDTH },
  heroImage: { width: SCREEN_WIDTH, height: 260, backgroundColor: '#F3F4F6' },
  paginationRow: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeDot: {
    width: 18,
    backgroundColor: '#FFF',
  },
  heroPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  heroOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starRow: { flexDirection: 'row', gap: 2 },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // Info
  infoSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 6 },
  hotelName: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#6B7280', flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingValue: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  ratingLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  // Section
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  // Amenities
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: { fontSize: 13, color: BRAND, fontWeight: '600' },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    width: (SCREEN_WIDTH - 64) / 4,
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  amenityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityText: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Info grid
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  infoItemLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  infoItemValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  // Contact
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  contactText: { fontSize: 14, color: BRAND, fontWeight: '500', flex: 1 },

  // Room card
  roomCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  roomCardSelected: {
    borderColor: BRAND,
    backgroundColor: '#F0F7FF',
    borderWidth: 2,
  },
  roomCardSoldOut: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  availBadgeAvailable: {
    backgroundColor: '#F0FDF4',
  },
  availBadgeSoldOut: {
    backgroundColor: '#FEF2F2',
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availDotAvailable: {
    backgroundColor: '#22C55E',
  },
  availDotSoldOut: {
    backgroundColor: '#EF4444',
  },
  availText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
  },
  availTextSoldOut: {
    color: '#DC2626',
  },
  roomImageContainer: { position: 'relative' },
  roomCardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageCountText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  bookCTADisabled: {
    backgroundColor: '#9CA3AF',
  },
  selectedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  roomInfo: { flex: 1, gap: 2 },
  roomName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roomCapacity: { fontSize: 12, color: '#6B7280' },
  viewDetailText: { fontSize: 11, color: BRAND, fontWeight: '600', marginTop: 4 },
  roomRight: { alignItems: 'flex-end', marginLeft: 8 },
  roomPrice: { fontSize: 16, fontWeight: '700', color: BRAND },
  roomPriceUnit: { fontSize: 11, color: '#9CA3AF' },

  // Image Viewer
  viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  closeViewerBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  viewerSlide: { width: SCREEN_WIDTH, height: '100%', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '80%' },

  // Map
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  mapWebview: { flex: 1 },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 8,
  },
  mapLoadingText: { fontSize: 12, color: '#9CA3AF' },
  mapFloatingBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  mapFloatingBtnSecond: {
    bottom: 62,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
  },
  directionsBtnText: { fontSize: 14, fontWeight: '600', color: BRAND },
  mapHint: { fontSize: 12, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },

  // Description
  descriptionText: { fontSize: 14, color: '#6B7280', lineHeight: 22 },

  // Reviews
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
  },
  writeReviewText: { fontSize: 13, fontWeight: '600', color: BRAND },
  emptyReviews: { alignItems: 'center', gap: 6, paddingVertical: 24 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
  emptySubtext: { fontSize: 13, color: '#D1D5DB' },

  reviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  reviewMeta: { flex: 1 },
  reviewUserName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  reviewDate: { fontSize: 11, color: '#9CA3AF' },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewComment: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  reviewImagesScroll: { marginTop: 10 },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    ...Platform.select({
      ios: { paddingBottom: 30 },
    }),
  },
  footerPriceSection: { flexDirection: 'row', alignItems: 'baseline' },
  footerPrice: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  footerPriceUnit: { fontSize: 13, color: '#9CA3AF', marginLeft: 2 },
  bookCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  bookCTAText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  cancelCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelCTAText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});
