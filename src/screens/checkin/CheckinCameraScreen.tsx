import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CAMERA_FILTERS } from '../../constants/checkinFrames';
import { sessionCache } from './FrameSelectScreen';

const { width } = Dimensions.get('window');
const CAMERA_SIZE = width - 32;

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
  const capturedPhotosRef = useRef<string[]>([]);

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

          // Trigger screen flash animation
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 150);

          if (slotsCount === 1) {
            // Standard single photo frame flow
            sessionCache.userImageUris[sessionCache.activeSlotIndex] = cleanUri;
            router.push({
              pathname: '/checkin/frame',
              params: { imageUri: cleanUri },
            });
          } else {
            // Multi-photo frame flow (capture sequentially using ref to avoid closure state delay)
            capturedPhotosRef.current.push(cleanUri);
            
            // Sync with local state to update the visual UI progress
            const currentList = [...capturedPhotosRef.current];
            setCapturedPhotos(currentList);

            // Store in sessionCache slot immediately
            const currentIndex = currentList.length - 1;
            if (currentIndex < 4) {
              sessionCache.userImageUris[currentIndex] = cleanUri;
            }

            if (currentList.length >= slotsCount) {
              sessionCache.activeSlotIndex = 0; // Reset active index
              capturedPhotosRef.current = []; // Clear capture ref
              
              // Navigate back to selection screen
              router.push({
                pathname: '/checkin/frame',
                params: { multiImageLoaded: 'true' },
              });
            }
          }
        }
      } catch (error) {
        console.error('Capture error:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Camera Control Options */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
            <Feather name="arrow-left" size={22} color="#4A5568" style={{ marginRight: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFlash} style={styles.headerIconBtn}>
            <Feather
              name={flash === 'on' ? 'zap' : 'zap-off'}
              size={20}
              color={flash === 'on' ? '#F59E0B' : '#4A5568'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFacing} style={styles.headerIconBtn}>
            <Ionicons name="camera-reverse-outline" size={22} color="#4A5568" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Check-in Photo Booth</Text>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Feather name="settings" size={20} color="#4A5568" />
        </TouchableOpacity>
      </View>

      {/* Camera Area */}
      <View style={styles.cameraWrapper}>
        <CameraView
          style={styles.camera}
          ref={cameraRef}
          facing={facing}
          enableTorch={flash === 'on'}
        >
          {/* Photo Booth Step Indicator */}
          {slotsCount > 1 && (
            <View style={styles.stepIndicatorContainer}>
              <Text style={styles.stepIndicatorText}>
                ĐANG CHỤP: {capturedPhotos.length + 1} / {slotsCount}
              </Text>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${(capturedPhotos.length / slotsCount) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Flash animation overlay */}
          {showFlash && <View style={styles.flashOverlay} />}

          {/* 3x3 Grid Overlay with Face Guide Target */}
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
        </CameraView>
      </View>

      {/* Premium Filter Options mimicking reference screenshot */}
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

      {/* Bottom Capture Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlPlaceholder} />

        <View style={styles.captureButtonContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <Feather name="camera" size={28} color="#fff" />
          </TouchableOpacity>
          {slotsCount > 1 && (
            <Text style={styles.captureButtonSubtext}>
              Chụp ảnh {capturedPhotos.length + 1}
            </Text>
          )}
        </View>

        <View style={styles.controlPlaceholder} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
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
    color: '#1A253C',
    flex: 1,
    textAlign: 'center',
    marginRight: 12,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  permissionText: {
    fontSize: 15,
    color: '#4A5568',
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
  cameraWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  camera: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: 18,
    overflow: 'hidden',
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
  filtersWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginVertical: 20,
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
    color: '#4A5568',
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
    paddingVertical: 10,
  },
  controlPlaceholder: {
    width: 60,
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
    color: '#718096',
    fontWeight: 'bold',
    marginTop: 6,
  },
  stepIndicatorContainer: {
    position: 'absolute',
    top: 20,
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
