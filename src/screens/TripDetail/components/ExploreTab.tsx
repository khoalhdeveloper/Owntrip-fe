import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { placesService, Place } from '@/services/placesService';
import { Trip, TripDay, tripService, AddPlaceBody } from '@/services/tripService';
import { useConfirm } from '@/components/ConfirmProvider';
import PlaceDetailModal from './PlaceDetailModal';

/* ─── Brand ─── */
const BRAND = '#4A7CFF';

/* ─── Categories ─── */
interface Category {
  key: string;
  label: string;
  emoji: string;
  apiType: string; // sent to API as `type` param
}

const CATEGORIES: Category[] = [
  { key: 'all', label: 'Tất cả', emoji: '📍', apiType: '' },
  { key: 'restaurant', label: 'Nhà hàng', emoji: '🍽️', apiType: 'restaurant' },
  { key: 'cafe', label: 'Cà phê', emoji: '☕', apiType: 'cafe' },
  { key: 'attraction', label: 'Tham quan', emoji: '🏛️', apiType: 'tourist_attraction' },
  { key: 'lodging', label: 'Khách sạn', emoji: '🏨', apiType: 'lodging' },
  { key: 'shopping', label: 'Mua sắm', emoji: '🛍️', apiType: 'shopping_mall' },
  { key: 'nightlife', label: 'Giải trí', emoji: '🌙', apiType: 'bar' },
];

/* ─── Helpers ─── */
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

/* ─── Component ─── */
interface ExploreTabProps {
  trip: Trip;
  days: TripDay[];
}

