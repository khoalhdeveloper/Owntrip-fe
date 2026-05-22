import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CAMERA_FILTERS } from '../../constants/checkinFrames';
import { sessionCache } from './FrameSelectScreen';

const { width, height } = Dimensions.get('window');

export const CheckinCameraScreen = () => {
  const params = useLocalSearchParams();
  const slotsCount = Number(params.slotsCount) || 1;
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const [showFlash, setShowFlash] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedFilter, setSelectedFilter] = useState('retro');
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const cameraRef = useRef<any>(null);

  if (!permission) {
    return <View style={styles.loadingContainer} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Check-in Photo Booth</Text>
          <View style={{ width: 24 }} />
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
            sessionCache.userImageUris[sessionCache.activeSlotIndex] = cleanUri;
            router.push({
              pathname: '/checkin/frame',
              params: { imageUri: cleanUri },
            });
          } else {
            if (capturedPhotos.length < 8) {
              const newList = [...capturedPhotos, cleanUri];
              setCapturedPhotos(newList);
              if (newList.length === 8) {
                (sessionCache as any).capturedPhotosTemp = newList;
                router.push({ pathname: '/checkin/select' });
              }
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
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
                <Feather name="arrow-left" size={22} color="#fff" style={{ marginRight: 4 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleFlash} style={styles.headerIconBtn}>
                <Feather
                  name={flash === 'on' ? 'zap' : 'zap-off'}
                  size={20}
                  color={flash === 'on' ? '#F59E0B' : '#fff'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleFacing} style={styles.headerIconBtn}>
                <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Check-in Photo Booth</Text>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Feather name="settings" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {slotsCount > 1 && (
            <View style={styles.stepIndicatorContainer}>
              <Text style={styles.stepIndicatorText}>
                {capturedPhotos.length < 8 
                  ? `ĐÃ CHỤP: ${capturedPhotos.length}/8` 
                  : 'ĐÃ CHỤP ĐỦ 8 ẢNH. ĐANG CHUYỂN HƯỚNG...'}
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(capturedPhotos.length / 8) * 100}%` }
                  ]}
                />
              </View>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <View style={styles.bottomControlsPanel}>

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
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Feather name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.captureButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.captureButton,
                    capturedPhotos.length >= 8 && styles.captureButtonDisabled
                  ]}
                  onPress={takePicture}
                  disabled={capturedPhotos.length >= 8}
                >
                  <Feather name="camera" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.captureButtonSubtext}>
                  {capturedPhotos.length >= 8 ? 'Đủ 8 ảnh' : `Chụp ảnh ${capturedPhotos.length + 1}`}
                </Text>
              </View>
              {slotsCount === 4 ? (
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    capturedPhotos.length >= 4 ? styles.confirmButtonActive : styles.confirmButtonDisabled
                  ]}
                  disabled={capturedPhotos.length < 4}
                  onPress={() => {
                    (sessionCache as any).capturedPhotosTemp = capturedPhotos;
                    router.push({ pathname: '/checkin/select' });
                  }}
                >
                  <Feather name="check" size={24} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={styles.controlPlaceholder} />
              )}
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
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 12,
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
    borderColor: 'rgba(47, 128, 237, 0.45)',
    transform: [{ translateX: -75 }, { translateY: -75 }],
  },
  bottomControlsPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  filtersWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  filterItem: {
    alignItems: 'center',
  },
  filterOuterRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeFilterRing: {
    borderColor: '#2F80ED',
  },
  filterCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#2F80ED',
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlPlaceholder: {
    width: 50,
  },
  captureButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#2F80ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#e1eeff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  captureButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonSubtext: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: 'bold',
    marginTop: 6,
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
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
});
