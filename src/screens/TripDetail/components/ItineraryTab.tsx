import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Linking,

} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { Trip, TripDay, Destination, tripService } from '@/services/tripService';
import AddPlaceModal from './AddPlaceModal';
import { useConfirm } from '@/components/ConfirmProvider';

const BRAND = '#4A7CFF';
const BRAND_LIGHT = '#EBF5FF';

// ===== HELPERS =====
function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getTimeOfDay(order: number): { label: string; color: string } {
  if (order <= 2) return { label: 'Buổi sáng', color: '#F59E0B' };
  if (order <= 4) return { label: 'Buổi chiều', color: '#3B82F6' };
  return { label: 'Buổi tối', color: '#8B5CF6' };
}

// ===== MAIN COMPONENT =====
export default function ItineraryTab({ trip, days }: { trip: Trip; days: TripDay[] }) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Add Place Modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);

  // Swipeable refs
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const openSwipeable = useRef<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tripService.getDestinations(trip._id);
      setDestinations(data);
      // Auto-expand first day or day with activities
      if (data.length > 0) {
        const firstDay = Math.min(...data.map((d) => d.day));
        setExpandedDays((prev) => ({ ...prev, [firstDay]: true }));
      } else if (days.length > 0) {
        setExpandedDays((prev) => ({ ...prev, [days[0].day]: true }));
      }
    } catch (e) {
      console.error('Error fetching destinations:', e);
    } finally {
      setLoading(false);
    }
  }, [trip._id, days]);

  useEffect(() => { fetchDestinations(); }, [fetchDestinations]);

  // Group destinations by day
  const destByDay = destinations.reduce<Record<number, Destination[]>>((acc, dest) => {
    if (!acc[dest.day]) acc[dest.day] = [];
    acc[dest.day].push(dest);
    return acc;
  }, {});

  const toggleDay = (dayNum: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedDays((prev) => ({ ...prev, [dayNum]: !prev[dayNum] }));
  };

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const openAddModal = (dayId: string, dayNumber: number) => {
    setSelectedDayId(dayId);
    setSelectedDayNumber(dayNumber);
    setAddModalVisible(true);
  };

  const handlePlaceAdded = () => {
    fetchDestinations();
  };

  const { confirmDelete, alert: showAlert } = useConfirm();

  // Delete place
  const handleDeletePlace = async (dest: Destination) => {
    const confirmed = await confirmDelete(
      'Xóa địa điểm',
      `Xóa "${dest.place.name}" khỏi Ngày ${dest.day}?`,
      'Xóa',
    );
    if (!confirmed) {
      swipeableRefs.current[dest.place._id]?.close();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Optimistic delete
    const backup = [...destinations];
    setDestinations((prev) => prev.filter((d) => d.place._id !== dest.place._id));

    try {
      await tripService.removePlaceFromDay(dest.dayId, dest.place._id);
    } catch (error: any) {
      setDestinations(backup);
      const msg = error?.response?.data?.message || 'Không thể xóa địa điểm';
      showAlert('Lỗi', msg, 'error');
    }
  };

  // Render swipe right action — refined white circle style
  const renderDeleteAction = (dest: Destination) => (
    <TouchableOpacity
      style={styles.swipeDeleteAction}
      activeOpacity={0.7}
      onPress={() => handleDeletePlace(dest)}
    >
      <View style={styles.swipeDeleteCircle}>
        <Feather name="trash-2" size={16} color="#EF4444" />
      </View>
    </TouchableOpacity>
  );

  // Get existing placeIds for the selected day (prevent duplicate add)
  const getExistingPlaceIds = (dayNum: number): string[] => {
    return (destByDay[dayNum] || []).map((d) => d.place.placeId);
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {days.map((day) => {
        const dayDests = (destByDay[day.day] || []).sort((a, b) => a.place.order - b.place.order);
        const isExpanded = expandedDays[day.day] ?? false;
        const activityCount = dayDests.length;

        return (
          <View key={day.day} style={styles.dayCard}>
            {/* ===== DAY HEADER ===== */}
            <TouchableOpacity
              style={styles.dayHeader}
              activeOpacity={0.7}
              onPress={() => toggleDay(day.day)}
            >
              <View style={styles.dayNumCircle}>
                <Text style={styles.dayNumText}>{day.day}</Text>
              </View>
              <View style={styles.dayHeaderInfo}>
                <Text style={styles.dayTitle}>Ngày {day.day}</Text>
                <Text style={styles.dayMeta}>
                  {formatDayDate(day.date)}
                  {activityCount > 0 ? ` · ${activityCount} hoạt động` : ''}
                </Text>
              </View>
              <Feather
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* ===== EXPANDED CONTENT — TIMELINE ===== */}
            {isExpanded && (
              <View style={styles.timelineContainer}>
                {dayDests.length === 0 ? (
                  <View style={styles.emptyDay}>
                    <Feather name="compass" size={24} color="#D1D5DB" />
                    <Text style={styles.emptyDayText}>Chưa có hoạt động nào</Text>
                    <Text style={styles.emptyDayHint}>Nhấn bên dưới để thêm địa điểm đầu tiên</Text>
                  </View>
                ) : (
                  dayDests.map((dest, idx) => {
                    const isLast = idx === dayDests.length - 1;
                    const tod = getTimeOfDay(dest.place.order);
                    const hasPhoto = dest.place.photo && !imgErrors[dest.place._id];

                    return (
                      <View key={dest.place._id} style={styles.timelineItem}>
                        {/* Timeline line + dot */}
                        <View style={styles.timelineTrack}>
                          <View style={styles.timelineDot} />
                          {!isLast && <View style={styles.timelineLine} />}
                        </View>

                        {/* Activity card — swipeable */}
                        <Swipeable
                          ref={(ref) => { swipeableRefs.current[dest.place._id] = ref; }}
                          renderRightActions={() => renderDeleteAction(dest)}
                          rightThreshold={60}
                          overshootRight={false}
                          containerStyle={styles.swipeableContainer}
                          onSwipeableWillOpen={() => {
                            if (openSwipeable.current && openSwipeable.current !== dest.place._id) {
                              swipeableRefs.current[openSwipeable.current]?.close();
                            }
                            openSwipeable.current = dest.place._id;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }}
                        >
                          <TouchableOpacity
                            style={styles.activityCard}
                            activeOpacity={0.7}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              if (dest.place.mapUrl) Linking.openURL(dest.place.mapUrl);
                            }}
                          >
                            {/* Info */}
                            <View style={styles.activityInfo}>
                              <Text style={styles.activityName} numberOfLines={1}>
                                {dest.place.name}
                              </Text>
                              <View style={styles.activityMeta}>
                                {dest.place.rating ? (
                                  <>
                                    <Feather name="star" size={11} color="#F59E0B" />
                                    <Text style={styles.activityRating}>{dest.place.rating}</Text>
                                    <Text style={styles.activityDot}>·</Text>
                                  </>
                                ) : null}
                                <Text style={[styles.activityTag, { color: tod.color }]}>
                                  {tod.label}
                                </Text>
                              </View>
                              {dest.place.address ? (
                                <Text style={styles.activityAddr} numberOfLines={1}>
                                  {dest.place.address}
                                </Text>
                              ) : null}
                            </View>

                            {/* Thumbnail — right side */}
                            {hasPhoto ? (
                              <Image
                                source={{ uri: dest.place.photo }}
                                style={styles.activityThumb}
                                onError={() => handleImageError(dest.place._id)}
                              />
                            ) : (
                              <View style={[styles.activityThumb, styles.activityThumbPlaceholder]}>
                                <Feather name="map-pin" size={18} color="#D1D5DB" />
                              </View>
                            )}
                          </TouchableOpacity>
                        </Swipeable>
                      </View>
                    );
                  })
                )}

                {/* + Add Activity — uses dayId from TripDay */}
                <TouchableOpacity
                  style={styles.addActivityBtn}
                  activeOpacity={0.7}
                  onPress={() => openAddModal(day.dayId, day.day)}
                >
                  <Feather name="plus" size={16} color={BRAND} />
                  <Text style={styles.addActivityText}>Thêm hoạt động</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* ADD PLACE MODAL */}
      <AddPlaceModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        dayId={selectedDayId}
        dayNumber={selectedDayNumber}
        tripDestination={trip.destination}
        existingPlaceIds={getExistingPlaceIds(selectedDayNumber)}
        onPlaceAdded={handlePlaceAdded}
      />
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },

  // Day Card
  dayCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },

  // Day Header
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dayNumCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  dayNumText: { fontSize: 15, fontWeight: '700', color: BRAND },
  dayHeaderInfo: { flex: 1, gap: 1 },
  dayTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  dayMeta: { fontSize: 13, color: '#9CA3AF' },

  // Timeline container
  timelineContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Empty day
  emptyDay: {
    alignItems: 'center', paddingVertical: 16, gap: 4,
    marginLeft: 24,
  },
  emptyDayText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  emptyDayHint: { fontSize: 12, color: '#9CA3AF' },

  // Timeline item
  timelineItem: {
    flexDirection: 'row',
    gap: 0,
  },

  // Timeline track (dot + line)
  timelineTrack: {
    width: 24,
    alignItems: 'center',
    paddingTop: 20,
  },
  timelineDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: BRAND,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: -1,
  },

  // Swipeable
  swipeableContainer: { flex: 1, marginBottom: 10 },
  swipeDeleteAction: {
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeDeleteCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },

  // Activity card
  activityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
  },
  activityThumb: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  activityThumbPlaceholder: {
    justifyContent: 'center', alignItems: 'center',
  },
  activityInfo: { flex: 1, gap: 2 },
  activityName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  activityRating: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  activityDot: { fontSize: 12, color: '#9CA3AF' },
  activityTag: { fontSize: 12, fontWeight: '500' },
  activityAddr: { fontSize: 11, color: '#9CA3AF', lineHeight: 14 },

  // Add Activity
  addActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  addActivityText: { fontSize: 14, fontWeight: '600', color: BRAND },
});
