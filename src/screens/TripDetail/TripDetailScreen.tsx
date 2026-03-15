import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { tripService, Trip, TripDay } from '@/services/tripService';
import SummaryTab from './components/SummaryTab';
import ItineraryTab from './components/ItineraryTab';
import ExploreTab from './components/ExploreTab';
import JournalTab from './components/JournalTab';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 260;

interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const TABS: TabItem[] = [
  { key: 'summary', label: 'Tổng quan', icon: 'grid' },
  { key: 'itinerary', label: 'Lịch trình', icon: 'calendar' },
  { key: 'explore', label: 'Khám phá', icon: 'compass' },
  { key: 'journal', label: 'Nhật ký', icon: 'book-open' },
];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export default function TripDetailScreen({ tripId }: { tripId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<Animated.LegacyRef<any>>(null) as any;

  const handleScrollToMap = useCallback(() => {
    scrollViewRef.current?.scrollTo?.({ y: 0, animated: true });
  }, []);

  const [activeTab, setActiveTab] = useState('summary');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrip = useCallback(async () => {
    try {
      const detail = await tripService.getTripById(tripId);
      if (detail) {
        setTrip(detail.trip);
        setDays(detail.days);
      }
    } catch (error) {
      console.error('Error fetching trip:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => { fetchTrip(); }, [fetchTrip]);

  const handleTabPress = (tabKey: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tabKey);
    Animated.timing(tabIndicatorAnim, {
      toValue: index,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Parallax — ONLY use native-driver-safe transforms (opacity, translateY)
  // NO height animation = no jank
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

  // Tab indicator
  const TAB_WIDTH = SCREEN_WIDTH / TABS.length;
  const indicatorTranslateX = tabIndicatorAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => i * TAB_WIDTH + 8),
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Đang tải chuyến đi...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Feather name="alert-circle" size={44} color="#D1D5DB" />
        <Text style={styles.loadingText}>Không tìm thấy chuyến đi</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderTabContent = () => {
    return (
      <>
        <View style={{ display: activeTab === 'summary' ? 'flex' : 'none' }}>
          <SummaryTab trip={trip} days={days} />
        </View>
        <View style={{ display: activeTab === 'itinerary' ? 'flex' : 'none' }}>
          <ItineraryTab trip={trip} days={days} />
        </View>
        <View style={{ display: activeTab === 'explore' ? 'flex' : 'none' }}>
          <ExploreTab trip={trip} days={days} />
        </View>
        <View style={{ display: activeTab === 'journal' ? 'flex' : 'none' }}>
          <JournalTab trip={trip} days={days} onScrollToMap={handleScrollToMap} />
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ===== STATIC HEIGHT HEADER — no height animation = no jank ===== */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Animated.Image
          source={{
            uri: trip.provinceImage || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=1200',
          }}
          style={[
            styles.headerImage,
            { opacity: headerImageOpacity, transform: [{ translateY: headerImageTranslate }] },
          ]}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          >
            <Feather name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.topBarBtn}>
              <Feather name="share-2" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topBarBtn}>
              <Feather name="more-horizontal" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trip Info */}
        <Animated.View style={[styles.headerInfo, { transform: [{ translateY: titleTranslateY }] }]}>
          <Text style={styles.headerTitle} numberOfLines={2}>{trip.title}</Text>
          <Text style={styles.headerMeta}>
            {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)} · {trip.totalDays} ngày
          </Text>
        </Animated.View>
      </View>

      {/* ===== TAB BAR ===== */}
      <View style={styles.tabBar}>
        <Animated.View
          style={[styles.tabIndicator, {
            width: TAB_WIDTH - 16,
            transform: [{ translateX: indicatorTranslateX }],
          }]}
        />
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key, index)}
              activeOpacity={0.7}
            >
              <Feather name={tab.icon} size={18} color={isActive ? '#1A1A1A' : '#9CA3AF'} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ===== CONTENT — useNativeDriver: true ===== */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTrip(); }} tintColor="#1A1A1A" />
        }
      >
        {renderTabContent()}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', gap: 12,
  },
  loadingText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  backButton: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#4A7CFF', borderRadius: 10,
  },
  backButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  // Header — static height, no jank
  header: {
    height: HEADER_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined, height: undefined, resizeMode: 'cover',
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, zIndex: 10,
  },
  topBarRight: { flexDirection: 'row', gap: 8 },
  topBarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
  },
  headerTitle: {
    fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  headerMeta: {
    fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },

  // Tab Bar — neutral colors
  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    position: 'relative',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  tabLabelActive: { color: '#1A1A1A' },
  tabIndicator: {
    position: 'absolute', bottom: 0, height: 2,
    borderRadius: 1, backgroundColor: '#4A7CFF',
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  comingSoonContainer: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 8,
  },
  comingSoonTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  comingSoonText: { fontSize: 14, color: '#9CA3AF' },
});
