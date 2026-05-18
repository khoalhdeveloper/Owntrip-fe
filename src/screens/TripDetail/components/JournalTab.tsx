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
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Trip, TripDay, tripService } from '@/services/tripService';
import { useConfirm } from '@/components/ConfirmProvider';
import type * as RNMapboxGL from '@rnmapbox/maps';
import { MAP_CONFIG } from '@/constants/map';
import { mapService } from '@/services/mapService';
import { useEffect } from 'react';
import { NativeModules } from 'react-native';
import { WebView } from 'react-native-webview';
import { generateMapHtml } from './journal/map-html';

// ── Extracted modules ──
import { BRAND, DAY_COLORS, getDayColor, MOCK_MEMORIES, MOCK_TIMES, MOCK_PLACES, TimelineEntry } from './journal/types';
import {
  formatShortDate,
  haversineDistance,
  estimateTravelTime,
  formatDistance,
} from './journal/helpers';
import { DraggableTimelineItem } from './journal/DraggableTimelineItem';
import { styles } from './journal/styles';

// Safe runtime detection to prevent app crash in Expo Go
const isMapboxAvailable = !!NativeModules.RNMBXModule || !!NativeModules.RNMBXMapView;
let MapboxGL: any = null;

if (isMapboxAvailable) {
  try {
    MapboxGL = require('@rnmapbox/maps').default || require('@rnmapbox/maps');
    MapboxGL.setAccessToken(MAP_CONFIG.MAPBOX_ACCESS_TOKEN || '');
    MapboxGL.setConnected(true);
  } catch (e) {
    console.warn('Failed to load @rnmapbox/maps:', e);
  }
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface JournalTabProps {
  trip: Trip;
  days: TripDay[];
  onScrollToMap?: () => void;
  onRefresh: () => void;
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export default function JournalTab({ trip, days, onScrollToMap, onRefresh }: JournalTabProps) {
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [reorderedTimeline, setReorderedTimeline] = useState<TimelineEntry[] | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    index: number;
    entry: TimelineEntry;
    distFromPrev: string | null;
  } | null>(null);
  const [navigatingToPlace, setNavigatingToPlace] = useState(false);
  const { alert: showAlert } = useConfirm();

  // Reset optimistic timeline when parent days changes (e.g. from Itinerary tab)
  useEffect(() => {
    setReorderedTimeline(null);
  }, [days]);

  // Native Mapbox configuration states
  const [routeSegments, setRouteSegments] = useState<{coords: [number, number][]; color: string}[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);

  const cameraRef = useRef<RNMapboxGL.Camera>(null);
  const fullscreenCameraRef = useRef<RNMapboxGL.Camera>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const webViewRef = useRef<WebView>(null);
  const fullscreenWebViewRef = useRef<WebView>(null);

  // Build timeline from itinerary OR use mock data
  const baseTimeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    let globalIdx = 0;

    days.forEach((day) => {
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
          rating: place.rating,
          totalReviews: place.totalReviews,
          address: place.address,
          types: place.types,
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

  // Calculate distance between points for the timeline (ONLY for same day)
  const distances = useMemo(() => {
    return timeline.slice(0, -1).map((entry, idx) => {
      const next = timeline[idx + 1];
      // Do not calculate distance between the last place of Day 1 and first place of Day 2
      if (entry.dayDate !== next.dayDate) return null;

      const km = haversineDistance(entry.latitude, entry.longitude, next.latitude, next.longitude);
      return { distance: formatDistance(km), time: estimateTravelTime(km) };
    });
  }, [timeline]);

  // Map configuration & style selections
  const styleURL =
    MAP_CONFIG.GOONG_MAPTILES_KEY && !MAP_CONFIG.GOONG_MAPTILES_KEY.startsWith('YOUR_')
      ? `https://tiles.goong.io/assets/goong_map_web.json?api_key=${MAP_CONFIG.GOONG_MAPTILES_KEY}`
      : MapboxGL?.StyleURL?.Street || '';

  const currentStyleURL = isSatellite ? MapboxGL?.StyleURL?.SatelliteStreet || '' : styleURL;

  const initialCoordinate = useMemo<[number, number]>(() => {
    if (timeline.length > 0) {
      return [timeline[0].longitude, timeline[0].latitude];
    }
    return [108.335, 15.8794]; // Default Hoi An center: [lng, lat]
  }, [timeline]);

  const uniqueDates = useMemo(() => {
    return Array.from(new Set(timeline.map((e) => e.dayDate)));
  }, [timeline]);

  // Load Goong API route directions
  useEffect(() => {
    let isMounted = true;
    const loadRoutes = async () => {
      if (timeline.length < 2) {
        setRouteSegments([]);
        return;
      }

      setMapLoading(true);
      try {
        const segmentPromises = timeline.slice(0, -1).map((entry, idx) => {
          const next = timeline[idx + 1];
          // Skip drawing lines between different days!
          if (entry.dayDate !== next.dayDate) {
            return Promise.resolve(null);
          }
          return mapService.getDirections(
            [entry.latitude, entry.longitude],
            [next.latitude, next.longitude],
          );
        });

        const results = await Promise.all(segmentPromises);
        if (!isMounted) return;

        const segments: { coords: [number, number][]; color: string }[] = [];
        results.forEach((coords, idx) => {
          if (coords) {
            segments.push({
              coords,
              color: getDayColor(timeline[idx].dayDate, uniqueDates),
            });
          }
        });
        setRouteSegments(segments);
      } catch (error) {
        console.warn('Failed to load Goong route directions:', error);
        if (isMounted) {
          const fallbackSegments: { coords: [number, number][]; color: string }[] = [];
          timeline.slice(0, -1).forEach((entry, idx) => {
            const next = timeline[idx + 1];
            if (entry.dayDate === next.dayDate) {
              fallbackSegments.push({
                coords: [
                  [entry.longitude, entry.latitude] as [number, number],
                  [next.longitude, next.latitude] as [number, number],
                ],
                color: getDayColor(entry.dayDate, uniqueDates),
              });
            }
          });
          setRouteSegments(fallbackSegments);
        }
      } finally {
        if (isMounted) {
          setMapLoading(false);
        }
      }
    };

    loadRoutes();
    return () => {
      isMounted = false;
    };
  }, [timeline]);

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['15%', '45%', '85%'], []);

  // ── Drag-and-drop handlers ──
  const handleDragStart = useCallback((_idx: number) => {
    // Visual feedback handled by PanResponder grant
  }, []);

  const handleDragEnd = useCallback(
    async (fromIdx: number, dy: number) => {
      // Calculate how many positions to move based on drag distance
      const steps = Math.round(dy / ITEM_HEIGHT);
      if (steps === 0) return;

      const toIdx = Math.max(0, Math.min(timeline.length - 1, fromIdx + steps));
      if (toIdx === fromIdx) return;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'));
      const newTimeline = [...timeline];
      const [removed] = newTimeline.splice(fromIdx, 1);
      
      const oldDayDate = removed.dayDate;
      
      // Update dayDate of the dragged item to match its new neighbors!
      if (newTimeline.length > 0) {
        if (toIdx === 0) {
          removed.dayDate = newTimeline[0].dayDate;
        } else if (toIdx >= newTimeline.length) {
          removed.dayDate = newTimeline[newTimeline.length - 1].dayDate;
        } else {
          removed.dayDate = newTimeline[toIdx - 1].dayDate;
        }
      }

      newTimeline.splice(toIdx, 0, removed);
      setReorderedTimeline(newTimeline);
      setHighlightedIdx(toIdx);
      
      // === AUTO SAVE LOGIC ===
      if (oldDayDate !== removed.dayDate) {
        // Warning: User dragged across different days, backend currently doesn't have an API to MOVE between days.
        showAlert('Chưa hỗ trợ', 'Tính năng lưu tự động chỉ hỗ trợ đổi thứ tự trong cùng 1 ngày.', 'warning');
        return;
      }
      
      // Find the dayId for this dayDate
      const targetDay = days?.find(d => d.date === oldDayDate);
      if (targetDay && targetDay.dayId) {
        try {
          // Gather all Document IDs for this specific day in their new order
          const orderedPlaceIds = newTimeline
            .filter(t => t.dayDate === oldDayDate)
            .map(t => t.id); // In TimelineEntry, id is the place._id
            
          await tripService.reorderPlacesInDay(targetDay.dayId, orderedPlaceIds);
          console.log(`Reordered Journal timeline successfully`);
          onRefresh(); // Trigger parent refresh to sync other tabs!
        } catch (error) {
          console.error('Failed to auto-save Journal reorder', error);
          showAlert('Lỗi', 'Không thể lưu thứ tự mới. Vui lòng thử lại.', 'error');
        }
      }
    },
    [timeline, days, showAlert, onRefresh],
  );

  // ── GPS Location ──
  const handleMyLocation = useCallback(
    async (camRef: React.RefObject<RNMapboxGL.Camera | null>) => {
      try {
        setLocatingUser(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showAlert(
            'Quyền bị từ chối',
            'Vui lòng bật dịch vụ định vị để sử dụng tính năng này.',
            'warning',
          );
          setLocatingUser(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        setUserLocation([longitude, latitude]);

        if (isMapboxAvailable) {
          camRef.current?.setCamera({
            centerCoordinate: [longitude, latitude],
            zoomLevel: 15,
            animationDuration: 1000,
          });
        } else {
          const activeWebView = fullscreenMap ? fullscreenWebViewRef.current : webViewRef.current;
          activeWebView?.injectJavaScript(`showUserLocation(${latitude}, ${longitude}); true;`);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        showAlert('Lỗi định vị', 'Không thể lấy vị trí hiện tại của bạn.', 'error');
      } finally {
        setLocatingUser(false);
      }
    },
    [isMapboxAvailable, fullscreenMap, showAlert],
  );

  // ── Directions: get user GPS → open Google Maps ──
  const handleDirections = useCallback(
    async (destLat: number, destLng: number, destName: string) => {
      try {
        setNavigatingToPlace(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Quyền bị từ chối', 'Vui lòng bật định vị để lấy chỉ đường.', 'warning');
          setNavigatingToPlace(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude: origLat, longitude: origLng } = loc.coords;
        const url =
          Platform.select({
            ios: `maps://app?saddr=${origLat},${origLng}&daddr=${destLat},${destLng}`,
            android: `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}&destination_place_id=&travelmode=driving`,
          }) ||
          `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}`;
        await Linking.openURL(url);
      } catch {
        showAlert('Lỗi', 'Không thể mở chỉ đường.', 'error');
      } finally {
        setNavigatingToPlace(false);
      }
    },
    [],
  );

  const handleNavigate = useCallback(async (destLat: number, destLng: number) => {
    try {
      setNavigatingToPlace(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Quyền bị từ chối', 'Vui lòng bật định vị để dẫn đường.', 'warning');
        setNavigatingToPlace(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: origLat, longitude: origLng } = loc.coords;
      const url =
        Platform.select({
          ios: `maps://app?saddr=${origLat},${origLng}&daddr=${destLat},${destLng}&dirflg=d`,
          android: `google.navigation:q=${destLat},${destLng}&mode=d`,
        }) ||
        `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}&travelmode=driving`;
      await Linking.openURL(url);
    } catch {
      showAlert('Lỗi', 'Không thể bắt đầu dẫn đường.', 'error');
    } finally {
      setNavigatingToPlace(false);
    }
  }, []);

  // ── Show direction card for a marker ──
  const showDirectionCard = useCallback(
    (idx: number) => {
      const entry = timeline[idx];
      if (!entry) return;
      let distFromPrev: string | null = null;
      if (idx > 0) {
        const prev = timeline[idx - 1];
        const km = haversineDistance(
          prev.latitude,
          prev.longitude,
          entry.latitude,
          entry.longitude,
        );
        distFromPrev = formatDistance(km) + ' · ' + estimateTravelTime(km);
      }
      setSelectedPlace({ index: idx, entry, distFromPrev });
      setHighlightedIdx(idx);
    },
    [timeline],
  );

  // WebView message dispatcher for Expo Go interactive map
  const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'markerTap') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          showDirectionCard(data.index);
          setHighlightedIdx(data.index);
        } else if (data.type === 'requestLocation') {
          handleMyLocation(cameraRef);
        }
      } catch (e) {
        console.warn('WebView message error:', e);
      }
    },
    [showDirectionCard, handleMyLocation],
  );

  // ── Map ↔ Timeline sync ──
  const handleMarkerTap = useCallback(
    (idx: number, camRef: React.RefObject<RNMapboxGL.Camera | null>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showDirectionCard(idx);
      const entry = timeline[idx];
      if (entry) {
        if (isMapboxAvailable) {
          camRef.current?.setCamera({
            centerCoordinate: [entry.longitude, entry.latitude],
            zoomLevel: 15.5,
            animationDuration: 800,
          });
        } else {
          const activeWebView = fullscreenMap ? fullscreenWebViewRef.current : webViewRef.current;
          activeWebView?.injectJavaScript(`focusMarker(${idx}); true;`);
        }
      }
    },
    [showDirectionCard, timeline, isMapboxAvailable, fullscreenMap],
  );

  const handleTimelineTap = useCallback(
    (idx: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showDirectionCard(idx);
      onScrollToMap?.();
      const entry = timeline[idx];
      if (entry) {
        setTimeout(() => {
          if (isMapboxAvailable) {
            cameraRef.current?.setCamera({
              centerCoordinate: [entry.longitude, entry.latitude],
              zoomLevel: 15.5,
              animationDuration: 800,
            });
          } else {
            webViewRef.current?.injectJavaScript(`focusMarker(${idx}); true;`);
          }
        }, 300);
      }
    },
    [onScrollToMap, showDirectionCard, timeline, isMapboxAvailable],
  );

  const handleFocusMap = useCallback(
    (camRef: React.RefObject<RNMapboxGL.Camera | null>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setHighlightedIdx(null);
      setSelectedPlace(null);

      if (timeline.length === 0) return;

      if (isMapboxAvailable) {
        if (timeline.length === 1) {
          camRef.current?.setCamera({
            centerCoordinate: [timeline[0].longitude, timeline[0].latitude],
            zoomLevel: 14,
            animationDuration: 1000,
          });
          return;
        }

        const lngs = timeline.map((e) => e.longitude);
        const lats = timeline.map((e) => e.latitude);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);

        camRef.current?.fitBounds([maxLng, maxLat], [minLng, minLat], [50, 50, 50, 50], 1000);
      } else {
        const activeWebView = fullscreenMap ? fullscreenWebViewRef.current : webViewRef.current;
        activeWebView?.injectJavaScript(`fitAllBounds(); true;`);
      }
    },
    [timeline, isMapboxAvailable, fullscreenMap],
  );

  // ── Fullscreen ──
  const openFullscreen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFullscreenMap(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFullscreenMap(false);
  }, []);

  const handleFullscreenTimelineTap = useCallback(
    (idx: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showDirectionCard(idx);
      const entry = timeline[idx];
      if (entry) {
        if (isMapboxAvailable) {
          fullscreenCameraRef.current?.setCamera({
            centerCoordinate: [entry.longitude, entry.latitude],
            zoomLevel: 15.5,
            animationDuration: 800,
          });
        } else {
          fullscreenWebViewRef.current?.injectJavaScript(`focusMarker(${idx}); true;`);
        }
      }
      bottomSheetRef.current?.snapToIndex(0);
    },
    [showDirectionCard, timeline],
  );

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
            <TouchableOpacity style={styles.expandBtn} onPress={openFullscreen} activeOpacity={0.7}>
              <Feather name="maximize-2" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mapContainer}>
          {mapLoading && isMapboxAvailable && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="small" color={BRAND} />
              <Text style={styles.mapLoadingText}>Đang tải bản đồ...</Text>
            </View>
          )}

          {!isMapboxAvailable ? (
            <WebView
              style={styles.map}
              originWhitelist={['*']}
              source={{
                html: generateMapHtml(
                  timeline,
                  BRAND,
                  MAP_CONFIG.MAPBOX_ACCESS_TOKEN || '',
                  MAP_CONFIG.GOONG_MAPTILES_KEY || '',
                  uniqueDates,
                  routeSegments
                ),
                baseUrl: 'https://localhost',
              }}
              ref={webViewRef}
              onMessage={handleWebViewMessage}
            />
          ) : (
            <>
              <MapboxGL.MapView
                style={styles.map}
                styleURL={currentStyleURL}
                logoEnabled={false}
                attributionEnabled={false}
                onDidFinishLoadingMap={() => setMapLoading(false)}
              >
                <MapboxGL.Camera
                  ref={cameraRef}
                  zoomLevel={12}
                  centerCoordinate={initialCoordinate}
                />

                {/* Decoded Route Path Segments */}
                {routeSegments.map((segment, idx) => (
                  <MapboxGL.ShapeSource
                    key={`route-${idx}`}
                    id={`routeSource-${idx}`}
                    shape={{
                      type: 'Feature',
                      properties: {},
                      geometry: {
                        type: 'LineString',
                        coordinates: segment.coords,
                      },
                    }}
                  >
                    <MapboxGL.LineLayer
                      id={`routeLayer-${idx}`}
                      style={{
                        lineColor: segment.color,
                        lineWidth: 4,
                        lineOpacity: 0.8,
                        lineJoin: 'round',
                        lineCap: 'round',
                      }}
                    />
                  </MapboxGL.ShapeSource>
                ))}

                {/* Timeline Location Markers */}
                {timeline.map((entry, idx) => {
                  const isSelected = highlightedIdx === idx;
                  const dayColor = getDayColor(entry.dayDate, uniqueDates);
                  return (
                    <MapboxGL.PointAnnotation
                      key={entry.id}
                      id={`marker-${entry.id}`}
                      coordinate={[entry.longitude, entry.latitude]}
                      onSelected={() => handleMarkerTap(idx, cameraRef)}
                    >
                      <View
                        style={[
                          styles.customMarkerContainer,
                          isSelected && styles.customMarkerSelected,
                        ]}
                      >
                        <View style={[styles.customMarkerPin, { backgroundColor: dayColor }]}>
                          <Text style={styles.customMarkerText}>{idx + 1}</Text>
                        </View>
                      </View>
                      <MapboxGL.Callout title={entry.name} />
                    </MapboxGL.PointAnnotation>
                  );
                })}

                {/* GPS User Location Marker */}
                {userLocation && (
                  <MapboxGL.PointAnnotation id="userLocation" coordinate={userLocation}>
                    <View style={styles.userLocationMarker} />
                  </MapboxGL.PointAnnotation>
                )}
              </MapboxGL.MapView>

              {/* My Location floating button */}
              <TouchableOpacity
                style={styles.myLocationBtn}
                onPress={() => handleMyLocation(cameraRef)}
                activeOpacity={0.8}
                disabled={locatingUser}
              >
                {locatingUser ? (
                  <ActivityIndicator size="small" color={BRAND} />
                ) : (
                  <Feather name="crosshair" size={16} color={BRAND} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.recenterBtn}
                onPress={() => handleFocusMap(cameraRef)}
                activeOpacity={0.8}
              >
                <Feather name="navigation" size={15} color={BRAND} />
              </TouchableOpacity>

              {/* Toggle Satellite Style Layer */}
              <TouchableOpacity
                style={[styles.myLocationBtn, { bottom: 100 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsSatellite(!isSatellite);
                }}
                activeOpacity={0.8}
              >
                <Feather name="layers" size={16} color={isSatellite ? BRAND : '#6B7280'} />
              </TouchableOpacity>
            </>
          )}

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
                  <Image
                    source={{ uri: selectedPlace.entry.photo }}
                    style={styles.directionCardImg}
                  />
                ) : (
                  <View style={[styles.directionCardImg, styles.directionCardImgPlaceholder]}>
                    <Feather name="map-pin" size={18} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.directionCardInfo}>
                  <Text style={styles.directionCardName} numberOfLines={1}>
                    {selectedPlace.entry.name}
                  </Text>
                  <View style={styles.directionCardMeta}>
                    <Feather name="clock" size={10} color="#9CA3AF" />
                    <Text style={styles.directionCardMetaText}>{selectedPlace.entry.mockTime}</Text>
                  </View>
                  {selectedPlace.distFromPrev && (
                    <View style={styles.directionCardMeta}>
                      <Feather name="navigation" size={10} color={BRAND} />
                      <Text
                        style={[styles.directionCardMetaText, { color: BRAND, fontWeight: '600' }]}
                      >
                        {selectedPlace.distFromPrev} từ điểm trước
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.directionCardBtns}>
                <TouchableOpacity
                  style={styles.directionBtn}
                  onPress={() =>
                    handleDirections(
                      selectedPlace.entry.latitude,
                      selectedPlace.entry.longitude,
                      selectedPlace.entry.name,
                    )
                  }
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  {navigatingToPlace ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Feather name="map" size={14} color="#FFF" />
                  )}
                  <Text style={styles.directionBtnText}>Chỉ đường</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.directionBtn, styles.navigateBtn]}
                  onPress={() =>
                    handleNavigate(selectedPlace.entry.latitude, selectedPlace.entry.longitude)
                  }
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
            <Text style={styles.timelineCount}>{visitedCount} điểm</Text>
          </View>
        </View>

        <View style={styles.timelineList}>
          {timeline.map((entry, idx) => {
            const isFirstOfDay = idx === 0 || entry.dayDate !== timeline[idx - 1].dayDate;
            const dayNum = uniqueDates.indexOf(entry.dayDate) + 1;
            
            return (
              <React.Fragment key={`timelineFrag-${entry.id}`}>
                {isFirstOfDay && (
                  <View style={styles.daySeparator}>
                    <View style={[styles.daySeparatorLine, { backgroundColor: getDayColor(entry.dayDate, uniqueDates) }]} />
                    <Text style={[styles.daySeparatorText, { color: getDayColor(entry.dayDate, uniqueDates) }]}>
                      Ngày {dayNum} • {formatShortDate(entry.dayDate)}
                    </Text>
                    <View style={[styles.daySeparatorLine, { backgroundColor: getDayColor(entry.dayDate, uniqueDates) }]} />
                  </View>
                )}
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
              </React.Fragment>
            );
          })}
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

          {/* Global Minimize / Close Button */}
          <View style={styles.fullscreenCloseBar}>
            <TouchableOpacity
              style={styles.fullscreenTopBtn}
              onPress={closeFullscreen}
              activeOpacity={0.8}
            >
              <Feather name="minimize-2" size={20} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {/* Full map */}
          {/* Full map */}
          {!isMapboxAvailable ? (
            <WebView
              style={styles.fullscreenMap}
              originWhitelist={['*']}
              source={{
                html: generateMapHtml(
                  timeline,
                  BRAND,
                  MAP_CONFIG.MAPBOX_ACCESS_TOKEN || '',
                  MAP_CONFIG.GOONG_MAPTILES_KEY || '',
                  uniqueDates,
                  routeSegments
                ),
                baseUrl: 'https://localhost',
              }}
              ref={fullscreenWebViewRef}
              onMessage={handleWebViewMessage}
            />
          ) : (
            <>
              <MapboxGL.MapView
                style={styles.fullscreenMap}
                styleURL={currentStyleURL}
                logoEnabled={false}
                attributionEnabled={false}
              >
                <MapboxGL.Camera
                  ref={fullscreenCameraRef}
                  zoomLevel={12}
                  centerCoordinate={initialCoordinate}
                />

                {/* Decoded Route Path Segments */}
                {routeSegments.map((segment, idx) => (
                  <MapboxGL.ShapeSource
                    key={`routeFS-${idx}`}
                    id={`routeSourceFS-${idx}`}
                    shape={{
                      type: 'Feature',
                      properties: {},
                      geometry: {
                        type: 'LineString',
                        coordinates: segment.coords,
                      },
                    }}
                  >
                    <MapboxGL.LineLayer
                      id={`routeLayerFS-${idx}`}
                      style={{
                        lineColor: segment.color,
                        lineWidth: 4,
                        lineOpacity: 0.8,
                        lineJoin: 'round',
                        lineCap: 'round',
                      }}
                    />
                  </MapboxGL.ShapeSource>
                ))}

                {/* Timeline Location Markers */}
                {timeline.map((entry, idx) => {
                  const isSelected = highlightedIdx === idx;
                  const dayColor = getDayColor(entry.dayDate, uniqueDates);
                  return (
                    <MapboxGL.PointAnnotation
                      key={entry.id}
                      id={`markerFS-${entry.id}`}
                      coordinate={[entry.longitude, entry.latitude]}
                      onSelected={() => handleMarkerTap(idx, fullscreenCameraRef)}
                    >
                      <View
                        style={[
                          styles.customMarkerContainer,
                          isSelected && styles.customMarkerSelected,
                        ]}
                      >
                        <View style={[styles.customMarkerPin, { backgroundColor: dayColor, backgroundImage: 'none' }]}>
                          <Text style={styles.customMarkerText}>{idx + 1}</Text>
                        </View>
                      </View>
                      <MapboxGL.Callout title={entry.name} />
                    </MapboxGL.PointAnnotation>
                  );
                })}

                {/* GPS User Location Marker */}
                {userLocation && (
                  <MapboxGL.PointAnnotation id="userLocationFS" coordinate={userLocation}>
                    <View style={styles.userLocationMarker} />
                  </MapboxGL.PointAnnotation>
                )}
              </MapboxGL.MapView>

              {/* Top controls */}
              <View style={styles.fullscreenTopBar}>
                <TouchableOpacity
                  style={styles.fullscreenTopBtn}
                  onPress={() => handleMyLocation(fullscreenCameraRef)}
                  activeOpacity={0.8}
                  disabled={locatingUser}
                >
                  {locatingUser ? (
                    <ActivityIndicator size="small" color={BRAND} />
                  ) : (
                    <Feather name="crosshair" size={18} color={BRAND} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fullscreenTopBtn}
                  onPress={() => handleFocusMap(fullscreenCameraRef)}
                  activeOpacity={0.8}
                >
                  <Feather name="navigation" size={18} color={BRAND} />
                </TouchableOpacity>

                {/* Toggle Satellite Style Layer */}
                <TouchableOpacity
                  style={styles.fullscreenTopBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsSatellite(!isSatellite);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="layers" size={18} color={isSatellite ? BRAND : '#6B7280'} />
                </TouchableOpacity>
              </View>
            </>
          )}

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
                  <Image
                    source={{ uri: selectedPlace.entry.photo }}
                    style={styles.directionCardImg}
                  />
                ) : (
                  <View style={[styles.directionCardImg, styles.directionCardImgPlaceholder]}>
                    <Feather name="map-pin" size={18} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.directionCardInfo}>
                  <Text style={styles.directionCardName} numberOfLines={1}>
                    {selectedPlace.entry.name}
                  </Text>
                  <View style={styles.directionCardMeta}>
                    <Feather name="clock" size={10} color="#9CA3AF" />
                    <Text style={styles.directionCardMetaText}>{selectedPlace.entry.mockTime}</Text>
                  </View>
                  {selectedPlace.distFromPrev && (
                    <View style={styles.directionCardMeta}>
                      <Feather name="navigation" size={10} color={BRAND} />
                      <Text
                        style={[styles.directionCardMetaText, { color: BRAND, fontWeight: '600' }]}
                      >
                        {selectedPlace.distFromPrev} từ điểm trước
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.directionCardBtns}>
                <TouchableOpacity
                  style={styles.directionBtn}
                  onPress={() =>
                    handleDirections(
                      selectedPlace.entry.latitude,
                      selectedPlace.entry.longitude,
                      selectedPlace.entry.name,
                    )
                  }
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  {navigatingToPlace ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Feather name="map" size={14} color="#FFF" />
                  )}
                  <Text style={styles.directionBtnText}>Chỉ đường</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.directionBtn, styles.navigateBtn]}
                  onPress={() =>
                    handleNavigate(selectedPlace.entry.latitude, selectedPlace.entry.longitude)
                  }
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
                const isFirstOfDay = idx === 0 || entry.dayDate !== timeline[idx - 1].dayDate;
                const dayNum = uniqueDates.indexOf(entry.dayDate) + 1;

                return (
                  <React.Fragment key={`sheetFrag-${entry.id}`}>
                    {isFirstOfDay && (
                      <View style={styles.sheetDaySeparator}>
                        <View style={[styles.sheetDaySeparatorDot, { backgroundColor: getDayColor(entry.dayDate, uniqueDates) }]} />
                        <Text style={[styles.sheetDaySeparatorText, { color: getDayColor(entry.dayDate, uniqueDates) }]}>
                          Ngày {dayNum} ({formatShortDate(entry.dayDate)})
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.sheetItem, isHighlighted && styles.sheetItemHighlighted]}
                      activeOpacity={0.7}
                      onPress={() => handleFullscreenTimelineTap(idx)}
                    >
                      <View
                        style={[styles.sheetStepDot, isHighlighted && styles.sheetStepDotActive]}
                      >
                        <Text
                          style={[styles.sheetStepNum, isHighlighted && styles.sheetStepNumActive]}
                        >
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
                        <Text style={styles.sheetItemName} numberOfLines={1}>
                          {entry.name}
                        </Text>
                        <Text style={styles.sheetItemMeta}>
                          {entry.mockTime} · {formatShortDate(entry.dayDate)}
                        </Text>
                      </View>

                      <Feather
                        name="chevron-right"
                        size={14}
                        color={isHighlighted ? BRAND : '#D1D5DB'}
                      />
                    </TouchableOpacity>

                    {dist && (
                      <View style={styles.sheetDistBadge}>
                        <Text style={styles.sheetDistText}>
                          🚗 {dist.distance} · {dist.time}
                        </Text>
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
