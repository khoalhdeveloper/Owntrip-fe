import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CAMERA_FILTERS } from '../../constants/checkinFrames';
import { sessionCache } from './FrameSelectScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getCameraControlsBottomPadding,
  getCameraHeaderTopPadding,
  getCheckinHeaderTopPadding,
} from '../../utils/mobileLayout';

export const CheckinCameraScreen = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const slotsCount = Number(params.slotsCount) || 1;
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const [showFlash, setShowFlash] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedFilter, setSelectedFilter] = useState('retro');
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const cameraRef = useRef<any>(null);
  const canSkipToSelect = slotsCount > 1 && capturedPhotos.length >= 4;

  if (!permission) {
    return <View style={styles.loadingContainer} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: getCheckinHeaderTopPadding(insets.top) }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Check-in Photo Booth</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.permissionContainer}>
          <Feather name="camera-off" size={64} color="#A0AEC0" style={{ marginBottom: 20 }} />
          <Text style={styles.permissionText}>Chúng tôi cần quyền truy cập máy ảnh để chụp hình.</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Cấp quyền</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const toggleFacing = () => {
    setFacing(prev => (prev === 'front' ? 'back' : 'front'));
  };

  const toggleFlash = () => {
    setFlash(prev => (prev === 'off' ? 'on' : 'off'));
  };

  // Frame 4-slot luôn chụp 8 ảnh, sau đó user chọn 4 tấm ưng ý
  const CAPTURE_LIMIT = slotsCount >= 4 ? 8 : 1;

  const handleCapture = () => {
    if (capturedPhotos.length >= CAPTURE_LIMIT) return;
    takePicture();
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.95,
          skipProcessing: false,
        });

        if (photo?.uri) {
          let cleanUri = photo.uri;
          if (cleanUri.includes('%')) {
            cleanUri = cleanUri.replace(/%/g, '%25');
          }
          if (cleanUri.startsWith('file:/') && !cleanUri.startsWith('file:///')) {
            cleanUri = cleanUri.replace('file:/', 'file:///');
          }

          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 150);

          if (slotsCount === 1) {
            // Single-slot: chụp 1 ảnh → vào frame ngay
            sessionCache.userImageUris[sessionCache.activeSlotIndex] = cleanUri;
            router.push({
              pathname: '/checkin/frame',
              params: { imageUri: cleanUri },
            });
          } else {
            // Multi-slot (filmstrip-4 hoặc khác): luôn chụp 8 ảnh → chọn 4
            const newList = [...capturedPhotos, cleanUri];
            setCapturedPhotos(newList);
            if (newList.length >= CAPTURE_LIMIT) {
              (sessionCache as any).capturedPhotosTemp = newList;
              router.push({ pathname: '/checkin/select' });
            }
          }
        }
      } catch (error) {
        console.error('Capture error:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        facing={facing}
        enableTorch={flash === 'on'}
      >
        {showFlash && <View style={styles.flashOverlay} />}
        <View style={styles.gridContainer} pointerEvents="none">
          <View style={styles.centerTargetCircle} />
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.borderRight, styles.borderBottom]} />
            <View style={[styles.gridCell, styles.borderRight, styles.borderBottom]} />
            <View style={[styles.gridCell, styles.borderBottom]} />
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.borderRight, styles.borderBottom]} />
            <View style={[styles.gridCell, styles.borderRight, styles.borderBottom]} />
            <View style={[styles.gridCell, styles.borderBottom]} />
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.borderRight]} />
            <View style={[styles.gridCell, styles.borderRight]} />
            <View style={styles.gridCell} />
          </View>
        </View>
        <SafeAreaView style={styles.safeOverlay}>
          <View style={[styles.header, { paddingTop: getCameraHeaderTopPadding(insets.top) }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={toggleFlash} style={styles.headerIconBtn}>
                <Feather
                  name={flash === 'on' ? 'zap' : 'zap-off'}
                  size={20}
                  color={flash === 'on' ? '#F59E0B' : '#fff'}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.headerTitlePill}>
              <Text style={styles.headerTitle} numberOfLines={1}>Check-in Photo Booth</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
          {slotsCount > 1 && (
            <View style={styles.stepIndicatorContainer}>
              <Text style={styles.stepIndicatorText}>
                {capturedPhotos.length < CAPTURE_LIMIT
                  ? `ĐÃ CHỤP: ${capturedPhotos.length}/${CAPTURE_LIMIT}`
                  : `ĐÃ CHỤP ĐỦ ${CAPTURE_LIMIT} ẢNH. ĐANG CHUYỂN HƯỚNG...`}
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(capturedPhotos.length / CAPTURE_LIMIT) * 100}%` }
                  ]}
                />
              </View>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <View
            style={[
              styles.bottomControlsPanel,
              { paddingBottom: getCameraControlsBottomPadding(insets.bottom) },
            ]}
          >

            <View style={styles.filtersWrapper}>
              {CAMERA_FILTERS.map(filter => {
                const isSelected = selectedFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    style={styles.filterItem}
                    onPress={() => setSelectedFilter(filter.id)}
                  >
                    <View style={[styles.filterOuterRing, isSelected && styles.activeFilterRing]}>
                      <View
                        style={[
                          styles.filterCircle,
                          (styles as any)[`filter_${filter.id}`] || styles.filterDefault,
                        ]}
                      >
                        {filter.id === 'neon' && <View style={styles.neonCenter} />}
                      </View>
                    </View>
                    <Text style={[styles.filterText, isSelected && styles.activeFilterText]}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={styles.secondaryControlButton}
                onPress={() => router.back()}
              >
                <Feather name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.captureButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.captureButton,
                    capturedPhotos.length >= CAPTURE_LIMIT && styles.captureButtonDisabled,
                  ]}
                  onPress={handleCapture}
                  disabled={capturedPhotos.length >= CAPTURE_LIMIT}
                >
                  <Feather name="camera" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.captureButtonSubtext}>
                  {capturedPhotos.length >= CAPTURE_LIMIT
                    ? 'Đã đủ ảnh'
                    : `Chụp ảnh ${capturedPhotos.length + 1}`}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.secondaryControlButton,
                  canSkipToSelect && styles.confirmButtonActive,
                ]}
                onPress={() => {
                  if (canSkipToSelect) {
                    (sessionCache as any).capturedPhotosTemp = capturedPhotos;
                    router.push({ pathname: '/checkin/select' });
                    return;
                  }
                  toggleFacing();
                }}
              >
                {canSkipToSelect ? (
                  <Feather name="check" size={24} color="#fff" />
                ) : (
                  <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(8, 13, 24, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  headerTitlePill: {
    flex: 1,
    minHeight: 38,
    marginHorizontal: 10,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: 'rgba(8, 13, 24, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#1A253C',
  },
  permissionText: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#2F80ED',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.25)',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.25)',
  },
  centerTargetCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ translateX: -75 }, { translateY: -75 }],
  },
  bottomControlsPanel: {
    marginHorizontal: 12,
    marginBottom: 10,
    paddingTop: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(8, 13, 24, 0.58)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  filtersWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  filterItem: {
    alignItems: 'center',
    width: 68,
  },
  filterOuterRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  activeFilterRing: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  filterCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterDefault: {
    backgroundColor: '#CBD5E0',
  },
  filter_retro: {
    backgroundColor: '#d4b791',
  },
  filter_neon: {
    backgroundColor: '#050a1d',
    borderWidth: 2,
    borderColor: '#0055ff',
  },
  filter_classic: {
    backgroundColor: '#8a857e',
  },
  filter_bw: {
    backgroundColor: '#1a202c',
  },
  neonCenter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0055ff',
  },
  filterText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '700',
    lineHeight: 14,
    includeFontPadding: false,
  },
  activeFilterText: {
    color: '#60A5FA',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  controlPlaceholder: {
    width: 54,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.36,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  captureButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 112,
  },
  captureButtonSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 8,
    lineHeight: 15,
    includeFontPadding: false,
  },
  stepIndicatorContainer: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  stepIndicatorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  progressBarBg: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
    alignItems: 'center',
  },
  rollContainer: {
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  rollTitle: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  rollScroll: {
    alignItems: 'center',
  },
  rollItem: {
    width: 60,
    height: 60,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rollItemActive: {
    borderColor: '#2F80ED',
  },
  rollImage: {
    width: '100%',
    height: '100%',
  },
  rollBadgeActive: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#2F80ED',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rollBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rollBadgeInactive: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  secondaryControlButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonActive: {
    backgroundColor: '#2ecc71',
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  captureButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2F80ED',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 999,
  },
  countdownContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 500,
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});
