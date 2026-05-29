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
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Swipeable, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Trip, TripDay, Destination, tripService } from '@/services/tripService';
import { aiService } from '@/services/aiService';
import { placesService } from '@/services/placesService';
import AddPlaceModal from './AddPlaceModal';
import PlaceDetailModal from './PlaceDetailModal';
import { useConfirm } from '@/components/ConfirmProvider';
import { getDayColor } from './journal/types';
import * as Speech from 'expo-speech';

const BRAND = '#4A7CFF';
const BRAND_LIGHT = '#EBF5FF';

// ===== HELPERS =====
function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    'Th1',
    'Th2',
    'Th3',
    'Th4',
    'Th5',
    'Th6',
    'Th7',
    'Th8',
    'Th9',
    'Th10',
    'Th11',
    'Th12',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getTimeOfDay(order: number, timeOfDay?: string): { label: string; color: string } {
  if (order <= 2) return { label: 'Buổi sáng', color: '#F59E0B' };
  if (order <= 4) return { label: 'Buổi chiều', color: '#3B82F6' };
  return { label: 'Buổi tối', color: '#8B5CF6' };
}

const ITEM_HEIGHT = 78; // approx card height + margin

// ===== MAIN COMPONENT =====
export default function ItineraryTab({
  trip,
  days,
  onRefresh,
}: {
  trip: Trip;
  days: TripDay[];
  onRefresh: () => void;
}) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Add Place Modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);

  // Voice AI State
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [aiText, setAiText] = useState('');
  
  // Auto Generate State
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // Swipeable refs
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const openSwipeable = useRef<string | null>(null);

  // Derive destinations from the days prop in real-time
  useEffect(() => {
    const derived: Destination[] = [];
    days.forEach((day) => {
      const sortedPlaces = [...(day.places || [])].sort((a, b) => a.order - b.order);
      sortedPlaces.forEach((place) => {
        derived.push({
          dayId: day.dayId,
          day: day.day,
          date: day.date,
          place,
        });
      });
    });
    setDestinations(derived);
    setLoading(false);

    // Auto-expand first day or day with activities
    if (Object.keys(expandedDays).length === 0) {
      if (derived.length > 0) {
        const firstDay = Math.min(...derived.map((d) => d.day));
        setExpandedDays({ [firstDay]: true });
      } else if (days.length > 0) {
        setExpandedDays({ [days[0].day]: true });
      }
    }
  }, [days]);

  // Group destinations by day
  const destByDay = destinations.reduce<Record<number, Destination[]>>((acc, dest) => {
    if (!acc[dest.day]) acc[dest.day] = [];
    acc[dest.day].push(dest);
    return acc;
  }, {});

  const uniqueDates = React.useMemo(() => days.map((d) => d.date), [days]);

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
    onRefresh();
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
      onRefresh(); // Refresh parent to synchronize across tabs!
    } catch (error: any) {
      setDestinations(backup);
      const msg = error?.response?.data?.message || 'Không thể xóa địa điểm';
      showAlert('Lỗi', msg, 'error');
    }
  };

  // Get existing placeIds for the selected day (prevent duplicate add)
  const getExistingPlaceIds = (dayNum: number): string[] => {
    return (destByDay[dayNum] || []).map((d) => d.place.placeId);
  };

  // Drag reorder handler — no bounce, just swap
  const handleDragEnd = useCallback(
    async (dayNum: number, fromIdx: number, dy: number) => {
      const dayDests = (destByDay[dayNum] || []).sort((a, b) => a.place.order - b.place.order);
      const offset = Math.round(dy / ITEM_HEIGHT);
      const toIdx = Math.max(0, Math.min(dayDests.length - 1, fromIdx + offset));
      if (toIdx === fromIdx) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Swap in local destinations
      const reordered = [...dayDests];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      // Update order values
      const updatedDests = destinations.map((d) => {
        if (d.dayId !== dayDests[0]?.dayId) return d;
        const newIdx = reordered.findIndex((r) => r.place._id === d.place._id);
        if (newIdx === -1) return d;
        return { ...d, place: { ...d.place, order: newIdx + 1 } };
      });
      setDestinations(updatedDests);

      // Save to backend
      const targetDayId = dayDests[0]?.dayId;
      if (targetDayId) {
        try {
          const orderedPlaceIds = reordered.map((r) => r.place._id);
          await tripService.reorderPlacesInDay(targetDayId, orderedPlaceIds);
          onRefresh(); // Refresh parent to synchronize across tabs!
        } catch (error: any) {
          const msg = error?.response?.data?.message || 'Không thể lưu thứ tự mới';
          showAlert('Lỗi', msg, 'error');
        }
      }
    },
    [destByDay, destinations, onRefresh, showAlert],
  );

  // Auto-Generate Itinerary (Offline/Local logic without AI)
  const handleAutoGenerateItinerary = async () => {
    try {
      setIsAutoGenerating(true);
      Speech.speak("Đang tự động thiết kế lịch trình...", { language: 'vi-VN' });
      
      // 1. Lấy danh sách địa điểm bằng API address theo yêu cầu
      const query = trip.destination || trip.title;
      const availablePlaces = await placesService.searchByAddress(query);

      if (!availablePlaces || availablePlaces.length === 0) {
        Speech.speak("Không tìm thấy địa điểm nào ở khu vực này.", { language: 'vi-VN' });
        setIsAutoGenerating(false);
        return;
      }

      // 2. Phân bổ địa điểm tự động (Mỗi ngày 3-4 địa điểm tùy theo số lượng mảng)
      // Loại bỏ AI, dùng logic cơ bản: Cắt mảng availablePlaces chia đều cho các ngày
      let placeIndex = 0;
      const PLACES_PER_DAY = 3;

      for (const day of days) {
        // Lấy 3 địa điểm tiếp theo trong danh sách
        const placesForThisDay = availablePlaces.slice(placeIndex, placeIndex + PLACES_PER_DAY);
        placeIndex += PLACES_PER_DAY;

        if (placesForThisDay.length === 0) break; // Đã hết địa điểm

        let localIndex = 0;
        for (const placeData of placesForThisDay) {
          let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'morning';
          if (localIndex === 1) timeOfDay = 'afternoon';
          if (localIndex >= 2) timeOfDay = 'evening';

          await tripService.addPlaceToDay(day.dayId, {
            placeId: placeData.placeId || (placeData as any)._id,
            name: placeData.name,
            address: placeData.address,
            latitude: placeData.latitude || placeData.location?.lat || 0,
            longitude: placeData.longitude || placeData.location?.lng || 0,
            rating: placeData.rating,
            totalReviews: placeData.totalReviews || placeData.reviewCount,
            photo: placeData.photo || (placeData.images && placeData.images.length > 0 ? placeData.images[0] : ''),
            mapUrl: placeData.mapUrl || '',
            timeOfDay,
          });
          localIndex++;
        }
      }
      
      Speech.speak("Đã hoàn tất việc tự động lên lịch trình.", { language: 'vi-VN' });
      onRefresh();
    } catch (error) {
      console.error("Lỗi khi tự động lên lịch trình:", error);
      Speech.speak("Đã xảy ra lỗi trong quá trình tự động lên lịch trình.", { language: 'vi-VN' });
    } finally {
      setIsAutoGenerating(false);
    }
  };

  // Voice AI using Gemini LLM
  const handleVoiceCommand = async () => {
    try {
      setIsProcessingVoice(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const userInput = aiText.trim() || "Trời hôm nay mưa";
      
      // Simulate listening...
      Speech.speak(`Đang nghe... Bạn vừa nói: ${userInput}. Đang nhờ AI xử lý...`, { language: 'vi-VN' });
      
      if (days.length === 0) {
        Speech.speak("Không có lịch trình nào để sắp xếp.", { language: 'vi-VN' });
        return;
      }

      // Pick the first day to mock rearrangement
      const targetDay = days[0];
      const dayDests = (destByDay[targetDay.day] || []).sort((a, b) => a.place.order - b.place.order);
      
      if (dayDests.length < 2) {
        Speech.speak("Ngày này không đủ địa điểm để sắp xếp lại.", { language: 'vi-VN' });
        return;
      }

      // Call the real AI Service
      const aiResult = await aiService.rearrangeItineraryWithAI(userInput, dayDests);

      if (aiResult && aiResult.orderedPlaceIds) {
        // Call API to save new order
        await tripService.reorderPlacesInDay(targetDay.dayId, aiResult.orderedPlaceIds);
        
        // Speak the AI's reply
        Speech.speak(aiResult.replyMessage, { language: 'vi-VN' });
        
        setAiText(''); // Clear input after success
        onRefresh();
      } else {
        Speech.speak("Xin lỗi, AI không thể phân tích được yêu cầu này.", { language: 'vi-VN' });
      }
    } catch (error) {
      console.error(error);
      Speech.speak("Đã xảy ra lỗi khi gọi AI.", { language: 'vi-VN' });
    } finally {
      setIsProcessingVoice(false);
    }
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
      {/* Auto Generate Button */}
      <View style={styles.autoGenContainer}>
        <TouchableOpacity 
          style={[styles.autoGenBtn, isAutoGenerating && styles.autoGenBtnDisabled]} 
          onPress={handleAutoGenerateItinerary}
          disabled={isAutoGenerating}
        >
          {isAutoGenerating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Feather name="cpu" size={20} color="#FFF" />
          )}
          <Text style={styles.autoGenBtnText}>
            {isAutoGenerating ? 'Đang thiết kế lịch trình...' : 'Tự động lên lịch trình'}
          </Text>
        </TouchableOpacity>
      </View>

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
              <View style={[styles.dayNumCircle, { backgroundColor: getDayColor(day.date, uniqueDates) }]}>
                <Text style={[styles.dayNumText, { color: '#FFF' }]}>{day.day}</Text>
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
                  dayDests.map((dest, idx) => (
                    <DraggableActivityItem
                      key={dest.place._id}
                      dest={dest}
                      idx={idx}
                      isLast={idx === dayDests.length - 1}
                      dayNum={day.day}
                      dayColor={getDayColor(day.date, uniqueDates)}
                      imgErrors={imgErrors}
                      onImageError={handleImageError}
                      onDelete={handleDeletePlace}
                      onDragStart={() => {
                        /* drag visual only */
                      }}
                      onDragEnd={handleDragEnd}
                      swipeableRefs={swipeableRefs}
                      openSwipeable={openSwipeable}
                      onPress={(place) => {
                        setSelectedPlace(place);
                        setDetailVisible(true);
                      }}
                    />
                  ))
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

      {/* Floating Voice/Text AI Bar */}
      <View style={styles.aiInputContainer}>
        <TextInput
          style={styles.aiInput}
          placeholder="Nhập hoặc nói (VD: Trời mưa)..."
          value={aiText}
          onChangeText={setAiText}
          onSubmitEditing={handleVoiceCommand}
          returnKeyType="send"
        />
        <TouchableOpacity 
          style={[styles.voiceAiBtnSmall, isProcessingVoice && styles.voiceAiBtnActive]}
          activeOpacity={0.8}
          onPress={handleVoiceCommand}
          disabled={isProcessingVoice}
        >
          {isProcessingVoice ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Feather name={aiText.trim() ? "send" : "mic"} size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      <PlaceDetailModal 
        isVisible={detailVisible}
        onClose={() => setDetailVisible(false)}
        place={selectedPlace}
        onAdd={() => {}} 
        showAddButton={false}
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
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
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
    width: 8,
    height: 8,
    borderRadius: 4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
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
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  activityThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
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

  // Drag handle
  dragHandle: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Voice/Text AI Bar
  aiInputContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    height: 56,
    backgroundColor: '#FFF',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingLeft: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  aiInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  autoGenContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  autoGenBtn: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  autoGenBtnDisabled: {
    opacity: 0.7,
  },
  autoGenBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  voiceAiBtnSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceAiBtnActive: {
    backgroundColor: '#EF4444',
  },
});

