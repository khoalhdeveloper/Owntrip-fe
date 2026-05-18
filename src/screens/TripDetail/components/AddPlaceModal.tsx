import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { placesService, Place } from '@/services/placesService';
import { tripService, AddPlaceBody } from '@/services/tripService';
import { useConfirm } from '@/components/ConfirmProvider';

const BRAND = '#4A7CFF';

// Quick search categories — small text pills only
const CATEGORIES = [
  { label: 'Nhà hàng', query: 'nhà hàng' },
  { label: 'Cà phê', query: 'quán cafe' },
  { label: 'Tham quan', query: 'điểm du lịch' },
  { label: 'Khách sạn', query: 'khách sạn' },
  { label: 'Mua sắm', query: 'mua sắm' },
  { label: 'Giải trí', query: 'bar pub' },
];

// Suggested places by destination
function getSuggestedPlaces(destination: string): Place[] {
  const lower = destination.toLowerCase();

  if (lower.includes('vung tau') || lower.includes('vũng tàu') || lower.includes('ba ria')) {
    return [
      {
        placeId: 'suggest_vt_1',
        name: 'Bãi Sau - Long Beach',
        address: 'Thùy Vân, Phường 2, Vũng Tàu',
        latitude: 10.3365,
        longitude: 107.0903,
        rating: 4.5,
        types: ['beach'],
        mapUrl: 'https://maps.google.com/?cid=1',
        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop',
        photos: [],
      },
      {
        placeId: 'suggest_vt_2',
        name: 'Tượng Chúa Kitô Vũng Tàu',
        address: '01 Hạ Long, Phường 1, Vũng Tàu',
        latitude: 10.3271,
        longitude: 107.0952,
        rating: 4.7,
        types: ['landmark'],
        mapUrl: 'https://maps.google.com/?cid=2',
        photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=200&fit=crop',
        photos: [],
      },
      {
        placeId: 'suggest_vt_3',
        name: 'Hải Đăng Vũng Tàu',
        address: 'Hải Đăng, Phường 2, Vũng Tàu',
        latitude: 10.3288,
        longitude: 107.0844,
        rating: 4.4,
        types: ['lighthouse'],
        mapUrl: 'https://maps.google.com/?cid=3',
        photo: 'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=200&h=200&fit=crop',
        photos: [],
      },
      {
        placeId: 'suggest_vt_4',
        name: 'Bạch Dinh - White Palace',
        address: 'Trần Phú, Phường 1, Vũng Tàu',
        latitude: 10.331,
        longitude: 107.078,
        rating: 4.3,
        types: ['museum'],
        mapUrl: 'https://maps.google.com/?cid=4',
        photo: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=200&h=200&fit=crop',
        photos: [],
      },
    ];
  }

  if (lower.includes('ha noi') || lower.includes('hà nội')) {
    return [
      {
        placeId: 'suggest_hn_1',
        name: 'Hồ Hoàn Kiếm',
        address: 'Phố Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội',
        latitude: 21.0285,
        longitude: 105.8542,
        rating: 4.7,
        types: ['lake'],
        mapUrl: 'https://maps.google.com/?cid=10',
        photo: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=200&h=200&fit=crop',
        photos: [],
      },
      {
        placeId: 'suggest_hn_2',
        name: 'Phố Cổ Hà Nội',
        address: 'Hoàn Kiếm, Hà Nội',
        latitude: 21.034,
        longitude: 105.85,
        rating: 4.6,
        types: ['neighborhood'],
        mapUrl: 'https://maps.google.com/?cid=11',
        photo: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=200&h=200&fit=crop',
        photos: [],
      },
      {
        placeId: 'suggest_hn_3',
        name: 'Văn Miếu - Quốc Tử Giám',
        address: '58 Quốc Tử Giám, Đống Đa, Hà Nội',
        latitude: 21.0277,
        longitude: 105.8355,
        rating: 4.5,
        types: ['temple'],
        mapUrl: 'https://maps.google.com/?cid=12',
        photo: 'https://images.unsplash.com/photo-1555921015-5532091f6026?w=200&h=200&fit=crop',
        photos: [],
      },
      {
        placeId: 'suggest_hn_4',
        name: 'Lăng Chủ tịch Hồ Chí Minh',
        address: '2 Hùng Vương, Ba Đình, Hà Nội',
        latitude: 21.0368,
        longitude: 105.8344,
        rating: 4.8,
        types: ['landmark'],
        mapUrl: 'https://maps.google.com/?cid=13',
        photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=200&fit=crop',
        photos: [],
      },
    ];
  }

  // Default
  return [
    {
      placeId: 'suggest_default_1',
      name: 'Chợ Bến Thành',
      address: 'Lê Lợi, Quận 1, TP. Hồ Chí Minh',
      latitude: 10.7721,
      longitude: 106.698,
      rating: 4.4,
      types: ['market'],
      mapUrl: 'https://maps.google.com/?cid=20',
      photo: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=200&h=200&fit=crop',
      photos: [],
    },
    {
      placeId: 'suggest_default_2',
      name: 'Nhà thờ Đức Bà',
      address: '01 Công xã Paris, Quận 1, TP. Hồ Chí Minh',
      latitude: 10.7797,
      longitude: 106.699,
      rating: 4.6,
      types: ['church'],
      mapUrl: 'https://maps.google.com/?cid=21',
      photo: 'https://images.unsplash.com/photo-1555921015-5532091f6026?w=200&h=200&fit=crop',
      photos: [],
    },
    {
      placeId: 'suggest_default_3',
      name: 'Bưu điện Trung tâm',
      address: '2 Công xã Paris, Quận 1, TP. Hồ Chí Minh',
      latitude: 10.7799,
      longitude: 106.7,
      rating: 4.5,
      types: ['landmark'],
      mapUrl: 'https://maps.google.com/?cid=22',
      photo: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=200&h=200&fit=crop',
      photos: [],
    },
  ];
}

