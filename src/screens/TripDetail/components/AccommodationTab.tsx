import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,

} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip, TripDay } from '@/services/tripService';
import { accommodationService, Accommodation } from '@/services/accommodationService';
import { bookingService } from '@/services/bookingService';
import StayDatePickerModal from './StayDatePickerModal';
import AccommodationDetailModal from './AccommodationDetailModal';
import WriteReviewModal from './WriteReviewModal';
import { useConfirm } from '@/components/ConfirmProvider';

const BRAND = '#4A7CFF';

interface AccommodationTabProps {
  trip: Trip;
  days: TripDay[];
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + '₫';
}

export default function AccommodationTab({ trip, days }: AccommodationTabProps) {
  const { alert: showAlert } = useConfirm();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState<Accommodation | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchAccommodations = useCallback(async () => {
    try {
      setLoading(true);
      // Lọc theo thành phố của trip (destination)
      const city = trip.destination || trip.province || '';
      const data = await accommodationService.getAll(city);
      setAccommodations(data);
    } catch (e) {
      console.error('Error fetching accommodations:', e);
    } finally {
      setLoading(false);
    }
  }, [trip.destination, trip.province]);

  useEffect(() => { fetchAccommodations(); }, [fetchAccommodations]);

  // Open detail modal
  const handleOpenDetail = (hotel: Accommodation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedHotel(hotel);
    setDetailVisible(true);
  };

  // Book flow: open date picker
  const handleBook = (hotel: Accommodation) => {
    setSelectedHotel(hotel);
    setDetailVisible(false);
    setTimeout(() => setCalendarVisible(true), 300);
  };

  // Write review
  const handleWriteReview = (hotel: Accommodation) => {
    setSelectedHotel(hotel);
    setDetailVisible(false);
    setTimeout(() => setReviewVisible(true), 300);
  };

  const handleDateConfirm = async (checkIn: Date, checkOut: Date) => {
    setCalendarVisible(false);
    if (!selectedHotel || !selectedHotel.rooms || selectedHotel.rooms.length === 0) {
      showAlert('Lỗi', 'Khách sạn chưa có loại phòng nào', 'error');
      return;
    }

    setBookingLoading(true);

    try {
      const formatDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const checkInStr = formatDate(checkIn);
      const checkOutStr = formatDate(checkOut);

      // Use the first room type for booking
      const roomType = selectedHotel.rooms[0];

      // 1. Check availability first
      const availability = await bookingService.checkAvailability({
        hotelId: selectedHotel.hotelId,
        roomTypeId: roomType.roomTypeId,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        roomCount: 1,
      });

      if (!availability || !availability.available) {
        showAlert(
          'Hết phòng',
          availability?.message || 'Không đủ phòng trong khoảng thời gian này',
          'warning',
        );
        return;
      }

      // 2. Create booking
      const result = await bookingService.createBooking({
        hotelId: selectedHotel.hotelId,
        roomTypeId: roomType.roomTypeId,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        roomCount: 1,
        guestInfo: {
          fullName: 'Khách hàng OwnTrip',
          phone: '0900000000',
          email: 'guest@owntrip.vn',
          specialRequests: '',
        },
        paymentMethod: 'balance',
      });

      if (result.success) {
        const nights = availability.nights;
        const total = availability.totalPrice;
        showAlert(
          '🎉 Đặt phòng thành công!',
          `${selectedHotel.name}\nMã đặt phòng: ${result.data?.bookingId}\n${nights} đêm · ${formatCurrency(total)}`,
          'success',
        );
      } else {
        showAlert('Lỗi đặt phòng', result.message, 'error');
      }
    } catch (error) {
      console.error('Booking error:', error);
      showAlert('Lỗi', 'Đã xảy ra lỗi khi đặt phòng', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const renderHotelCard = (item: Accommodation) => {
    const hasImage = item.primaryImage && !imgErrors[item.hotelId];
    const displayAmenities = item.amenities?.slice(0, 3) ?? [];
    const extraCount = (item.amenities?.length ?? 0) - 3;

    // Find cheapest room
    const cheapestRoom = item.rooms?.length
      ? item.rooms.reduce((min, r) => {
          const minPrice = min.basePrice || min.price || 0;
          const rPrice = r.basePrice || r.price || 0;
          return rPrice < minPrice ? r : min;
        }, item.rooms[0])
      : null;

    return (
      <TouchableOpacity
        key={item.hotelId}
        style={styles.hotelCard}
        activeOpacity={0.85}
        onPress={() => handleOpenDetail(item)}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          {hasImage ? (
            <Image
              source={{ uri: item.primaryImage }}
              style={styles.hotelImage}
              onError={() => handleImageError(item.hotelId)}
            />
          ) : (
            <View style={[styles.hotelImage, styles.imagePlaceholder]}>
              <Feather name="image" size={32} color="#D1D5DB" />
            </View>
          )}

          {/* Rating badge */}
          {item.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
              <Feather name="star" size={10} color="rgba(255,255,255,0.9)" />
            </View>
          )}

          {/* Tags badge */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.tags[0]}</Text>
            </View>
          )}

          {/* Favorite btn */}
          <TouchableOpacity style={styles.favBtn} activeOpacity={0.7}>
            <Feather name="heart" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          {/* Stars */}
          <View style={styles.starsRow}>
            {Array.from({ length: item.starRating || 0 }).map((_, i) => (
              <Feather key={i} name="star" size={12} color="#F59E0B" />
            ))}
          </View>

          <Text style={styles.hotelName} numberOfLines={1}>{item.name}</Text>

          {/* Address */}
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={12} color="#9CA3AF" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.address?.fullAddress || ''}{item.address?.city ? `, ${item.address.city}` : ''}
            </Text>
          </View>

          {/* Reviews count */}
          <View style={styles.metaRow}>
            {item.reviewsCount > 0 && (
              <View style={styles.metaItem}>
                <Feather name="message-square" size={11} color="#9CA3AF" />
                <Text style={styles.metaText}>{item.reviewsCount.toLocaleString()} đánh giá</Text>
              </View>
            )}
          </View>

          {/* Amenities chips */}
          {displayAmenities.length > 0 && (
            <View style={styles.amenitiesRow}>
              {displayAmenities.map((a, i) => (
                <View key={i} style={styles.amenityChip}>
                  <Text style={styles.amenityText}>{a}</Text>
                </View>
              ))}
              {extraCount > 0 && (
                <Text style={styles.amenityMore}>+{extraCount}</Text>
              )}
            </View>
          )}

          {/* Price + view detail */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceValue}>
                {cheapestRoom ? `Từ ${formatCurrency(cheapestRoom.basePrice || cheapestRoom.price || 0)}` : formatCurrency(item.pricePerNight)}
              </Text>
              <Text style={styles.priceUnit}>/đêm</Text>
            </View>
            <View style={styles.viewDetailBtn}>
              <Text style={styles.viewDetailText}>Xem chi tiết</Text>
              <Feather name="chevron-right" size={14} color={BRAND} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading || bookingLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>
          {bookingLoading ? 'Đang xử lý đặt phòng...' : 'Đang tìm khách sạn...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.listContent]}>
      {accommodations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="home" size={44} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Không tìm thấy khách sạn</Text>
          <Text style={styles.emptySubtitle}>
            Chưa có nơi lưu trú cho khu vực này. Vui lòng thử lại sau.
          </Text>
        </View>
      ) : (
        accommodations.map((item) => renderHotelCard(item))
      )}

      {/* Detail Modal */}
      <AccommodationDetailModal
        visible={detailVisible}
        hotel={selectedHotel}
        trip={trip}
        days={days}
        onClose={() => { setDetailVisible(false); setSelectedHotel(null); }}
        onBook={handleBook}
        onWriteReview={handleWriteReview}
      />

      {/* Write Review Modal */}
      <WriteReviewModal
        visible={reviewVisible}
        hotel={selectedHotel}
        onClose={() => { setReviewVisible(false); }}
        onReviewSubmitted={() => {
          // Refresh to show new review
          if (selectedHotel) {
            setDetailVisible(true);
          }
        }}
      />

      {/* Calendar Modal */}
      {selectedHotel && (
        <StayDatePickerModal
          visible={calendarVisible}
          onClose={() => { setCalendarVisible(false); setSelectedHotel(null); }}
          hotelName={selectedHotel.name}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          onConfirm={handleDateConfirm}
        />
      )}
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },

  // Loading
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12,
    paddingVertical: 80,
  },
  loadingText: { fontSize: 14, color: '#9CA3AF' },

  // Empty
  emptyContainer: {
    alignItems: 'center', gap: 8, paddingVertical: 80,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF' },

  // Hotel card
  hotelCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },

  imageContainer: { position: 'relative' },
  hotelImage: { width: '100%', height: 200, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },

  ratingBadge: {
    position: 'absolute', left: 12, bottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BRAND, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  ratingValue: { fontSize: 14, fontWeight: '800', color: '#FFF' },

  categoryBadge: {
    position: 'absolute', left: 12, top: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  categoryText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  favBtn: {
    position: 'absolute', right: 12, top: 12,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },

  infoSection: { padding: 14, gap: 6 },

  starsRow: { flexDirection: 'row', gap: 2 },

  hotelName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressText: { fontSize: 13, color: '#6B7280', flex: 1 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  amenitiesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  amenityChip: {
    backgroundColor: '#F3F4F6', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  amenityText: { fontSize: 11, fontWeight: '500', color: '#6B7280' },
  amenityMore: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },

  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 6,
  },
  priceValue: { fontSize: 18, fontWeight: '800', color: BRAND },
  priceUnit: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  viewDetailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  viewDetailText: { fontSize: 13, fontWeight: '600', color: BRAND },
});
