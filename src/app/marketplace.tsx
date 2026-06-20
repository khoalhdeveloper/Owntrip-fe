import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  TextInput,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { tripService, Trip } from '@/services/tripService';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (width - GRID_PADDING * 2 - CARD_GAP) / 2;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'price_asc', label: 'Giá tăng' },
  { key: 'price_desc', label: 'Giá giảm' },
  { key: 'rating', label: 'Đánh giá' },
  { key: 'popular', label: 'Phổ biến' },
];

const DAY_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: '1-3', label: '1-3 ngày' },
  { key: '4-7', label: '4-7 ngày' },
  { key: '8+', label: '8+ ngày' },
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('newest');
  const [dayFilter, setDayFilter] = useState('all');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const list = await tripService.getMarketplaceTrips(1, 100);
      setTrips(list);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadTrips(); }, [loadTrips]));

  const getDayCount = (trip: Trip) => {
    if (trip.totalDays) return trip.totalDays;
    if (trip.startDate && trip.endDate) {
      const diff = Math.round(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return diff > 0 ? diff : 1;
    }
    return 1;
  };

  const filtered = useMemo(() => {
    let result = [...trips];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.destination?.toLowerCase().includes(q) ||
          t.province?.toLowerCase().includes(q)
      );
    }

    // Day filter
    if (dayFilter !== 'all') {
      result = result.filter((t) => {
        const days = getDayCount(t);
        if (dayFilter === '1-3') return days >= 1 && days <= 3;
        if (dayFilter === '4-7') return days >= 4 && days <= 7;
        if (dayFilter === '8+') return days >= 8;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortKey === 'price_asc') return (a.price ?? 0) - (b.price ?? 0);
      if (sortKey === 'price_desc') return (b.price ?? 0) - (a.price ?? 0);
      if (sortKey === 'rating') return (b.averageRating ?? 0) - (a.averageRating ?? 0);
      if (sortKey === 'popular') return (b.soldCount ?? 0) - (a.soldCount ?? 0);
      // newest — giữ thứ tự gốc
      return 0;
    });

    return result;
  }, [trips, search, sortKey, dayFilter]);

  const handlePurchase = useCallback(
    async (trip: Trip) => {
      if (purchasingId) return;

      setPurchasingId(trip._id);
      try {
        const res = await tripService.purchaseTrip(trip._id);
        if (!res?.success) {
          Alert.alert('Không mua được', res?.message || 'Bạn thử lại sau nhé.');
          return;
        }

        if (res.tripId) {
          router.push(`/trip/${res.tripId}` as any);
          return;
        }

        if (res.paymentUrl) {
          await Linking.openURL(res.paymentUrl);
          return;
        }

        Alert.alert('Đã gửi yêu cầu', res.message || 'Vui lòng kiểm tra lại lịch trình của bạn.');
      } catch {
        Alert.alert('Không mua được', 'Bạn thử lại sau nhé.');
      } finally {
        setPurchasingId(null);
      }
    },
    [purchasingId, router],
  );

  const renderCard = ({ item: trip }: { item: Trip }) => {
    const days = getDayCount(trip);
    const coverImage = trip.provinceImage || trip.accommodation?.hotelImage;
    return (
      <TouchableOpacity
        style={styles.tripCard}
        activeOpacity={0.88}
        onPress={() => router.push(`/trip/${trip._id}` as any)}
      >
        <View style={styles.tripImageWrap}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.tripImage} />
          ) : (
            <View style={[styles.tripImage, styles.tripImagePlaceholder]}>
              <Feather name="map-pin" size={28} color="#94A3B8" />
            </View>
          )}
          <View style={styles.tripDayBadge}>
            <Text style={styles.tripDayBadgeText}>{days} NGÀY</Text>
          </View>
        </View>

        <View style={styles.tripCardBody}>
          <Text style={styles.tripCardTitle} numberOfLines={1}>
            {trip.title}
          </Text>
          <View style={styles.tripLocationRow}>
            <Feather name="map-pin" size={11} color="#64748B" />
            <Text style={styles.tripLocationText} numberOfLines={1}>
              {trip.destination || trip.province}
            </Text>
          </View>
          <View style={styles.tripBottomRow}>
            <Text style={styles.tripPrice}>
              {(trip.price ?? 0).toLocaleString()}đ
            </Text>
            <View style={styles.tripRatingRow}>
              <Feather name="star" size={11} color="#F59E0B" />
              <Text style={styles.tripRatingText}>
                {trip.averageRating?.toFixed(1) ?? '5.0'} ({trip.soldCount ?? 0})
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.purchaseBtn}
            activeOpacity={0.85}
            onPress={(event) => {
              event.stopPropagation();
              handlePurchase(trip);
            }}
            disabled={purchasingId === trip._id}
          >
            {purchasingId === trip._id ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Feather name="shopping-bag" size={13} color="#FFF" />
                <Text style={styles.purchaseBtnText}>Dùng plan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan đang bán</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên, địa điểm..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort chips */}
        <View style={styles.chipRow}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, sortKey === opt.key && styles.chipActive]}
              onPress={() => setSortKey(opt.key)}
            >
              <Text style={[styles.chipText, sortKey === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Day filter chips */}
        <View style={[styles.chipRow, { paddingTop: 4, paddingBottom: 8 }]}>
          {DAY_FILTERS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, styles.chipDay, dayFilter === opt.key && styles.chipDayActive]}
              onPress={() => setDayFilter(opt.key)}
            >
              <Text style={[styles.chipText, dayFilter === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Result count */}
        {!loading && (
          <Text style={styles.resultCount}>{filtered.length} plan</Text>
        )}

        {/* Grid */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="map" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Không tìm thấy plan nào</Text>
            <Text style={styles.emptySubtitle}>Thử thay đổi từ khóa hoặc bộ lọc</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderCard}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },

  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  chipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipDay: {
    backgroundColor: '#FFF',
    borderColor: '#E2E8F0',
  },
  chipDayActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },

  resultCount: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },

  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 100,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  tripCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  tripImageWrap: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  tripImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  tripImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripDayBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tripDayBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  tripCardBody: { padding: 10 },
  tripCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 3 },
  tripLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  tripLocationText: { fontSize: 11, color: '#64748B', flex: 1 },
  tripBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripPrice: { fontSize: 13, fontWeight: '800', color: '#10B981' },
  tripRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tripRatingText: { fontSize: 10, color: '#64748B' },
  purchaseBtn: {
    minHeight: 34,
    marginTop: 9,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  purchaseBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 14 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8' },
});