interface AddPlaceModalProps {
  visible: boolean;
  onClose: () => void;
  dayId: string;
  dayNumber: number;
  tripDestination: string;
  existingPlaceIds?: string[];
  onPlaceAdded: () => void;
}

export default function AddPlaceModal({
  visible,
  onClose,
  dayId,
  dayNumber,
  tripDestination,
  existingPlaceIds = [],
  onPlaceAdded,
}: AddPlaceModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [searchError, setSearchError] = useState(false);
  const { alert: showAlert } = useConfirm();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggested = useMemo(() => getSuggestedPlaces(tripDestination), [tripDestination]);

  const handleSearch = useCallback((text: string, category?: string | null) => {
    setQuery(text);
    setSearchError(false);
    if (category !== undefined) setActiveCategory(category);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setSearching(true);
        const places = await placesService.searchText({ q: text.trim() });
        setResults(places);
      } catch (e: any) {
        console.warn('Search error:', e?.message);
        setSearchError(true);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleCategoryTap = (cat: { label: string; query: string }) => {
    if (activeCategory === cat.label) {
      setActiveCategory(null);
      handleSearch('', null);
      return;
    }
    const searchText = `${cat.query} ${tripDestination}`;
    handleSearch(searchText, cat.label);
  };

  const handleAddPlace = async (place: Place) => {
    if (existingPlaceIds.includes(place.placeId)) return;

    try {
      setAdding(place.placeId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const body: AddPlaceBody = {
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        totalReviews: place.totalReviews,
        photo: place.photo || undefined,
        mapUrl: place.mapUrl,
      };

      await tripService.addPlaceToDay(dayId, body);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
      onPlaceAdded();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Không thể thêm địa điểm';
      showAlert('Lỗi', msg, 'error');
    } finally {
      setAdding(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSearching(false);
    setSearchError(false);
    setActiveCategory(null);
    onClose();
  };

  // ===== RENDER PLACE ROW — Apple Maps style =====
  const renderRow = (item: Place, isLast: boolean) => {
    const isAdding = adding === item.placeId;
    const isAdded = existingPlaceIds.includes(item.placeId);

    return (
      <View key={item.placeId}>
        <TouchableOpacity
          style={[styles.row, isAdded && styles.rowDisabled]}
          activeOpacity={isAdded ? 1 : 0.6}
          onPress={() => !isAdded && handleAddPlace(item)}
          disabled={!!adding || isAdded}
        >
          {/* Thumbnail */}
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Feather name="map-pin" size={16} color="#C4C4C4" />
            </View>
          )}

          {/* Text */}
          <View style={styles.rowText}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowAddr} numberOfLines={1}>
              {item.address}
            </Text>
            {item.rating ? (
              <View style={styles.rowRating}>
                <Feather name="star" size={10} color="#F59E0B" />
                <Text style={styles.rowRatingVal}>{item.rating}</Text>
              </View>
            ) : null}
          </View>

          {/* Action */}
          {isAdded ? (
            <Feather name="check-circle" size={22} color="#10B981" />
          ) : isAdding ? (
            <ActivityIndicator size="small" color={BRAND} />
          ) : (
            <Feather name="plus-circle" size={22} color={BRAND} />
          )}
        </TouchableOpacity>
        {!isLast && <View style={styles.divider} />}
      </View>
    );
  };

  // Build display list
  const displayList = results.length > 0 ? results : query.length < 2 ? suggested : [];
  const sectionTitle =
    results.length > 0 ? `${results.length} kết quả` : `Phổ biến tại ${tripDestination}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ===== HANDLE BAR ===== */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thêm vào Ngày {dayNumber}</Text>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* ===== SEARCH BAR ===== */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Tìm kiếm tại ${tripDestination}`}
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={(t) => handleSearch(t)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('', null)}>
              <Feather name="x-circle" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>

        {/* ===== QUICK FILTERS ===== */}
        <View style={styles.pillsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pills}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.label;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={styles.pill}
                  activeOpacity={0.6}
                  onPress={() => handleCategoryTap(cat)}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {cat.label}
                  </Text>
                  {active && <View style={styles.pillUnderline} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ===== ERROR BANNER ===== */}
        {searchError && (
          <View style={styles.errorBanner}>
            <Feather name="wifi-off" size={13} color="#92400E" />
            <Text style={styles.errorText}>
              Tìm kiếm không khả dụng. Hãy thử các gợi ý dưới đây.
            </Text>
          </View>
        )}

        {/* ===== CONTENT ===== */}
        {searching ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : displayList.length > 0 ? (
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            {displayList.map((place, idx) => renderRow(place, idx === displayList.length - 1))}
          </ScrollView>
        ) : query.length >= 2 && !searchError ? (
          <View style={styles.center}>
            <Feather name="search" size={32} color="#E5E7EB" />
            <Text style={styles.emptyText}>Không tìm thấy kết quả cho &quot;{query}&quot;</Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ===== STYLES — clean, white, Apple Maps inspired =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Handle bar
  handleBar: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    paddingVertical: 0,
  },

  // Pills wrapper — FIXED height, prevents flex expansion
  pillsWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  pills: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 20,
  },
  pill: {
    alignItems: 'center',
  },
  pillText: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  pillTextActive: { color: '#1A1A1A', fontWeight: '600' },
  pillUnderline: {
    marginTop: 6,
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#1A1A1A',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
  },
  errorText: { fontSize: 13, color: '#92400E', flex: 1 },

  // List
  listScroll: { flex: 1 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 12,
  },

  // Place row — clean, no card, divider-separated
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowDisabled: { opacity: 0.45 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  thumbEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1, gap: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  rowAddr: { fontSize: 13, color: '#9CA3AF' },
  rowRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  rowRatingVal: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F3F4F6', marginLeft: 60 },

  // Center / empty
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
