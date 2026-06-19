import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Animated as RNAnimated,
  PanResponder,
  Dimensions,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Swipeable, Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
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
import Constants from 'expo-constants';
import { speakItineraryAiFeedback } from '@/utils/itineraryAssistantAudio';

const BRAND = '#4A7CFF';
const BRAND_LIGHT = '#EBF5FF';
const ASSISTANT_BTN_SIZE = 56;
const ASSISTANT_LONG_PRESS_MS = 260;
const ASSISTANT_DRAG_THRESHOLD = 6;
const ASSISTANT_DEFAULT_TOP_RATIO = 0.5;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_EXPO_GO = Constants.appOwnership === 'expo';

type SpeechRecognitionModuleLike = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (eventName: string, listener: (event: any) => void) => { remove: () => void };
};

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
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [assistantDayNumber, setAssistantDayNumber] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [speechRecognitionUnavailable, setSpeechRecognitionUnavailable] = useState(false);
  const [isMicHoldActive, setIsMicHoldActive] = useState(false);

  // Auto Generate State
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // Swipeable refs
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const openSwipeable = useRef<string | null>(null);
  const lastVoiceSubmitRef = useRef('');
  const speechRecognitionModuleRef = useRef<SpeechRecognitionModuleLike | null>(null);
  const speechRecognitionListenersRef = useRef<{ remove: () => void }[]>([]);
  const assistantDefaultX = SCREEN_WIDTH - ASSISTANT_BTN_SIZE - 18;
  const assistantDefaultY = SCREEN_HEIGHT * ASSISTANT_DEFAULT_TOP_RATIO - ASSISTANT_BTN_SIZE / 2;
  const assistantFabPos = useRef(
    new RNAnimated.ValueXY({
      x: assistantDefaultX,
      y: assistantDefaultY,
    }),
  ).current;
  const assistantFabCurrentPos = useRef({
    x: assistantDefaultX,
    y: assistantDefaultY,
  });
  const assistantHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantDraggedRef = useRef(false);
  const assistantLongPressedRef = useRef(false);

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
  }, [days, expandedDays]);

  useEffect(() => {
    if (assistantDayNumber === null && days.length > 0) {
      setAssistantDayNumber(days[0].day);
    }
  }, [assistantDayNumber, days]);

  // Group destinations by day
  const destByDay = destinations.reduce<Record<number, Destination[]>>((acc, dest) => {
    if (!acc[dest.day]) acc[dest.day] = [];
    acc[dest.day].push(dest);
    return acc;
  }, {});

  const uniqueDates = React.useMemo(() => days.map((d) => d.date), [days]);
  const targetAssistantDay = React.useMemo(() => {
    return (
      days.find((day) => day.day === assistantDayNumber) ||
      days.find((day) => expandedDays[day.day]) ||
      days[0]
    );
  }, [assistantDayNumber, days, expandedDays]);

  const toggleDay = (dayNum: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAssistantDayNumber(dayNum);
    setExpandedDays((prev) => ({ ...prev, [dayNum]: !prev[dayNum] }));
  };

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const openAddModal = (dayId: string, dayNumber: number) => {
    setSelectedDayId(dayId);
    setSelectedDayNumber(dayNumber);
    setAssistantDayNumber(dayNumber);
    setAddModalVisible(true);
  };

  const handlePlaceAdded = () => {
    onRefresh();
  };

  const { confirmDelete, alert: showAlert } = useConfirm();

  const loadSpeechRecognitionModule = useCallback(async () => {
    if (IS_EXPO_GO) {
      setSpeechRecognitionUnavailable(true);
      return null;
    }

    if (speechRecognitionModuleRef.current) {
      return speechRecognitionModuleRef.current;
    }

    try {
      const speechRecognition = await import('expo-speech-recognition');
      speechRecognitionModuleRef.current =
        speechRecognition.ExpoSpeechRecognitionModule as SpeechRecognitionModuleLike;
      setSpeechRecognitionUnavailable(false);
      return speechRecognitionModuleRef.current;
    } catch (error) {
      console.warn('Speech recognition is not available in this runtime:', error);
      setSpeechRecognitionUnavailable(true);
      return null;
    }
  }, []);

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
      speakItineraryAiFeedback('Đang tự động thiết kế lịch trình...');

      // 1. Lấy danh sách địa điểm bằng API address theo yêu cầu
      const query = trip.destination || trip.title;
      const availablePlaces = await placesService.searchByAddress(query);

      if (!availablePlaces || availablePlaces.length === 0) {
        speakItineraryAiFeedback('Không tìm thấy địa điểm nào ở khu vực này.');
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
            photo:
              placeData.photo ||
              (placeData.images && placeData.images.length > 0 ? placeData.images[0] : ''),
            mapUrl: placeData.mapUrl || '',
            timeOfDay,
          });
          localIndex++;
        }
      }

      speakItineraryAiFeedback('Đã hoàn tất việc tự động lên lịch trình.');
      onRefresh();
    } catch (error) {
      console.error('Lỗi khi tự động lên lịch trình:', error);
      speakItineraryAiFeedback('Đã xảy ra lỗi trong quá trình tự động lên lịch trình.');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  // Voice AI using Gemini LLM
  const submitAssistantCommand = useCallback(
    async (rawInput?: string) => {
      const userInput = (rawInput ?? aiText).trim();

      if (!userInput) {
        showAlert('Trợ lý AI', 'Bạn hãy nói hoặc nhập yêu cầu trước khi gửi.', 'info');
        return;
      }

      if (!targetAssistantDay) {
        showAlert('Trợ lý AI', 'Không tìm thấy ngày nào trong lịch trình để chỉnh sửa.', 'warning');
        return;
      }

      if (isListening) {
        speechRecognitionModuleRef.current?.stop();
        setIsListening(false);
      }

      let shouldRefreshAfterAi = false;

      try {
        setIsProcessingVoice(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        speakItineraryAiFeedback(`Đang nhờ AI xử lý Ngày ${targetAssistantDay.day}...`);

        if (days.length === 0) {
          speakItineraryAiFeedback('Không có lịch trình nào để sắp xếp.');
          return;
        }

        const dayDests = (destByDay[targetAssistantDay.day] || []).sort(
          (a, b) => a.place.order - b.place.order,
        );

        if (dayDests.length < 2) {
          speakItineraryAiFeedback('Ngày này không đủ địa điểm để sắp xếp lại.');
          showAlert(
            'Trợ lý AI',
            `Ngày ${targetAssistantDay.day} cần ít nhất 2 hoạt động để AI sắp xếp lại.`,
            'warning',
          );
          return;
        }

        // Call the real AI Service
        shouldRefreshAfterAi = true;
        const aiResult = await aiService.rearrangeItineraryWithAI(userInput, dayDests);

        if (aiResult && aiResult.orderedPlaceIds) {
          // Call API to save new order
          await tripService.reorderPlacesInDay(targetAssistantDay.dayId, aiResult.orderedPlaceIds);

          speakItineraryAiFeedback(aiResult.replyMessage);

          setAiText(''); // Clear input after success
          setAssistantVisible(false);
        } else {
          speakItineraryAiFeedback('Xin lỗi, AI không thể phân tích được yêu cầu này.');
          showAlert(
            'Trợ lý AI',
            'AI chưa hiểu yêu cầu này. Bạn thử nói hoặc nhập cụ thể hơn nhé.',
            'warning',
          );
        }
      } catch (error) {
        console.error(error);
        speakItineraryAiFeedback('Đã xảy ra lỗi khi gọi AI.');
        showAlert('Trợ lý AI', 'Đã xảy ra lỗi khi gọi AI.', 'error');
      } finally {
        setIsProcessingVoice(false);
        if (shouldRefreshAfterAi) {
          onRefresh();
        }
      }
    },
    [aiText, days.length, destByDay, isListening, onRefresh, showAlert, targetAssistantDay],
  );

  const handleAssistantListening = useCallback(async () => {
    if (isProcessingVoice) return;

    if (isListening) {
      speechRecognitionModuleRef.current?.stop();
      return;
    }

    try {
      const speechRecognitionModule = await loadSpeechRecognitionModule();
      if (!speechRecognitionModule) {
        showAlert(
          'Không dùng được microphone',
          'Expo Go không có module nhận dạng giọng nói này. Bạn vẫn có thể nhập yêu cầu bằng bàn phím, hoặc chạy dev build để dùng mic.',
          'warning',
        );
        return;
      }

      const available = speechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        showAlert(
          'Không dùng được microphone',
          'Thiết bị này chưa có dịch vụ nhận dạng giọng nói. Bạn vẫn có thể nhập yêu cầu bằng bàn phím.',
          'warning',
        );
        return;
      }

      const permission = await speechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Chưa có quyền microphone',
          'Bạn cần cấp quyền microphone/nhận dạng giọng nói để dùng lệnh nói.',
          'warning',
        );
        return;
      }

      const currentDayPlaces = targetAssistantDay
        ? (destByDay[targetAssistantDay.day] || []).map((dest) => dest.place.name)
        : [];

      setSpeechError('');
      lastVoiceSubmitRef.current = '';
      speechRecognitionModule.start({
        lang: 'vi-VN',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
        contextualStrings: [
          trip.destination,
          `Ngày ${targetAssistantDay?.day ?? 1}`,
          ...currentDayPlaces,
        ].filter(Boolean),
      });
    } catch (error) {
      console.error(error);
      setIsListening(false);
      setSpeechError('Không thể bắt đầu nghe. Bạn hãy nhập yêu cầu bằng bàn phím.');
    }
  }, [
    destByDay,
    isListening,
    isProcessingVoice,
    loadSpeechRecognitionModule,
    showAlert,
    targetAssistantDay,
    trip.destination,
  ]);

  useEffect(() => {
    let disposed = false;

    if (IS_EXPO_GO) {
      setSpeechRecognitionUnavailable(true);
      return () => {
        disposed = true;
      };
    }

    loadSpeechRecognitionModule().then((speechRecognitionModule) => {
      if (disposed || !speechRecognitionModule) return;

      speechRecognitionListenersRef.current.forEach((listener) => listener.remove());
      speechRecognitionListenersRef.current = [
        speechRecognitionModule.addListener('start', () => {
          setIsListening(true);
          setSpeechError('');
        }),
        speechRecognitionModule.addListener('end', () => {
          setIsListening(false);
        }),
        speechRecognitionModule.addListener('result', (event) => {
          const transcript = event.results?.[0]?.transcript?.trim();
          if (!transcript) return;

          setAiText(transcript);

          if (event.isFinal && transcript !== lastVoiceSubmitRef.current) {
            lastVoiceSubmitRef.current = transcript;
            submitAssistantCommand(transcript);
          }
        }),
        speechRecognitionModule.addListener('error', (event) => {
          setIsListening(false);
          if (event.error === 'aborted') return;

          const message =
            event.error === 'no-speech' || event.error === 'speech-timeout'
              ? 'Chưa nghe thấy giọng nói. Bạn có thể bấm mic thử lại hoặc nhập bằng bàn phím.'
              : 'Không nhận dạng được giọng nói. Bạn có thể nhập yêu cầu bằng bàn phím.';
          setSpeechError(message);
        }),
      ];
    });

    return () => {
      disposed = true;
      speechRecognitionListenersRef.current.forEach((listener) => listener.remove());
      speechRecognitionListenersRef.current = [];
    };
  }, [loadSpeechRecognitionModule, submitAssistantCommand]);

  const closeAssistant = useCallback(() => {
    if (isListening) {
      speechRecognitionModuleRef.current?.abort();
    }
    setAssistantVisible(false);
  }, [isListening]);

  const clearAssistantHoldTimer = useCallback(() => {
    if (assistantHoldTimerRef.current) {
      clearTimeout(assistantHoldTimerRef.current);
      assistantHoldTimerRef.current = null;
    }
  }, []);

  const endMicHold = useCallback(() => {
    clearAssistantHoldTimer();
    setIsMicHoldActive(false);
    speechRecognitionModuleRef.current?.stop();
  }, [clearAssistantHoldTimer]);

  const assistantPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          assistantDraggedRef.current = false;
          assistantLongPressedRef.current = false;
          assistantFabPos.stopAnimation();

          clearAssistantHoldTimer();
          assistantHoldTimerRef.current = setTimeout(() => {
            assistantLongPressedRef.current = true;
            setIsMicHoldActive(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleAssistantListening();
          }, ASSISTANT_LONG_PRESS_MS);
        },
        onPanResponderMove: (_, gestureState) => {
          const hasMoved =
            Math.abs(gestureState.dx) > ASSISTANT_DRAG_THRESHOLD ||
            Math.abs(gestureState.dy) > ASSISTANT_DRAG_THRESHOLD;

          if (hasMoved) {
            assistantDraggedRef.current = true;
            if (!assistantLongPressedRef.current) {
              clearAssistantHoldTimer();
            }
          }

          const nextX = Math.max(
            8,
            Math.min(
              SCREEN_WIDTH - ASSISTANT_BTN_SIZE - 8,
              assistantFabCurrentPos.current.x + gestureState.dx,
            ),
          );
          const nextY = Math.max(
            76,
            Math.min(
              SCREEN_HEIGHT - ASSISTANT_BTN_SIZE - 120,
              assistantFabCurrentPos.current.y + gestureState.dy,
            ),
          );

          assistantFabPos.setValue({ x: nextX, y: nextY });
        },
        onPanResponderRelease: (_, gestureState) => {
          clearAssistantHoldTimer();

          const finalX = Math.max(
            8,
            Math.min(
              SCREEN_WIDTH - ASSISTANT_BTN_SIZE - 8,
              assistantFabCurrentPos.current.x + gestureState.dx,
            ),
          );
          const finalY = Math.max(
            76,
            Math.min(
              SCREEN_HEIGHT - ASSISTANT_BTN_SIZE - 120,
              assistantFabCurrentPos.current.y + gestureState.dy,
            ),
          );

          assistantFabCurrentPos.current = { x: finalX, y: finalY };
          assistantFabPos.setValue({ x: finalX, y: finalY });

          if (assistantLongPressedRef.current) {
            endMicHold();
            return;
          }

          if (!assistantDraggedRef.current) {
            setAssistantVisible(true);
          }
        },
        onPanResponderTerminate: () => {
          if (assistantLongPressedRef.current) {
            endMicHold();
          } else {
            clearAssistantHoldTimer();
          }
        },
      }),
    [assistantFabPos, clearAssistantHoldTimer, endMicHold, handleAssistantListening],
  );

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
          <View style={styles.autoGenIconBox}>
            {isAutoGenerating ? (
              <ActivityIndicator size="small" color={BRAND} />
            ) : (
              <Feather name="zap" size={17} color={BRAND} />
            )}
          </View>
          <View style={styles.autoGenCopy}>
            <Text style={styles.autoGenBtnText}>
              {isAutoGenerating ? 'Đang lên lịch trình' : 'Tự động lên lịch trình'}
            </Text>
            <Text style={styles.autoGenBtnSubtext}>
              {isAutoGenerating
                ? 'Đang chọn địa điểm phù hợp...'
                : 'Gợi ý hoạt động cho các ngày trống'}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#A0AEC0" />
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
              <View
                style={[
                  styles.dayNumCircle,
                  { backgroundColor: getDayColor(day.date, uniqueDates) },
                ]}
              >
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

      {/* Assistant */}
      <RNAnimated.View
        style={[styles.assistantFabWrap, { transform: assistantFabPos.getTranslateTransform() }]}
        {...assistantPanResponder.panHandlers}
      >
        {(isListening || isMicHoldActive) && (
          <View style={styles.assistantListenPreview}>
            <VoiceWave />
            <Text style={styles.assistantListenText} numberOfLines={1}>
              {aiText.trim() || 'Đang nghe...'}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.assistantFab,
            (isListening || isMicHoldActive) && styles.assistantFabListening,
          ]}
        >
          <Feather name="mic" size={24} color="#FFF" />
        </View>
        {targetAssistantDay ? (
          <View style={styles.assistantFabBadge}>
            <Text style={styles.assistantFabBadgeText}>{targetAssistantDay.day}</Text>
          </View>
        ) : null}
      </RNAnimated.View>

      <Modal
        visible={assistantVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAssistant}
      >
        <KeyboardAvoidingView
          style={styles.assistantModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.assistantBackdrop} onPress={closeAssistant} />
          <View style={styles.assistantSheet}>
            <View style={styles.assistantHeader}>
              <View style={styles.assistantHeaderLeft}>
                <View style={styles.assistantBotIcon}>
                  <Feather name="message-circle" size={20} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.assistantTitle}>OwnTrip AI</Text>
                  <Text style={styles.assistantSubtitle}>
                    {targetAssistantDay
                      ? `Lịch trình Ngày ${targetAssistantDay.day}`
                      : 'Lịch trình'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.assistantCloseBtn} onPress={closeAssistant}>
                <Feather name="x" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.assistantChatArea} showsVerticalScrollIndicator={false}>
              <View style={[styles.assistantMessageBubble, styles.assistantBotBubble]}>
                <Text style={styles.assistantMessageText}>
                  {targetAssistantDay
                    ? `Mình đang sẵn sàng chỉnh Ngày ${targetAssistantDay.day}.`
                    : 'Bạn chọn ngày muốn chỉnh trước nhé.'}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.assistantDayList}
              >
                {days.map((day) => {
                  const selected = targetAssistantDay?.day === day.day;
                  return (
                    <TouchableOpacity
                      key={day.dayId}
                      style={[styles.assistantDayChip, selected && styles.assistantDayChipActive]}
                      activeOpacity={0.8}
                      onPress={() => setAssistantDayNumber(day.day)}
                    >
                      <Text
                        style={[
                          styles.assistantDayChipText,
                          selected && styles.assistantDayChipTextActive,
                        ]}
                      >
                        Ngày {day.day}
                      </Text>
                      <Text
                        style={[
                          styles.assistantDayChipDate,
                          selected && styles.assistantDayChipTextActive,
                        ]}
                      >
                        {formatDayDate(day.date)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {(speechError || speechRecognitionUnavailable || isListening) && (
                <View style={[styles.assistantMessageBubble, styles.assistantBotBubble]}>
                  <Text style={[styles.assistantMessageText, speechError && styles.assistantError]}>
                    {speechError ||
                      (speechRecognitionUnavailable
                        ? 'Expo Go chưa hỗ trợ mic ở đây, bạn nhập yêu cầu bằng bàn phím nhé.'
                        : 'Đang nghe...')}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.assistantInputRow}>
              <TouchableOpacity
                style={[styles.assistantMicBtn, isListening && styles.assistantMicBtnListening]}
                activeOpacity={0.82}
                onPress={handleAssistantListening}
                disabled={isProcessingVoice}
              >
                <Feather name={isListening ? 'square' : 'mic'} size={21} color="#FFF" />
              </TouchableOpacity>

              <TextInput
                style={styles.assistantInput}
                placeholder="Nói hoặc nhập yêu cầu..."
                placeholderTextColor="#A0AEC0"
                value={aiText}
                onChangeText={setAiText}
                onSubmitEditing={() => submitAssistantCommand()}
                editable={!isProcessingVoice}
                returnKeyType="send"
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.assistantSendBtn,
                  (!aiText.trim() || isProcessingVoice) && styles.assistantSendBtnDisabled,
                ]}
                activeOpacity={0.82}
                onPress={() => submitAssistantCommand()}
                disabled={!aiText.trim() || isProcessingVoice}
              >
                {isProcessingVoice ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Feather name="send" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

  // Assistant
  assistantFabWrap: {
    position: 'absolute',
    zIndex: 50,
    elevation: 20,
    width: ASSISTANT_BTN_SIZE,
    height: ASSISTANT_BTN_SIZE,
  },
  assistantFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.34,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
    }),
  },
  assistantFabListening: {
    backgroundColor: '#EF4444',
  },
  assistantFabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFAA00',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantFabBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  assistantListenPreview: {
    position: 'absolute',
    right: 66,
    top: 5,
    minWidth: 138,
    maxWidth: 190,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 9,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  assistantListenText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2B4A',
  },
  voiceWave: {
    width: 32,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  voiceWaveBar: {
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: BRAND,
  },
  assistantModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  assistantBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  assistantSheet: {
    height: '82%',
    backgroundColor: '#FAFBFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 20 },
    }),
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  assistantHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assistantBotIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantTitle: { fontSize: 18, fontWeight: '800', color: '#1A2B4A' },
  assistantSubtitle: { fontSize: 13, color: '#718096', marginTop: 1 },
  assistantCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantChatArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  assistantMessageBubble: {
    maxWidth: '84%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  assistantBotBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  assistantMessageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#2D3748',
  },
  assistantDayList: { gap: 8, paddingRight: 18, paddingBottom: 8 },
  assistantDayChip: {
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  assistantDayChipActive: {
    borderColor: BRAND,
    backgroundColor: BRAND,
  },
  assistantDayChipText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  assistantDayChipDate: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  assistantDayChipTextActive: { color: '#FFF' },
  assistantInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    gap: 10,
  },
  assistantMicBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantMicBtnListening: {
    backgroundColor: '#EF4444',
  },
  assistantInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A2B4A',
    textAlignVertical: 'center',
  },
  assistantSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantSendBtnDisabled: {
    backgroundColor: '#A0AEC0',
  },
  assistantError: {
    color: '#DC2626',
  },
  autoGenContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  autoGenBtn: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  autoGenBtnDisabled: {
    opacity: 0.7,
  },
  autoGenIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoGenCopy: {
    flex: 1,
    gap: 2,
  },
  autoGenBtnText: {
    color: '#1A2B4A',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  autoGenBtnSubtext: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});

