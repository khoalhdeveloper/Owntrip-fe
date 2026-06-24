import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { tripService, Trip, TripDay } from '@/services/tripService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 260;
const BRAND = '#4A7CFF';

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export default function SharedTripDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { shareToken } = useLocalSearchParams<{ shareToken: string }>();
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSharedTrip = async () => {
      try {
        if (!shareToken) return;
        const res = await tripService.getSharedTrip(shareToken);
        if (res && res.success) {
          setTrip(res.trip);
          setDays(res.days);
        }
      } catch (error) {
        console.error('Error fetching shared trip:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSharedTrip();
  }, [shareToken]);

  const headerImageOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const headerImageTranslate = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -15],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Đang tải chuyến đi được chia sẻ...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Feather name="alert-circle" size={44} color="#D1D5DB" />
        <Text style={styles.loadingText}>Không tìm thấy chuyến đi, hoặc link đã bị hủy.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Text style={styles.backButtonText}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Animated.Image
          source={{
            uri: trip.provinceImage || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=1200',
          }}
          style={[styles.headerImage, { opacity: headerImageOpacity, transform: [{ translateY: headerImageTranslate }] }]}
        />
        <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/');
            }}
          >
            <Feather name="home" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Chỉ xem</Text>
          </View>
        </View>

        <Animated.View style={[styles.headerInfo, { transform: [{ translateY: titleTranslateY }] }]}>
          <Text style={styles.headerTitle} numberOfLines={2}>{trip.title}</Text>
          <Text style={styles.headerMeta}>
            {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)} · {trip.totalDays} ngày
          </Text>
        </Animated.View>
      </View>

      {/* CONTENT */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <View style={styles.warningBox}>
          <Feather name="info" size={16} color="#3B82F6" />
          <Text style={styles.warningText}>Bạn đang xem chuyến đi được chia sẻ ở chế độ chỉ xem.</Text>
        </View>

        {/* ACCOMMODATION */}
        {trip.accommodation && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Feather name="home" size={16} color={BRAND} />
              <Text style={styles.sectionTitle}>Chỗ ở</Text>
            </View>
            <View style={styles.accBox}>
              {trip.accommodation.hotelImage ? (
                <Image source={{ uri: trip.accommodation.hotelImage }} style={styles.accImg} />
              ) : (
                <View style={[styles.accImg, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                  <Feather name="image" size={20} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.accInfo}>
                <Text style={styles.accName} numberOfLines={2}>{trip.accommodation.hotelName}</Text>
                <Text style={styles.accDate}>
                  {formatDateShort(trip.accommodation.checkIn)} – {formatDateShort(trip.accommodation.checkOut)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ITINERARY */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Feather name="map" size={16} color={BRAND} />
            <Text style={styles.sectionTitle}>Lịch trình chi tiết</Text>
          </View>
          
          {days.length === 0 && (
            <Text style={styles.emptyText}>Chưa có địa điểm nào trong lịch trình.</Text>
          )}

          {days.map((day) => (
            <View key={day.dayId} style={styles.dayBox}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>Ngày {day.day}</Text>
                <Text style={styles.dayDate}>{formatDateShort(day.date)}</Text>
              </View>

              {day.places.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có lịch trình cho ngày này.</Text>
              ) : (
                day.places.map((place, idx) => (
                  <View key={place.placeId || idx.toString()} style={styles.placeRow}>
                    <View style={styles.placeDot} />
                    {idx < day.places.length - 1 && <View style={styles.placeLine} />}
                    <View style={styles.placeContent}>
                      <Text style={styles.placeName}>{place.name}</Text>
                      {place.address ? <Text style={styles.placeAddr} numberOfLines={2}>{place.address}</Text> : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          ))}
        </View>

        {/* NOTES */}
        {trip.notes && trip.notes.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Feather name="file-text" size={16} color={BRAND} />
              <Text style={styles.sectionTitle}>Ghi chú</Text>
            </View>
            {trip.notes.map((n, i) => (
              <Text key={i} style={styles.noteItem}>• {n}</Text>
            ))}
          </View>
        )}

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  backButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: BRAND, borderRadius: 8 },
  backButtonText: { color: '#FFF', fontWeight: '600' },

  header: { height: HEADER_HEIGHT, position: 'relative', overflow: 'hidden', backgroundColor: '#1A1A1A' },
  headerImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, zIndex: 10 },
  topBarBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  headerInfo: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  headerMeta: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40, padding: 16 },

  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
  warningText: { fontSize: 13, color: '#1E3A8A', flex: 1 },

  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  accBox: { flexDirection: 'row', gap: 12 },
  accImg: { width: 60, height: 60, borderRadius: 8 },
  accInfo: { flex: 1, justifyContent: 'center' },
  accName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  accDate: { fontSize: 13, color: '#6B7280' },

  emptyText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 8 },

  dayBox: { marginBottom: 20 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dayTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dayDate: { fontSize: 13, color: '#6B7280' },

  placeRow: { flexDirection: 'row', marginBottom: 12, position: 'relative' },
  placeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: BRAND, marginTop: 4, zIndex: 2 },
  placeLine: { position: 'absolute', top: 16, left: 5, bottom: -12, width: 2, backgroundColor: '#E5E7EB', zIndex: 1 },
  placeContent: { flex: 1, marginLeft: 12 },
  placeName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  placeAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  noteItem: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 4 },
});