// ===== DRAGGABLE ACTIVITY ITEM =====
interface DraggableActivityItemProps {
  dest: Destination;
  idx: number;
  isLast: boolean;
  dayNum: number;
  dayColor: string;
  imgErrors: Record<string, boolean>;
  onImageError: (id: string) => void;
  onDelete: (dest: Destination) => void;
  onDragStart: (dayNum: number) => void;
  onDragEnd: (dayNum: number, fromIdx: number, dy: number) => void;
  swipeableRefs: React.MutableRefObject<Record<string, Swipeable | null>>;
  openSwipeable: React.MutableRefObject<string | null>;
  onPress: (place: any) => void;
}

function DraggableActivityItem({
  dest, idx, isLast, dayNum, dayColor, imgErrors,
  onImageError, onDelete, onDragStart, onDragEnd,
  swipeableRefs, openSwipeable, onPress,
}: DraggableActivityItemProps) {
  const tod = getTimeOfDay(dest.place.order, dest.place.timeOfDay);
  const hasPhoto = dest.place.photo && !imgErrors[dest.place._id];

  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const triggerDragStart = useCallback(() => {
    onDragStart(dayNum);
  }, [onDragStart, dayNum]);

  const triggerDragEnd = useCallback(
    (dy: number) => {
      onDragEnd(dayNum, idx, dy);
    },
    [onDragEnd, dayNum, idx],
  );

  const longPressGesture = Gesture.LongPress()
    .minDuration(150)
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      runOnJS(triggerHaptic)();
      runOnJS(triggerDragStart)();
    });

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onUpdate((event) => {
      'worklet';
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      'worklet';
      isDragging.value = false;
      translateY.value = withTiming(0, { duration: 150 });
      runOnJS(triggerDragEnd)(event.translationY);
    })
    .onFinalize(() => {
      'worklet';
      if (isDragging.value) {
        isDragging.value = false;
        translateY.value = withTiming(0, { duration: 150 });
      }
    });

  const dragGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isDragging.value ? 100 : 0,
    opacity: isDragging.value ? 0.92 : 1,
    ...(Platform.OS === 'ios'
      ? {
          shadowOpacity: isDragging.value ? 0.15 : 0,
          shadowRadius: isDragging.value ? 12 : 0,
        }
      : {
          elevation: isDragging.value ? 6 : 0,
        }),
  }));

  const renderDeleteAction = () => (
    <TouchableOpacity
      style={styles.swipeDeleteAction}
      activeOpacity={0.7}
      onPress={() => onDelete(dest)}
    >
      <View style={styles.swipeDeleteCircle}>
        <Feather name="trash-2" size={16} color="#EF4444" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Animated.View
      style={[{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 } }, animatedStyle]}
    >
      <View style={styles.timelineItem}>
        {/* Timeline line + dot */}
        <View style={styles.timelineTrack}>
          <View style={[styles.timelineDot, { backgroundColor: dayColor }]} />
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: dayColor, opacity: 0.25 }]} />}
        </View>

        {/* Activity card — swipeable */}
        <Swipeable
          ref={(ref) => {
            swipeableRefs.current[dest.place._id] = ref;
          }}
          renderRightActions={renderDeleteAction}
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
              onPress(dest.place);
            }}
          >
            {/* Drag Handle */}
            <GestureDetector gesture={dragGesture}>
              <Animated.View style={styles.dragHandle}>
                <Feather name="menu" size={14} color="#C5C8CE" />
              </Animated.View>
            </GestureDetector>

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
                <Text style={[styles.activityTag, { color: tod.color }]}>{tod.label}</Text>
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
                onError={() => onImageError(dest.place._id)}
              />
            ) : (
              <View style={[styles.activityThumb, styles.activityThumbPlaceholder]}>
                <Feather name="map-pin" size={18} color="#D1D5DB" />
              </View>
            )}
          </TouchableOpacity>
        </Swipeable>
      </View>
    </Animated.View>
  );
}
