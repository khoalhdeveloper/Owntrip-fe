import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
  StatusBar,
  Alert,
  LayoutAnimation,
  UIManager,
  Linking,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Trip, TripDay } from '@/services/tripService';
import { useConfirm } from '@/components/ConfirmProvider';

// ── Extracted modules ──
import { BRAND, MOCK_MEMORIES, MOCK_TIMES, MOCK_PLACES, TimelineEntry } from './journal/types';
import { formatShortDate, haversineDistance, estimateTravelTime, formatDistance } from './journal/helpers';
import { generateMapHtml } from './journal/map-html';
import { DraggableTimelineItem } from './journal/DraggableTimelineItem';
import { styles } from './journal/styles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface JournalTabProps {
  trip: Trip;
  days: TripDay[];
  onScrollToMap?: () => void;
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export default function JournalTab({ trip, days, onScrollToMap }: JournalTabProps) {
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [reorderedTimeline, setReorderedTimeline] = useState<TimelineEntry[] | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ index: number; entry: TimelineEntry; distFromPrev: string | null } | null>(null);
  const [navigatingToPlace, setNavigatingToPlace] = useState(false);
  const { alert: showAlert } = useConfirm();

  const webViewRef = useRef<WebView>(null);
  const fullscreenWebViewRef = useRef<WebView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Build timeline from itinerary OR use mock data
  const baseTimeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    let globalIdx = 0;

    days.forEach(day => {
      if (!day.places || day.places.length === 0) return;
      day.places.forEach((place, idx) => {
        entries.push({
          id: place._id || `${day.dayId}-${idx}`,
          name: place.name,
          photo: place.photo,
          latitude: place.latitude,
          longitude: place.longitude,
          dayDate: day.date,
          mockTime: MOCK_TIMES[idx % MOCK_TIMES.length],
          mockMemory: MOCK_MEMORIES[globalIdx % MOCK_MEMORIES.length],
        });
        globalIdx++;
      });
    });

    if (entries.length === 0) {
      const startDate = trip.startDate || new Date().toISOString();
      MOCK_PLACES.forEach((mp, idx) => {
        entries.push({
          id: `mock-${idx}`,
          name: mp.name,
          photo: mp.photo,
          latitude: mp.lat,
          longitude: mp.lng,
          dayDate: startDate,
          mockTime: MOCK_TIMES[idx],
          mockMemory: MOCK_MEMORIES[idx],
        });
      });
    }

    return entries;
  }, [days, trip.startDate]);

  // Use reordered if user has reordered, otherwise base
  const timeline = reorderedTimeline || baseTimeline;
  const visitedCount = timeline.length;

  // Approx item height for drag calculation
  const ITEM_HEIGHT = 90;

  // Distances between consecutive points
  const distances = useMemo(() => {
    return timeline.slice(0, -1).map((entry, idx) => {
      const next = timeline[idx + 1];
      const km = haversineDistance(entry.latitude, entry.longitude, next.latitude, next.longitude);
      return { distance: formatDistance(km), time: estimateTravelTime(km) };
    });
  }, [timeline]);

  // Map HTML — memoized to prevent re-renders
  const mapHtml = useMemo(() => generateMapHtml(timeline, BRAND), [timeline]);

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['15%', '45%', '85%'], []);

  // ── Drag-and-drop handlers ──
  const handleDragStart = useCallback((_idx: number) => {
    // Visual feedback handled by PanResponder grant
  }, []);

  const handleDragEnd = useCallback((fromIdx: number, dy: number) => {
    // Calculate how many positions to move based on drag distance
    const steps = Math.round(dy / ITEM_HEIGHT);
    if (steps === 0) return;

    const toIdx = Math.max(0, Math.min(timeline.length - 1, fromIdx + steps));
    if (toIdx === fromIdx) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'));
    const newTimeline = [...timeline];
    const [removed] = newTimeline.splice(fromIdx, 1);
    newTimeline.splice(toIdx, 0, removed);
    setReorderedTimeline(newTimeline);
    setHighlightedIdx(toIdx);
  }, [timeline]);

  // ── GPS Location ──
  const handleMyLocation = useCallback(async (webRef: React.RefObject<WebView | null>) => {
    try {
      setLocatingUser(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Quyền bị từ chối', 'Vui lòng bật dịch vụ định vị để sử dụng tính năng này.', 'warning');
        setLocatingUser(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      webRef.current?.injectJavaScript(`showUserLocation(${latitude}, ${longitude}); true;`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      showAlert('Lỗi định vị', 'Không thể lấy vị trí hiện tại của bạn.', 'error');
    } finally {
      setLocatingUser(false);
    }
  }, []);

  // ── Directions: get user GPS → open Google Maps ──
  const handleDirections = useCallback(async (destLat: number, destLng: number, destName: string) => {
    let url = '';
    try {
      setNavigatingToPlace(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const { latitude: origLat, longitude: origLng } = loc.coords;
          url = Platform.select({
            ios: `maps://app?saddr=${origLat},${origLng}&daddr=${destLat},${destLng}`,
            android: `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}&destination_place_id=&travelmode=driving`,
          }) || `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}`;
        } catch (locError) {
          console.warn('Failed to get current location, using destination only:', locError);
        }
      }
      
      // Fallback if URL is not set (e.g. permission denied or location fetch failed)
      if (!url) {
        url = Platform.select({
          ios: `maps://app?daddr=${destLat},${destLng}`,
          android: `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`,
        }) || `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
      }

      try {
        await Linking.openURL(url);
      } catch (openError) {
        console.warn('Failed to open primary maps url, falling back to web maps:', openError);
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      console.error('Failed to open map:', err);
      showAlert('Lỗi', 'Không thể mở chỉ đường.', 'error');
    } finally {
      setNavigatingToPlace(false);
    }
  }, []);

  const handleNavigate = useCallback(async (destLat: number, destLng: number) => {
    let url = '';
    try {
      setNavigatingToPlace(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const { latitude: origLat, longitude: origLng } = loc.coords;
          url = Platform.select({
            ios: `maps://app?saddr=${origLat},${origLng}&daddr=${destLat},${destLng}&dirflg=d`,
            android: `google.navigation:q=${destLat},${destLng}&mode=d`,
          }) || `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}&travelmode=driving`;
        } catch (locError) {
          console.warn('Failed to get current location for navigation, using destination only:', locError);
        }
      }

      // Fallback if URL is not set (e.g. permission denied or location fetch failed)
      if (!url) {
        url = Platform.select({
          ios: `maps://app?daddr=${destLat},${destLng}&dirflg=d`,
          android: `google.navigation:q=${destLat},${destLng}&mode=d`,
        }) || `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
      }

      try {
        await Linking.openURL(url);
      } catch (openError) {
        console.warn('Failed to open primary navigation url, falling back to web maps:', openError);
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      console.error('Failed to open navigation:', err);
      showAlert('Lỗi', 'Không thể bắt đầu dẫn đường.', 'error');
    } finally {
      setNavigatingToPlace(false);
    }
  }, []);

  // ── Show direction card for a marker ──
  const showDirectionCard = useCallback((idx: number) => {
    const entry = timeline[idx];
    if (!entry) return;
    let distFromPrev: string | null = null;
    if (idx > 0) {
      const prev = timeline[idx - 1];
      const km = haversineDistance(prev.latitude, prev.longitude, entry.latitude, entry.longitude);
      distFromPrev = formatDistance(km) + ' · ' + estimateTravelTime(km);
    }
    setSelectedPlace({ index: idx, entry, distFromPrev });
    setHighlightedIdx(idx);
  }, [timeline]);

  // ── Map ↔ Timeline sync ──
  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerTap' && typeof data.index === 'number') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDirectionCard(data.index);
      }
      if (data.type === 'requestLocation') {
        handleMyLocation(webViewRef);
      }
    } catch { /* ignore */ }
  }, [handleMyLocation, showDirectionCard]);

  const handleTimelineTap = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showDirectionCard(idx);
    onScrollToMap?.();
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(`focusMarker(${idx}); true;`);
    }, 300);
  }, [onScrollToMap, showDirectionCard]);

  const handleFocusMap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHighlightedIdx(null);
    setSelectedPlace(null);
    webViewRef.current?.injectJavaScript(`fitAllBounds(); true;`);
  }, []);

  // ── Fullscreen ──
  const openFullscreen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFullscreenMap(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFullscreenMap(false);
  }, []);

  const handleFullscreenMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerTap' && typeof data.index === 'number') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDirectionCard(data.index);
        bottomSheetRef.current?.snapToIndex(1);
      }
      if (data.type === 'requestLocation') {
        handleMyLocation(fullscreenWebViewRef);
      }
    } catch { /* ignore */ }
  }, [handleMyLocation, showDirectionCard]);

  const handleFullscreenTimelineTap = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showDirectionCard(idx);
    fullscreenWebViewRef.current?.injectJavaScript(`focusMarker(${idx}); true;`);
    bottomSheetRef.current?.snapToIndex(0);
  }, [showDirectionCard]);

  return (
    <View style={styles.container}>

      {/* ═══════ 1. EMBEDDED MAP ═══════ */}
      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <View style={styles.mapLocationRow}>
            <View style={styles.mapPin}>
              <Feather name="map-pin" size={12} color={BRAND} />
            </View>
            <Text style={styles.mapLocationText}>{trip.destination}</Text>
          </View>
          <View style={styles.mapHeaderRight}>
            {visitedCount > 0 && (
              <View style={styles.visitedBadge}>
                <View style={styles.visitedDot} />
                <Text style={styles.visitedText}>{visitedCount} điểm</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={openFullscreen}
              activeOpacity={0.7}
            >
              <Feather name="maximize-2" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mapContainer}>
          {mapLoading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="small" color={BRAND} />
              <Text style={styles.mapLoadingText}>Đang tải bản đồ...</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            androidLayerType="software"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            onMessage={handleWebViewMessage}
            onLoadEnd={() => setMapLoading(false)}
            startInLoadingState={false}
          />

          {/* My Location floating button */}
          <TouchableOpacity
            style={styles.myLocationBtn}
            onPress={() => handleMyLocation(webViewRef)}
            activeOpacity={0.8}
            disabled={locatingUser}
          >
            {locatingUser
              ? <ActivityIndicator size="small" color={BRAND} />
              : <Feather name="crosshair" size={16} color={BRAND} />
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={handleFocusMap}
            activeOpacity={0.8}
          >
            <Feather name="navigation" size={15} color={BRAND} />
          </TouchableOpacity>

          {/* ── Direction Bottom Card (Grab-style) ── */}
          {selectedPlace && (
            <View style={styles.directionCard}>
              <TouchableOpacity
                style={styles.directionCardClose}
                onPress={() => setSelectedPlace(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={14} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.directionCardContent}>
                {selectedPlace.entry.photo ? (
                  <Image source={{ uri: selectedPlace.entry.photo }} style={styles.directionCardImg} />
                ) : (
                  <View style={[styles.directionCardImg, styles.directionCardImgPlaceholder]}>
                    <Feather name="map-pin" size={18} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.directionCardInfo}>
                  <Text style={styles.directionCardName} numberOfLines={1}>{selectedPlace.entry.name}</Text>
                  <View style={styles.directionCardMeta}>
                    <Feather name="clock" size={10} color="#9CA3AF" />
                    <Text style={styles.directionCardMetaText}>{selectedPlace.entry.mockTime}</Text>
                  </View>
                  {selectedPlace.distFromPrev && (
                    <View style={styles.directionCardMeta}>
                      <Feather name="navigation" size={10} color={BRAND} />
                      <Text style={[styles.directionCardMetaText, { color: BRAND, fontWeight: '600' }]}>
                        {selectedPlace.distFromPrev} từ điểm trước
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.directionCardBtns}>
                <TouchableOpacity
                  style={styles.directionBtn}
                  onPress={() => handleDirections(selectedPlace.entry.latitude, selectedPlace.entry.longitude, selectedPlace.entry.name)}
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  {navigatingToPlace
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Feather name="map" size={14} color="#FFF" />
                  }
                  <Text style={styles.directionBtnText}>Chỉ đường</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.directionBtn, styles.navigateBtn]}
                  onPress={() => handleNavigate(selectedPlace.entry.latitude, selectedPlace.entry.longitude)}
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  <Feather name="navigation" size={14} color={BRAND} />
                  <Text style={[styles.directionBtnText, styles.navigateBtnText]}>Dẫn đường</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ═══════ 2. TRAVEL TIMELINE ═══════ */}
      <View style={styles.timelineSection}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>Dòng thời gian</Text>
          <View style={styles.timelineHeaderRight}>
            {reorderedTimeline && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setReorderedTimeline(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Feather name="rotate-ccw" size={12} color="#EF4444" />
                <Text style={styles.resetBtnText}>Đặt lại</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.timelineCount}>{visitedCount} điểm</Text>
          </View>
        </View>

        <View style={styles.timelineList}>
          {timeline.map((entry, idx) => (
            <DraggableTimelineItem
              key={entry.id}
              entry={entry}
              idx={idx}
              isHighlighted={highlightedIdx === idx}
              isLast={idx === timeline.length - 1}
              dist={idx < distances.length ? distances[idx] : null}
              onTap={handleTimelineTap}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              itemHeight={ITEM_HEIGHT}
            />
          ))}
        </View>
      </View>

      {/* ═══════ 3. FULLSCREEN MAP + BOTTOM SHEET ═══════ */}
      <Modal
        visible={fullscreenMap}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <GestureHandlerRootView style={styles.fullscreenContainer}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

          {/* Full map */}
          <WebView
            ref={fullscreenWebViewRef}
            source={{ html: mapHtml }}
            style={styles.fullscreenMap}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            androidLayerType="software"
            onMessage={handleFullscreenMessage}
          />

          {/* Top controls */}
          <View style={styles.fullscreenTopBar}>
            <TouchableOpacity
              style={styles.fullscreenTopBtn}
              onPress={closeFullscreen}
              activeOpacity={0.8}
            >
              <Feather name="x" size={20} color="#1A1A1A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fullscreenTopBtn}
              onPress={() => handleMyLocation(fullscreenWebViewRef)}
              activeOpacity={0.8}
              disabled={locatingUser}
            >
              {locatingUser
                ? <ActivityIndicator size="small" color={BRAND} />
                : <Feather name="crosshair" size={18} color={BRAND} />
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fullscreenTopBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                fullscreenWebViewRef.current?.injectJavaScript(`fitAllBounds(); true;`);
              }}
              activeOpacity={0.8}
            >
              <Feather name="navigation" size={18} color={BRAND} />
            </TouchableOpacity>
          </View>

          {/* ── Fullscreen Direction Card ── */}
          {selectedPlace && (
            <View style={[styles.directionCard, { bottom: 280, left: 12, right: 12 }]}>
              <TouchableOpacity
                style={styles.directionCardClose}
                onPress={() => setSelectedPlace(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={14} color="#9CA3AF" />
              </TouchableOpacity>
              <View style={styles.directionCardContent}>
                {selectedPlace.entry.photo ? (
                  <Image source={{ uri: selectedPlace.entry.photo }} style={styles.directionCardImg} />
                ) : (
                  <View style={[styles.directionCardImg, styles.directionCardImgPlaceholder]}>
                    <Feather name="map-pin" size={18} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.directionCardInfo}>
                  <Text style={styles.directionCardName} numberOfLines={1}>{selectedPlace.entry.name}</Text>
                  <View style={styles.directionCardMeta}>
                    <Feather name="clock" size={10} color="#9CA3AF" />
                    <Text style={styles.directionCardMetaText}>{selectedPlace.entry.mockTime}</Text>
                  </View>
                  {selectedPlace.distFromPrev && (
                    <View style={styles.directionCardMeta}>
                      <Feather name="navigation" size={10} color={BRAND} />
                      <Text style={[styles.directionCardMetaText, { color: BRAND, fontWeight: '600' }]}>
                        {selectedPlace.distFromPrev} từ điểm trước
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.directionCardBtns}>
                <TouchableOpacity
                  style={styles.directionBtn}
                  onPress={() => handleDirections(selectedPlace.entry.latitude, selectedPlace.entry.longitude, selectedPlace.entry.name)}
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  {navigatingToPlace
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Feather name="map" size={14} color="#FFF" />
                  }
                  <Text style={styles.directionBtnText}>Chỉ đường</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.directionBtn, styles.navigateBtn]}
                  onPress={() => handleNavigate(selectedPlace.entry.latitude, selectedPlace.entry.longitude)}
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  <Feather name="navigation" size={14} color={BRAND} />
                  <Text style={[styles.directionBtnText, styles.navigateBtnText]}>Dẫn đường</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Sheet — draggable timeline */}
          <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose={false}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
            style={styles.sheetShadow}
          >
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.sheetBrandDot} />
                <Text style={styles.sheetTitle}>{trip.destination}</Text>
              </View>
              <Text style={styles.sheetCount}>{visitedCount} điểm</Text>
            </View>

            {/* Scrollable Timeline inside Sheet */}
            <BottomSheetScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {timeline.map((entry, idx) => {
                const hasPhoto = !!entry.photo;
                const isHighlighted = highlightedIdx === idx;
                const dist = idx < distances.length ? distances[idx] : null;

                return (
                  <React.Fragment key={entry.id}>
                    <TouchableOpacity
                      style={[styles.sheetItem, isHighlighted && styles.sheetItemHighlighted]}
                      activeOpacity={0.7}
                      onPress={() => handleFullscreenTimelineTap(idx)}
                    >
                      <View style={[styles.sheetStepDot, isHighlighted && styles.sheetStepDotActive]}>
                        <Text style={[styles.sheetStepNum, isHighlighted && styles.sheetStepNumActive]}>
                          {idx + 1}
                        </Text>
                      </View>

                      {hasPhoto ? (
                        <Image source={{ uri: entry.photo }} style={styles.sheetThumb} />
                      ) : (
                        <View style={[styles.sheetThumb, styles.sheetThumbPlaceholder]}>
                          <Feather name="map-pin" size={14} color="#9CA3AF" />
                        </View>
                      )}

                      <View style={styles.sheetItemInfo}>
                        <Text style={styles.sheetItemName} numberOfLines={1}>{entry.name}</Text>
                        <Text style={styles.sheetItemMeta}>{entry.mockTime} · {formatShortDate(entry.dayDate)}</Text>
                      </View>

                      <Feather name="chevron-right" size={14} color={isHighlighted ? BRAND : '#D1D5DB'} />
                    </TouchableOpacity>

                    {dist && (
                      <View style={styles.sheetDistBadge}>
                        <Text style={styles.sheetDistText}>🚗 {dist.distance} · {dist.time}</Text>
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </BottomSheetScrollView>
          </BottomSheet>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}
