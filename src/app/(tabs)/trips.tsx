import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
  StatusBar,
  Dimensions,
  Animated,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { tripService, Trip } from '@/services/tripService';
import { useConfirm } from '@/components/ConfirmProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SEGMENT_PADDING = 3;
const SEGMENT_HORIZONTAL_MARGIN = 24;
const SEGMENT_CONTAINER_WIDTH = SCREEN_WIDTH - SEGMENT_HORIZONTAL_MARGIN * 2 - SEGMENT_PADDING * 2;
const SEGMENT_COUNT = 3;
const SEGMENT_WIDTH = SEGMENT_CONTAINER_WIDTH / SEGMENT_COUNT;

const BRAND = '#4A7CFF';

type FilterType = 'all' | 'upcoming' | 'past';
const FILTERS: FilterType[] = ['all', 'upcoming', 'past'];

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${months[e.getMonth()]}, ${e.getFullYear()}`;
  }
  return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${months[e.getMonth()]}, ${e.getFullYear()}`;
}

function getDaysUntil(startDate: string): number {
  return Math.ceil((new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getTripStatus(trip: Trip) {
  const now = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (now > end) return 'past' as const;
  if (now >= start) return 'ongoing' as const;
  return 'upcoming' as const;
}

export default function TripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  // Swipeable refs — auto close other swipeables
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const openSwipeable = useRef<string | null>(null);

  // Animated sliding indicator
  const slideAnim = useRef(new Animated.Value(0)).current;

  const fetchTrips = useCallback(async () => {
    try {
      const data = await tripService.getMyTrips();
      setTrips(data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchTrips(); }, [fetchTrips]));

  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter === filter) return;
    Haptics.selectionAsync();
    setFilter(newFilter);

    const index = FILTERS.indexOf(newFilter);
    Animated.timing(slideAnim, {
      toValue: index * SEGMENT_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const { confirmDelete, alert: showAlert } = useConfirm();

  // Optimistic delete
  const handleDeleteTrip = async (trip: Trip) => {
    const confirmed = await confirmDelete(
      'Xóa chuyến đi',
      `Bạn có chắc muốn xóa "${trip.title}" không?`,
      'Xóa',
    );
    if (!confirmed) {
      swipeableRefs.current[trip._id]?.close();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Optimistic: remove from UI immediately
    const backup = [...trips];
    setTrips((prev) => prev.filter((t) => t._id !== trip._id));

    try {
      await tripService.deleteTrip(trip._id);
    } catch (error: any) {
      // Rollback on error
      setTrips(backup);
      const msg = error?.response?.data?.message || 'Không thể xóa chuyến đi';
      showAlert('Lỗi', msg, 'error');
    }
  };

  // Render swipeable right action — refined for tall cards
  const renderRightActions = (trip: Trip) => {
    return (
      <TouchableOpacity
        style={styles.swipeDeleteBtn}
        activeOpacity={0.7}
        onPress={() => handleDeleteTrip(trip)}
      >
        <View style={styles.swipeDeleteCircle}>
          <Feather name="trash-2" size={18} color="#EF4444" />
        </View>
        <Text style={styles.swipeDeleteText}>Xóa</Text>
      </TouchableOpacity>
    );
  };

  const filteredTrips = trips.filter((trip) => {
    const status = getTripStatus(trip);
    if (filter === 'upcoming') return status === 'upcoming';
    if (filter === 'past') return status === 'past';
    return true;
  });

  const counts = {
    all: trips.length,
    upcoming: trips.filter((t) => getTripStatus(t) === 'upcoming').length,
    past: trips.filter((t) => getTripStatus(t) === 'past').length,
  };

  const renderTrip = ({ item }: { item: Trip }) => {
    const status = getTripStatus(item);
    const daysUntil = getDaysUntil(item.startDate);

    return (
      <Swipeable
        ref={(ref) => { swipeableRefs.current[item._id] = ref; }}
        renderRightActions={() => renderRightActions(item)}
        rightThreshold={60}
        overshootRight={false}
        onSwipeableWillOpen={() => {
          // Close previously opened swipeable
          if (openSwipeable.current && openSwipeable.current !== item._id) {
            swipeableRefs.current[openSwipeable.current]?.close();
          }
          openSwipeable.current = item._id;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.95}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/trip/${item._id}` as any);
          }}
        >
          <View style={styles.cardImageBox}>
            <Image
              source={{ uri: item.provinceImage || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800' }}
              style={styles.cardImage}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.5)']}
              style={styles.cardOverlay}
            />

            {status === 'ongoing' && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Đang diễn ra</Text>
              </View>
            )}

            {status === 'upcoming' && daysUntil > 0 && daysUntil <= 30 && (
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownText}>
                  {daysUntil === 1 ? 'Ngày mai' : `Còn ${daysUntil}n`}
                </Text>
              </View>
            )}

            <View style={styles.cardImageContent}>
              <Text style={styles.cardImageTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardImageMeta}>
                {item.destination} · {item.totalDays} ngày
              </Text>
            </View>
          </View>

          <View style={styles.cardBottom}>
            <Feather name="calendar" size={13} color="#9CA3AF" />
            <Text style={styles.cardBottomText}>{formatDateRange(item.startDate, item.endDate)}</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteTrip(item);
              }}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              style={{ padding: 4, marginRight: 8 }}
            >
              <Feather name="trash-2" size={16} color="#EF4444" />
            </TouchableOpacity>
            <Feather name="chevron-right" size={16} color="#D1D5DB" />
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chuyến đi</Text>
        <TouchableOpacity
          style={styles.planBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/create-trip' as any);
          }}
        >
          <Feather name="edit-3" size={14} color="#FFF" />
          <Text style={styles.planBtnText}>Tạo chuyến đi</Text>
        </TouchableOpacity>
      </View>

      {/* ===== ANIMATED SEGMENTED CONTROL ===== */}
      <View style={styles.segmented}>
        {/* Sliding indicator */}
        <Animated.View
          style={[
            styles.segSlider,
            { width: SEGMENT_WIDTH, transform: [{ translateX: slideAnim }] },
          ]}
        />
        {FILTERS.map((key) => {
          const active = filter === key;
          const label = key === 'all' ? `Tất cả (${counts.all})`
            : key === 'upcoming' ? `Sắp đi (${counts.upcoming})`
            : `Đã đi (${counts.past})`;
          return (
            <TouchableOpacity
              key={key}
              style={styles.seg}
              onPress={() => handleFilterChange(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ===== CONTENT ===== */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      ) : filteredTrips.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="map" size={44} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {filter === 'all' ? 'Chưa có chuyến đi nào' : `Không có chuyến đi ${filter === 'upcoming' ? 'sắp tới' : 'đã qua'}`}
          </Text>
          <Text style={styles.emptySub}>
            Khi bạn lên kế hoạch, các chuyến đi sẽ hiện ở đây.
          </Text>
          {filter === 'all' && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/create-trip' as any)}
            >
              <Feather name="edit-3" size={15} color="#FFF" />
              <Text style={styles.emptyBtnText}>Lên kế hoạch đầu tiên</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item._id}
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTrips(); }}
              tintColor="#1A1A1A"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8,
  },
  headerTitle: { fontSize: 30, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.5 },

  // Plan Trip button — text CTA, not icon-only
  planBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: BRAND,
  },
  planBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  // Animated Segmented Control
  segmented: {
    flexDirection: 'row', marginHorizontal: SEGMENT_HORIZONTAL_MARGIN, marginBottom: 16,
    backgroundColor: '#F3F4F6', borderRadius: 10, padding: SEGMENT_PADDING,
    position: 'relative',
  },
  segSlider: {
    position: 'absolute',
    top: SEGMENT_PADDING, bottom: SEGMENT_PADDING, left: SEGMENT_PADDING,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  seg: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', zIndex: 1 },
  segText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  segTextActive: { color: '#1A1A1A' },

  // List
  list: { paddingHorizontal: 24, paddingBottom: 120 },

  // Card
  card: {
    marginBottom: 16, borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  cardImageBox: { width: '100%', height: 200, position: 'relative', backgroundColor: '#F3F4F6' },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: { ...StyleSheet.absoluteFillObject },

  liveIndicator: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#34D399' },
  liveText: { fontSize: 10, fontWeight: '600', color: '#FFF' },

  countdownBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  countdownText: { fontSize: 11, fontWeight: '700', color: '#1A1A1A' },

  cardImageContent: { position: 'absolute', bottom: 14, left: 14, right: 14 },
  cardImageTitle: {
    fontSize: 20, fontWeight: '700', color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  cardImageMeta: {
    fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },

  cardBottom: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6',
  },
  cardBottomText: { fontSize: 13, color: '#6B7280' },

  // Swipe delete — soft bg + white circle icon
  swipeDeleteBtn: {
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 16,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    gap: 6,
  },
  swipeDeleteCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  swipeDeleteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: BRAND, borderRadius: 10,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
