import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Linking,
  Modal,
  FlatList,

} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip, TripDay, Destination, tripService } from '@/services/tripService';
import { accommodationService, Accommodation } from '@/services/accommodationService';
import StayDatePickerModal from './StayDatePickerModal';
import AccommodationDetailModal from './AccommodationDetailModal';
import WriteReviewModal from './WriteReviewModal';
import { useConfirm } from '@/components/ConfirmProvider';

const BRAND = '#4A7CFF';
const BRAND_LIGHT = '#EBF5FF';

// ===== HELPERS =====
function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${months[e.getMonth()]}, ${e.getFullYear()}`;
  }
  return `${s.getDate()} ${months[s.getMonth()]}, ${s.getFullYear()} – ${e.getDate()} ${months[e.getMonth()]}, ${e.getFullYear()}`;
}

function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getTripStatus(startDate: string, endDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now > end) return 'Đã hoàn thành';
  if (now >= start) return 'Đang diễn ra';
  const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return `Còn ${daysUntil} ngày`;
}

// ===== SECTION HEADER (matches reference) =====
function SectionHeader({
  icon,
  title,
  right,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIconBox}>
          <Feather name={icon} size={14} color={BRAND} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

// ===== MAIN COMPONENT =====
export default function SummaryTab({ trip, days }: { trip: Trip; days: TripDay[] }) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDest, setLoadingDest] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Accommodation state
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [hotels, setHotels] = useState<Accommodation[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Accommodation | null>(null);
  const [bookedHotel, setBookedHotel] = useState<Accommodation | null>(null);
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await tripService.getDestinations(trip._id);
        setDestinations(data);
      } catch (e) {
        console.error('Error fetching destinations:', e);
      } finally {
        setLoadingDest(false);
      }
    };
    fetch();
  }, [trip._id]);

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  // Accommodation handlers
  const openHotelModal = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHotelModalVisible(true);
    setLoadingHotels(true);
    try {
      const data = await accommodationService.getAll();
      setHotels(data);
    } catch (e) {
      console.error('Error fetching hotels:', e);
    } finally {
      setLoadingHotels(false);
    }
  }, []);

  const handleSelectHotel = (hotel: Accommodation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedHotel(hotel);
    setHotelModalVisible(false);
    setTimeout(() => setDetailVisible(true), 300);
  };

  const handleBookFromDetail = (hotel: Accommodation) => {
    setSelectedHotel(hotel);
    setDetailVisible(false);
    setTimeout(() => setCalendarVisible(true), 300);
  };

  const handleWriteReview = (hotel: Accommodation) => {
    setSelectedHotel(hotel);
    setDetailVisible(false);
    setTimeout(() => setReviewVisible(true), 300);
  };

  const handleDateConfirm = (checkIn: Date, checkOut: Date) => {
    setCalendarVisible(false);
    setBookedHotel(selectedHotel);
    setCheckInDate(checkIn);
    setCheckOutDate(checkOut);
    setSelectedHotel(null);
  };

  const { confirmDelete } = useConfirm();

  const handleRemoveAccommodation = async () => {
    const confirmed = await confirmDelete(
      'Xóa Chỗ ở',
      `Xóa "${bookedHotel?.name}" khỏi chuyến đi này?`,
      'Xóa',
    );
    if (confirmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBookedHotel(null);
      setCheckInDate(null);
      setCheckOutDate(null);
    }
  };


  const formatCurrency = (amount: number) => amount.toLocaleString('vi-VN') + '₫';
  const formatShortDate = (d: Date) => {
    const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const nights = checkInDate && checkOutDate
    ? Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000*60*60*24))
    : 0;

  // Group by day for display
  const groupedByDay = destinations.reduce<Record<number, Destination[]>>((acc, dest) => {
    if (!acc[dest.day]) acc[dest.day] = [];
    acc[dest.day].push(dest);
    return acc;
  }, {});

  // Running index across all days
  let placeIndex = 0;

  return (
    <View style={styles.container}>

      {/* ===== 1. ACCOMMODATION ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="home"
          title="Chỗ ở"
          right={bookedHotel ? (
            <TouchableOpacity onPress={handleRemoveAccommodation} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="trash-2" size={16} color="#EF4444" />
            </TouchableOpacity>
          ) : undefined}
        />

        {bookedHotel && checkInDate && checkOutDate ? (
          /* Booked hotel card */
          <View style={styles.bookedCard}>
            {bookedHotel.images && !imgErrors[`hotel-${bookedHotel.id}`] ? (
              <Image
                source={{ uri: bookedHotel.images }}
                style={styles.bookedImage}
                onError={() => handleImageError(`hotel-${bookedHotel.id}`)}
              />
            ) : (
              <View style={[styles.bookedImage, styles.bookedImagePlaceholder]}>
                <Feather name="home" size={24} color="#D1D5DB" />
              </View>
            )}
            <View style={styles.bookedInfo}>
              <Text style={styles.bookedName} numberOfLines={1}>{bookedHotel.name}</Text>
              <View style={styles.bookedDates}>
                <Feather name="calendar" size={12} color="#9CA3AF" />
                <Text style={styles.bookedDateText}>
                  {formatShortDate(checkInDate)} → {formatShortDate(checkOutDate)}
                </Text>
              </View>
              <View style={styles.bookedBottom}>
                <Text style={styles.bookedNights}>{nights} đêm</Text>
                <Text style={styles.bookedTotal}>{formatCurrency(nights * bookedHotel.pricePerNight)}</Text>
              </View>
            </View>
          </View>
        ) : (
          /* Empty state */
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="home" size={24} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa chọn chỗ ở</Text>
            <Text style={styles.emptyHint}>Thêm khách sạn, resort hoặc homestay</Text>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={openHotelModal}
            >
              <Feather name="plus" size={14} color="#FFF" />
              <Text style={styles.actionBtnText}>Thêm chỗ ở</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ===== 2. PLACES TO VISIT ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="map-pin"
          title="Địa điểm tham quan"
          right={
            <Text style={styles.countText}>
              {loadingDest ? '...' : `${destinations.length} điểm`}
            </Text>
          }
        />

        {loadingDest ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={BRAND} />
          </View>
        ) : destinations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="compass" size={24} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có địa điểm</Text>
            <Text style={styles.emptyHint}>Khám phá và thêm những điểm đến tuyệt vời</Text>
          </View>
        ) : (
          <View>
            {Object.keys(groupedByDay)
              .sort((a, b) => Number(a) - Number(b))
              .map((dayNum, groupIdx) => {
                const dayDests = groupedByDay[Number(dayNum)];
                const dayDate = dayDests[0]?.date;

                return (
                  <View key={dayNum}>
                    {/* Day header divider */}
                    {Object.keys(groupedByDay).length > 1 && (
                      <View style={[styles.dayDivider, groupIdx === 0 && { marginTop: 0 }]}>
                        <Text style={styles.dayLabel}>Ngày {dayNum}</Text>
                        {dayDate && (
                          <Text style={styles.dayDate}>{formatDayShort(dayDate)}</Text>
                        )}
                      </View>
                    )}

                    {dayDests
                      .sort((a, b) => a.place.order - b.place.order)
                      .map((dest, idx) => {
                        placeIndex++;
                        const hasPhoto = dest.place.photo && !imgErrors[dest.place._id];

                        return (
                          <TouchableOpacity
                            key={dest.place._id}
                            style={styles.placeRow}
                            activeOpacity={0.7}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              if (dest.place.mapUrl) Linking.openURL(dest.place.mapUrl);
                            }}
                          >
                            {/* Blue numbered circle (like reference) */}
                            <View style={styles.placeNum}>
                              <Text style={styles.placeNumText}>{placeIndex}</Text>
                            </View>

                            {/* Place info */}
                            <View style={styles.placeContent}>
                              <Text style={styles.placeName} numberOfLines={1}>
                                {dest.place.name}
                              </Text>
                              {dest.place.address ? (
                                <Text style={styles.placeAddr} numberOfLines={1}>
                                  {dest.place.address}
                                </Text>
                              ) : null}
                            </View>

                            {/* Right side: rating or photo thumbnail */}
                            {hasPhoto ? (
                              <Image
                                source={{ uri: dest.place.photo }}
                                style={styles.placeThumb}
                                onError={() => handleImageError(dest.place._id)}
                              />
                            ) : dest.place.rating ? (
                              <View style={styles.ratingPill}>
                                <Feather name="star" size={10} color="#F59E0B" />
                                <Text style={styles.ratingText}>{dest.place.rating}</Text>
                              </View>
                            ) : (
                              <Feather name="chevron-right" size={16} color="#D1D5DB" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                );
              })}
          </View>
        )}
      </View>

      {/* ===== 3. NOTES (individual cards like reference) ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="file-text"
          title="Ghi chú"
          right={
            <TouchableOpacity
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="plus" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          }
        />

        <View style={styles.notesList}>
          {(trip.description
            ? trip.description.split('\n').filter(Boolean)
            : [
                "Đừng quên mang theo áo mưa 🌧️",
                "Thử các món ăn địa phương tại chợ!",
                "Đặt vé bảo tàng trước 🎟️",
              ]
          ).map((line, i) => (
            <View key={i} style={styles.noteItem}>
              <Text style={styles.noteText}>{line}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ===== 4. BUDGET ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="credit-card"
          title="Ngân sách"
          right={
            <Text style={styles.budgetTotal}>
              ${(trip.budget || 180).toLocaleString()}
            </Text>
          }
        />

        <View style={styles.budgetRows}>
          {trip.budget ? (
            // User set a budget, but we don't have accurate actual spent tracking yet
            // Use fallback proportions to make it look active, or you can implement real calc here
            <>
              <BudgetRow label="Chỗ ở" amount={Math.round(trip.budget * 0.45)} total={trip.budget} />
              <BudgetRow label="Ăn uống" amount={Math.round(trip.budget * 0.25)} total={trip.budget} />
              <BudgetRow label="Di chuyển" amount={Math.round(trip.budget * 0.15)} total={trip.budget} />
              <BudgetRow label="Hoạt động" amount={Math.round(trip.budget * 0.1)} total={trip.budget} />
            </>
          ) : (
            // No budget set, use completely mock values
            <>
              <BudgetRow label="Chỗ ở" amount={85} total={180} />
              <BudgetRow label="Ăn uống" amount={45} total={180} />
              <BudgetRow label="Di chuyển" amount={30} total={180} />
              <BudgetRow label="Hoạt động" amount={20} total={180} />
            </>
          )}
        </View>
      </View>

      {/* ===== HOTEL LIST MODAL ===== */}
      <Modal visible={hotelModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHandleBar}><View style={styles.modalHandle} /></View>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn chỗ ở</Text>
            <TouchableOpacity onPress={() => setHotelModalVisible(false)}>
              <Feather name="x" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {loadingHotels ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={BRAND} />
              <Text style={styles.modalLoadingText}>Đang tìm khách sạn...</Text>
            </View>
          ) : (
            <FlatList
              data={hotels}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.hotelList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const hasImg = item.images && !imgErrors[`modal-${item.id}`];
                const chips = item.amenities?.slice(0, 3) ?? [];
                const extra = (item.amenities?.length ?? 0) - 3;
                return (
                  <TouchableOpacity
                    style={styles.hotelCard}
                    activeOpacity={0.85}
                    onPress={() => handleSelectHotel(item)}
                  >
                    <View style={styles.hotelImageWrap}>
                      {hasImg ? (
                        <Image
                          source={{ uri: item.images }}
                          style={styles.hotelImage}
                          onError={() => handleImageError(`modal-${item.id}`)}
                        />
                      ) : (
                        <View style={[styles.hotelImage, styles.hotelImagePlaceholder]}>
                          <Feather name="image" size={28} color="#D1D5DB" />
                        </View>
                      )}
                      {item.rating > 0 && (
                        <View style={styles.hotelRatingBadge}>
                          <Feather name="star" size={11} color="#FFF" />
                          <Text style={styles.hotelRatingVal}>{item.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.hotelInfo}>
                      <Text style={styles.hotelName} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.hotelAddrRow}>
                        <Feather name="map-pin" size={11} color="#9CA3AF" />
                        <Text style={styles.hotelAddr} numberOfLines={1}>{item.address}</Text>
                      </View>
                      {chips.length > 0 && (
                        <View style={styles.hotelChips}>
                          {chips.map((a, i) => (
                            <View key={i} style={styles.hotelChip}>
                              <Text style={styles.hotelChipText}>{a}</Text>
                            </View>
                          ))}
                          {extra > 0 && <Text style={styles.hotelChipMore}>+{extra}</Text>}
                        </View>
                      )}
                      <Text style={styles.hotelPrice}>{formatCurrency(item.pricePerNight)}<Text style={styles.hotelPriceUnit}>/đêm</Text></Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.modalLoading}>
                  <Feather name="home" size={44} color="#D1D5DB" />
                  <Text style={styles.modalLoadingText}>Không tìm thấy chỗ ở nào</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* ===== DETAIL MODAL ===== */}
      <AccommodationDetailModal
        visible={detailVisible}
        hotel={selectedHotel}
        trip={trip}
        days={days}
        onClose={() => { setDetailVisible(false); setSelectedHotel(null); }}
        onBook={handleBookFromDetail}
        onWriteReview={handleWriteReview}
      />

      {/* ===== WRITE REVIEW MODAL ===== */}
      <WriteReviewModal
        visible={reviewVisible}
        hotel={selectedHotel}
        onClose={() => setReviewVisible(false)}
        onReviewSubmitted={() => {
          if (selectedHotel) setDetailVisible(true);
        }}
      />

      {/* ===== CALENDAR MODAL ===== */}
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

// ===== BUDGET ROW =====
function BudgetRow({ label, amount, total }: { label: string; amount: number; total: number }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetRowHeader}>
        <Text style={styles.budgetLabel}>{label}</Text>
        <Text style={styles.budgetValue}>${amount.toLocaleString()}</Text>
      </View>
      <View style={styles.budgetBarBg}>
        <View style={[styles.budgetBarFill, { width: `${Math.max(pct, 2)}%` }]} />
      </View>
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },

  // Card — clean white card like reference
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },

  // Section Header with icon box
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  countText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },

  // Loading
  loadingBox: { paddingVertical: 20, alignItems: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  emptyIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  emptyHint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  // Action button
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, marginTop: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  // Places list — like reference: numbered circles + name
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  placeNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  placeNumText: { fontSize: 14, fontWeight: '700', color: BRAND },
  placeContent: { flex: 1, gap: 1 },
  placeName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  placeAddr: { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },
  placeThumb: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6',
  },

  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#D97706' },

  // Day dividers
  dayDivider: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, marginBottom: 4,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  dayLabel: { fontSize: 12, fontWeight: '700', color: BRAND },
  dayDate: { fontSize: 11, color: '#9CA3AF' },

  // Notes — individual cards like reference
  notesList: { gap: 8 },
  noteItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noteText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  noteHintText: { fontSize: 14, color: '#9CA3AF' },

  // Budget
  budgetTotal: { fontSize: 17, fontWeight: '800', color: BRAND },
  budgetRows: { gap: 14 },
  budgetRow: { gap: 6 },
  budgetRowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  budgetValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  budgetBarBg: { height: 5, borderRadius: 3, backgroundColor: '#F3F4F6' },
  budgetBarFill: { height: 5, borderRadius: 3, backgroundColor: BRAND },

  // Booked accommodation card
  bookedCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookedImage: {
    width: 80, height: 80,
  },
  bookedImagePlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  bookedInfo: {
    flex: 1, padding: 10, gap: 4, justifyContent: 'center',
  },
  bookedName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  bookedDates: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookedDateText: { fontSize: 12, color: '#6B7280' },
  bookedBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  bookedNights: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },
  bookedTotal: { fontSize: 14, fontWeight: '800', color: BRAND },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHandleBar: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  modalLoading: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 80,
  },
  modalLoadingText: { fontSize: 14, color: '#9CA3AF' },

  // Hotel cards in modal
  hotelList: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  hotelCard: {
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  hotelImageWrap: { position: 'relative' },
  hotelImage: { width: '100%', height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  hotelImagePlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  hotelRatingBadge: {
    position: 'absolute', left: 12, bottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  hotelRatingVal: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  hotelInfo: { padding: 14, paddingTop: 10, gap: 5 },
  hotelName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  hotelAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hotelAddr: { fontSize: 12, color: '#6B7280', flex: 1 },
  hotelChips: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hotelChip: { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  hotelChipText: { fontSize: 11, fontWeight: '500', color: '#6B7280' },
  hotelChipMore: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  hotelPrice: { fontSize: 17, fontWeight: '800', color: BRAND },
  hotelPriceUnit: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
});