export default function ExploreTab({ trip, days }: ExploreTabProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Multi-select edit mode for saved places
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Add to trip modal
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const { alert: showAlert, confirmDelete } = useConfirm();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const STORAGE_KEY = `explore_saved_${trip._id}`;

  /* ─── Saved place IDs for quick lookup ─── */
  const savedPlaceIds = useMemo(() => new Set(savedPlaces.map((p) => p.placeId)), [savedPlaces]);

  /* ─── Already-added place IDs (to mark them) ─── */
  const addedPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const day of days) {
      for (const p of day.places || []) {
        ids.add(p.placeId);
      }
    }
    return ids;
  }, [days]);

  /* ─── Load saved places from AsyncStorage ─── */
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setSavedPlaces(JSON.parse(stored));
      } catch {
        console.warn('Failed to load saved places');
      }
    })();
  }, [STORAGE_KEY]);

  /* ─── Extract coordinates from trip data ─── */
  useEffect(() => {
    for (const day of days) {
      if (day.places && day.places.length > 0) {
        const p = day.places[0];
        if (p.latitude && p.longitude) {
          setCoords({ lat: p.latitude, lng: p.longitude });
          return;
        }
      }
    }
    (async () => {
      try {
        const results = await placesService.searchText({
          q: trip.destination || trip.province,
          limit: 1,
        });
        if (results.length > 0) {
          setCoords({ lat: results[0].latitude, lng: results[0].longitude });
        }
      } catch {
        console.warn('Could not geocode trip destination');
      }
    })();
  }, [days, trip.destination, trip.province]);

  /* ─── Fetch places (per-category API call) ─── */
  const fetchPlaces = useCallback(
    async (category?: string, query?: string) => {
      if (!coords) return;
      setLoading(true);
      try {
        let result: Place[];
        if (query && query.trim().length > 0) {
          // Text search with location bias
          result = await placesService.searchText({
            q: query,
            lat: coords.lat,
            lng: coords.lng,
            radius: 5000,
            limit: 30,
          });
        } else {
          // Category-specific API call
          const cat = CATEGORIES.find((c) => c.key === (category || activeCategory));
          const typeParam = cat?.apiType || '';
          result = await placesService.searchNearby({
            lat: coords.lat,
            lng: coords.lng,
            radius: 5000,
            ...(typeParam ? { type: typeParam } : {}),
          });
        }
        setPlaces(result);
      } catch (error) {
        console.error('Error fetching explore places:', error);
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    },
    [coords, activeCategory],
  );

  /* ─── Auto-fetch on coords/category change ─── */
  useEffect(() => {
    if (coords) fetchPlaces(activeCategory);
  }, [coords, activeCategory, fetchPlaces]);

  /* ─── Debounced search ─── */
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (text.trim().length > 0) {
          fetchPlaces(activeCategory, text);
        } else {
          fetchPlaces(activeCategory);
        }
      }, 500);
    },
    [fetchPlaces, activeCategory],
  );

  /* ─── Category select ─── */
  const handleCategoryPress = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(key);
  }, []);

  /* ─── Bookmark toggle (persist to AsyncStorage) ─── */
  const toggleSave = useCallback(
    (place: Place) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSavedPlaces((prev) => {
        const exists = prev.some((p) => p.placeId === place.placeId);
        const next = exists ? prev.filter((p) => p.placeId !== place.placeId) : [...prev, place];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        // Exit edit mode if fewer than 2 saved places remain
        if (next.length < 2) {
          setEditMode(false);
          setSelectedIds(new Set());
        }
        return next;
      });
    },
    [STORAGE_KEY],
  );

  /* ─── Add to trip ─── */
  const handleAddToTrip = useCallback((place: Place) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlace(place);
    setShowDayPicker(true);
  }, []);

  const handleConfirmAddToDay = useCallback(
    async (dayId: string) => {
      if (!selectedPlace) return;
      setAddingToDay(dayId);
      try {
        const body: AddPlaceBody = {
          placeId: selectedPlace.placeId,
          name: selectedPlace.name,
          address: selectedPlace.address,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          rating: selectedPlace.rating,
          totalReviews: selectedPlace.totalReviews,
          photo: selectedPlace.photo || undefined,
          mapUrl: selectedPlace.mapUrl,
        };
        await tripService.addPlaceToDay(dayId, body);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert(
          'Đã thêm! ✅',
          `${selectedPlace.name} đã được thêm vào lịch trình của bạn.`,
          'success',
        );
        setShowDayPicker(false);
        setSelectedPlace(null);
      } catch {
        showAlert('Lỗi', 'Không thể thêm địa điểm. Vui lòng thử lại.', 'error');
      } finally {
        setAddingToDay(null);
      }
    },
    [selectedPlace],
  );

  /* ─── Pull to refresh ─── */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlaces(activeCategory, searchQuery || undefined);
    setRefreshing(false);
  }, [fetchPlaces, activeCategory, searchQuery]);

  /* ─── Image error ─── */
  const handleImageError = useCallback((id: string) => {
    setFailedImages((prev) => new Set(prev).add(id));
  }, []);

  /* ─── Section title ─── */
  const sectionTitle = useMemo(() => {
    if (searchQuery.trim().length > 0) return `Kết quả cho "${searchQuery}"`;
    const cat = CATEGORIES.find((c) => c.key === activeCategory);
    const count = places.length;
    return `${cat?.emoji || '📍'} ${count} ${cat?.label || 'Địa điểm'} gần ${
      trip.destination || trip.province
    }`;
  }, [searchQuery, activeCategory, trip.destination, trip.province, places.length]);

  /* ─── Render Place Card ─── */
  const renderPlaceCard = useCallback(
    ({ item, itemKey }: { item: Place; itemKey?: string }) => {
      const hasPhoto = item.photo && !failedImages.has(item.placeId);
      const isSaved = savedPlaceIds.has(item.placeId);
      const isAdded = addedPlaceIds.has(item.placeId);

      return (
        <TouchableOpacity
          key={itemKey}
          style={styles.placeCard}
          activeOpacity={0.85}
          onPress={() => {
            setSelectedPlace(item);
            setDetailVisible(true);
          }}
        >
          {/* Image */}
          {hasPhoto ? (
            <Image
              source={{ uri: item.photo! }}
              style={styles.placeImage}
              onError={() => handleImageError(item.placeId)}
            />
          ) : (
            <View style={[styles.placeImage, styles.placeImagePlaceholder]}>
              <Feather name="image" size={24} color="#D1D5DB" />
            </View>
          )}

          {/* Info */}
          <View style={styles.placeInfo}>
            <Text style={styles.placeName} numberOfLines={1}>
              {item.name}
            </Text>

            {/* Rating row */}
            {(item.rating ?? 0) > 0 && (
              <View style={styles.ratingRow}>
                <Feather name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.rating!.toFixed(1)}</Text>
                {(item.totalReviews ?? 0) > 0 && (
                  <Text style={styles.reviewCount}>({item.totalReviews} đánh giá)</Text>
                )}
              </View>
            )}

            {/* Address */}
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={11} color="#9CA3AF" />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>

            {/* Action row: Add to Trip OR Already Added */}
            <View style={styles.actionRow}>
              {isAdded ? (
                <View style={styles.addedBadge}>
                  <Feather name="check" size={12} color="#10B981" />
                  <Text style={styles.addedText}>Đã thêm</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleAddToTrip(item)}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={13} color="#FFF" />
                  <Text style={styles.addBtnText}>Thêm</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => toggleSave(item)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="bookmark" size={20} color={isSaved ? BRAND : '#D1D5DB'} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [
      failedImages,
      savedPlaceIds,
      addedPlaceIds,
      toggleSave,
      handleImageError,
      handleAddToTrip,
      setSelectedPlace,
      setDetailVisible,
    ],
  );

  /* ─── Empty state ─── */
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Feather name="map-pin" size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Không tìm thấy địa điểm</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery ? 'Hãy thử từ khóa tìm kiếm khác' : 'Hãy thử danh mục hoặc tìm kiếm khác'}
        </Text>
      </View>
    );
  };

  /* ─── Header (saved places + search + categories) ─── */
  const renderListHeader = () => (
    <View>
      {/* ═══ Saved Places Section ═══ */}
      {savedPlaces.length > 0 && (
        <View style={styles.savedSection}>
          <View style={styles.savedHeader}>
            <View style={styles.savedTitleRow}>
              <Feather name="bookmark" size={16} color={BRAND} />
              <Text style={styles.savedTitle}>Địa điểm đã lưu</Text>
              <View style={styles.savedCount}>
                <Text style={styles.savedCountText}>{savedPlaces.length}</Text>
              </View>
            </View>
            {/* Edit / Done toggle — only show when 2+ saved */}
            {savedPlaces.length >= 2 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (editMode) {
                    setEditMode(false);
                    setSelectedIds(new Set());
                  } else {
                    setEditMode(true);
                  }
                }}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              >
                <Text style={styles.editToggleText}>{editMode ? 'Xong' : 'Sửa'}</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.savedList}
          >
            {savedPlaces.map((place) => {
              const hasImg = place.photo && !failedImages.has(place.placeId);
              const isSelected = selectedIds.has(place.placeId);
              return (
                <TouchableOpacity
                  key={place.placeId}
                  style={[styles.savedCard, editMode && isSelected && styles.savedCardSelected]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (editMode) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(place.placeId)) next.delete(place.placeId);
                        else next.add(place.placeId);
                        return next;
                      });
                    } else {
                      setSelectedPlace(place);
                      setDetailVisible(true);
                    }
                  }}
                >
                  {/* Normal mode: X button | Edit mode: checkbox */}
                  {editMode ? (
                    <View style={[styles.savedCheckbox, isSelected && styles.savedCheckboxChecked]}>
                      {isSelected && <Feather name="check" size={10} color="#FFF" />}
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.savedRemoveBtn}
                      onPress={() => toggleSave(place)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={12} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                  {hasImg ? (
                    <Image source={{ uri: place.photo! }} style={styles.savedImage} />
                  ) : (
                    <View style={[styles.savedImage, styles.savedImagePlaceholder]}>
                      <Feather name="map-pin" size={18} color="#D1D5DB" />
                    </View>
                  )}
                  <Text style={styles.savedName} numberOfLines={2}>
                    {place.name}
                  </Text>
                  {(place.rating ?? 0) > 0 && (
                    <View style={styles.savedRating}>
                      <Feather name="star" size={10} color="#F59E0B" />
                      <Text style={styles.savedRatingText}>{place.rating!.toFixed(1)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Edit Mode Toolbar ── */}
          {editMode && (
            <View style={styles.editToolbar}>
              <TouchableOpacity
                style={styles.selectAllBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (selectedIds.size === savedPlaces.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(savedPlaces.map((p) => p.placeId)));
                  }
                }}
              >
                <Feather
                  name={selectedIds.size === savedPlaces.length ? 'check-square' : 'square'}
                  size={16}
                  color={BRAND}
                />
                <Text style={styles.selectAllText}>
                  {selectedIds.size === savedPlaces.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.batchDeleteBtn,
                  selectedIds.size === 0 && styles.batchDeleteBtnDisabled,
                ]}
                disabled={selectedIds.size === 0}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const ok = await confirmDelete(
                    `Xóa ${selectedIds.size} địa điểm đã lưu?`,
                    'Hành động này không thể hoàn tác.',
                  );
                  if (ok) {
                    setSavedPlaces((prev) => {
                      const next = prev.filter((p) => !selectedIds.has(p.placeId));
                      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
                      if (next.length < 2) setEditMode(false);
                      setSelectedIds(new Set());
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      return next;
                    });
                  }
                }}
              >
                <Feather
                  name="trash-2"
                  size={14}
                  color={selectedIds.size === 0 ? '#D1D5DB' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.batchDeleteText,
                    selectedIds.size === 0 && styles.batchDeleteTextDisabled,
                  ]}
                >
                  Xóa ({selectedIds.size})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm địa điểm, hoạt động..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Feather name="x-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
        style={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat.key === activeCategory;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => handleCategoryPress(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section header */}
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={BRAND} />
          <Text style={styles.loadingText}>Đang tìm địa điểm...</Text>
        </View>
      )}
    </View>
  );

  /* ─── No coords ─── */
  if (!coords && !loading) {
    return (
      <View style={styles.emptyState}>
        <Feather name="compass" size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Đang xác định điểm đến...</Text>
        <Text style={styles.emptySubtitle}>
          Thêm địa điểm vào lịch trình để khám phá xung quanh
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.listContent}>
        {renderListHeader()}
        {!loading && places.length === 0 && renderEmpty()}
        {!loading &&
          places.length > 0 &&
          places.map((item) => renderPlaceCard({ item, itemKey: item.placeId }))}
      </View>

      {/* ═══ Day Picker Modal ═══ */}
      <Modal
        visible={showDayPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDayPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDayPicker(false)}
        >
          <View style={styles.dayPickerSheet}>
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            <Text style={styles.dayPickerTitle}>Thêm vào ngày nào?</Text>
            {selectedPlace && (
              <Text style={styles.dayPickerSubtitle} numberOfLines={1}>
                {selectedPlace.name}
              </Text>
            )}

            <ScrollView style={styles.dayList} showsVerticalScrollIndicator={false}>
              {days.map((day) => {
                const isAdding = addingToDay === day.dayId;
                const placeCount = day.places?.length || 0;
                return (
                  <TouchableOpacity
                    key={day.dayId}
                    style={styles.dayOption}
                    onPress={() => handleConfirmAddToDay(day.dayId)}
                    disabled={isAdding}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dayCircle}>
                      <Text style={styles.dayCircleText}>{day.day}</Text>
                    </View>
                    <View style={styles.dayOptionInfo}>
                      <Text style={styles.dayOptionTitle}>Ngày {day.day}</Text>
                      <Text style={styles.dayOptionDate}>
                        {formatDate(day.date)} · {placeCount} địa điểm
                      </Text>
                    </View>
                    {isAdding ? (
                      <ActivityIndicator size="small" color={BRAND} />
                    ) : (
                      <Feather name="plus-circle" size={22} color={BRAND} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDayPicker(false)}>
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ Place Detail Modal ═══ */}
      <PlaceDetailModal
        isVisible={detailVisible}
        onClose={() => setDetailVisible(false)}
        place={selectedPlace}
        onAdd={(place) => {
          setDetailVisible(false);
          setTimeout(() => {
            handleAddToTrip(place);
          }, 400);
        }}
        showAddButton={selectedPlace ? !addedPlaceIds.has(selectedPlace.placeId) : false}
      />
    </>
  );
}

/* ═══════════════════ Styles ═══════════════════ */
const styles = StyleSheet.create({
  listContent: { paddingBottom: 100 },

  /* ── Search ── */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    paddingVertical: 0,
  },

  /* ── Categories ── */
  categoryScroll: { marginBottom: 16 },
  categoryContainer: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  categoryEmoji: { fontSize: 15 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  categoryLabelActive: { color: '#FFFFFF' },

  /* ── Section header ── */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  /* ── Loading ── */
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  loadingText: { fontSize: 14, color: '#9CA3AF' },

  /* ── Place card ── */
  placeCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  placeImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  placeImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeInfo: {
    flex: 1,
    marginLeft: 14,
    gap: 3,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  reviewCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },

  /* ── Action row ── */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addedText: { fontSize: 12, fontWeight: '600', color: '#10B981' },

  /* ── Empty state ── */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  /* ── Day Picker Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dayPickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: '60%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  dayPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  dayPickerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dayList: { paddingHorizontal: 20 },
  dayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleText: { fontSize: 15, fontWeight: '700', color: BRAND },
  dayOptionInfo: { flex: 1, gap: 2 },
  dayOptionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  dayOptionDate: { fontSize: 13, color: '#9CA3AF' },
  cancelBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },

  /* ── Saved Places Section ── */
  savedSection: {
    marginTop: 16,
    marginBottom: 4,
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  savedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  savedCount: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  savedCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND,
  },
  savedList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  savedCard: {
    width: 120,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  savedCardSelected: {
    borderColor: BRAND,
    backgroundColor: '#F0F5FF',
  },
  savedRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedCheckbox: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedCheckboxChecked: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  savedImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 6,
  },
  savedImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 16,
  },
  savedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  savedRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },

  /* ── Edit Mode Toolbar ── */
  editToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND,
  },
  batchDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  batchDeleteBtnDisabled: {
    backgroundColor: '#F9FAFB',
  },
  batchDeleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  batchDeleteTextDisabled: {
    color: '#D1D5DB',
  },
});
