import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConfirm } from '@/components/ConfirmProvider';

const { width, height } = Dimensions.get('window');

export default function CheckinScreen() {
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const { alert: showAlert } = useConfirm();

  // Request permissions on mount
  useEffect(() => {
    if (!permission) requestPermission();
    if (!mediaPermission) requestMediaPermission();
  }, []);

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7CFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Feather name="camera-off" size={64} color="#CBD5E0" />
        <Text style={styles.permissionText}>
          Chúng tôi cần quyền truy cập camera để bạn thực hiện check-in.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Cấp quyền Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((current) => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      // Shutter effect
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        exif: false,
      });

      if (photo) {
        setLastPhoto(photo.uri);
        // Save to gallery
        const asset = await MediaLibrary.createAssetAsync(photo.uri);
        await MediaLibrary.createAlbumAsync('OwnTrip', asset, false);

        // Success feedback (vibrate or toast could go here)
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
      showAlert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} flash={flash} ref={cameraRef}>
        <SafeAreaView style={styles.overlay} edges={['top']}>
          {/* Top Bar */}
          <View style={styles.topContainer}>
            <BlurView intensity={20} style={styles.topBar}>
              <TouchableOpacity style={styles.topIconButton} onPress={toggleFlash}>
                <Feather
                  name={flash === 'on' ? 'zap' : flash === 'auto' ? 'zap' : 'zap-off'}
                  size={20}
                  color={flash === 'off' ? '#FFF' : '#FFD700'}
                />
                {flash === 'auto' && <Text style={styles.autoText}>A</Text>}
              </TouchableOpacity>

              <View style={styles.brandBadge}>
                <Text style={styles.brandText}>OwnTrip</Text>
                <View style={styles.dot} />
                <Text style={styles.modeText}>CAM</Text>
              </View>

              <TouchableOpacity style={styles.topIconButton}>
                <Feather name="settings" size={20} color="#FFF" />
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomContainer}>
            <BlurView intensity={20} tint="dark" style={styles.bottomBar}>
              <View style={styles.controlsRow}>
                {/* Gallery Preview */}
                <TouchableOpacity style={styles.galleryPreview}>
                  {lastPhoto ? (
                    <Image source={{ uri: lastPhoto }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.previewPlaceholder}>
                      <Feather name="image" size={20} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Main Capture Button */}
                <TouchableOpacity
                  style={styles.captureButtonContainer}
                  onPress={takePicture}
                  activeOpacity={0.7}
                  disabled={isCapturing}
                >
                  <View style={styles.captureButtonOuter}>
                    <View
                      style={[styles.captureButtonInner, isCapturing && styles.captureButtonActive]}
                    />
                  </View>
                </TouchableOpacity>

                {/* Flip Button */}
                <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                  <Feather name="refresh-cw" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </SafeAreaView>

        {/* Shutter Animation */}
        <Animated.View pointerEvents="none" style={[styles.shutterFlash, { opacity: flashAnim }]} />
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFF',
  },
  permissionText: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#4A7CFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContainer: {
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '900',
    position: 'absolute',
    right: 6,
    top: 6,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#48BB78',
    marginHorizontal: 8,
  },
  modeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomContainer: {
    paddingBottom: 95,
    paddingHorizontal: 16,
  },
  bottomBar: {
    borderRadius: 35,
    paddingVertical: 16,
    paddingHorizontal: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryPreview: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
  captureButtonActive: {
    transform: [{ scale: 0.9 }],
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    zIndex: 999,
  },
});