function VoiceWave() {
  const bars = useRef([
    new RNAnimated.Value(0.45),
    new RNAnimated.Value(0.85),
    new RNAnimated.Value(0.6),
    new RNAnimated.Value(1),
  ]).current;

  useEffect(() => {
    const animations = bars.map((bar, index) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(bar, {
            toValue: 1,
            duration: 260 + index * 45,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          RNAnimated.timing(bar, {
            toValue: 0.38,
            duration: 260 + index * 45,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [bars]);

  return (
    <View style={styles.voiceWave}>
      {bars.map((bar, index) => (
        <RNAnimated.View
          key={index}
          style={[
            styles.voiceWaveBar,
            {
              opacity: bar.interpolate({
                inputRange: [0.38, 1],
                outputRange: [0.45, 1],
              }),
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

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
  dest,
  idx,
  isLast,
  dayNum,
  dayColor,
  imgErrors,
  onImageError,
  onDelete,
  onDragStart,
  onDragEnd,
  swipeableRefs,
  openSwipeable,
  onPress,
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
    <ReanimatedAnimated.View
      style={[{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 } }, animatedStyle]}
    >
      <View style={styles.timelineItem}>
        {/* Timeline line + dot */}
        <View style={styles.timelineTrack}>
          <View style={[styles.timelineDot, { backgroundColor: dayColor }]} />
          {!isLast && (
            <View style={[styles.timelineLine, { backgroundColor: dayColor, opacity: 0.25 }]} />
          )}
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
              <ReanimatedAnimated.View style={styles.dragHandle}>
                <Feather name="menu" size={14} color="#C5C8CE" />
              </ReanimatedAnimated.View>
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
    </ReanimatedAnimated.View>
  );
}
