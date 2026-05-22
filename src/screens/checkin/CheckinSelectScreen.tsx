import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { sessionCache } from './FrameSelectScreen';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export const CheckinSelectScreen = () => {
  const capturedPhotos = (sessionCache as any).capturedPhotosTemp || [];
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const toggleSelectPhoto = (uri: string) => {
    setSelectedPhotos(prev => {
      if (prev.includes(uri)) {
        return prev.filter(item => item !== uri);
      } else {
        if (prev.length < 4) {
          return [...prev, uri];
        }
        return prev;
      }
    });
  };

  const handleConfirm = () => {
    if (selectedPhotos.length === 4) {
      // Store in sessionCache userImageUris
      selectedPhotos.forEach((uri, idx) => {
        sessionCache.userImageUris[idx] = uri;
      });
      sessionCache.activeSlotIndex = 0;
      
      // Clear temp photos
      (sessionCache as any).capturedPhotosTemp = [];

      router.push({
        pathname: '/checkin/frame',
        params: { multiImageLoaded: 'true' },
      });
    }
  };

  const handleRetake = () => {
    // Go back to camera
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleRetake} style={styles.headerBackBtn}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận hình ảnh</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Bạn đã chụp {capturedPhotos.length} ảnh. Hãy chọn ra 4 tấm ảnh ưng ý nhất để đưa vào khung hình.
          </Text>
          <Text style={styles.counterText}>
            Đã chọn: <Text style={styles.counterHighlight}>{selectedPhotos.length} / 4</Text>
          </Text>
        </View>

        {/* Photos Grid */}
        <View style={styles.gridContainer}>
          {capturedPhotos.map((uri: string, index: number) => {
            const selectIdx = selectedPhotos.indexOf(uri);
            const isSelected = selectIdx !== -1;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.photoCard,
                  isSelected && styles.photoCardActive
                ]}
                onPress={() => toggleSelectPhoto(uri)}
                activeOpacity={0.8}
              >
                <Image source={{ uri }} style={styles.photo} />
                {isSelected ? (
                  <View style={styles.badgeActive}>
                    <Text style={styles.badgeText}>{selectIdx + 1}</Text>
                  </View>
                ) : (
                  <View style={styles.badgeInactive} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
          <Feather name="camera" size={18} color="#4A5568" />
          <Text style={styles.retakeButtonText}>Chụp thêm / lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            selectedPhotos.length === 4 ? styles.confirmButtonActive : styles.confirmButtonDisabled
          ]}
          disabled={selectedPhotos.length !== 4}
          onPress={handleConfirm}
        >
          <Feather name="check" size={18} color="#fff" />
          <Text style={styles.confirmButtonText}>Xác nhận (Xong)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  headerBackBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A253C',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  instructionContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  instructionText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    textAlign: 'center',
  },
  counterText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    textAlign: 'center',
    marginTop: 10,
  },
  counterHighlight: {
    color: '#2F80ED',
    fontSize: 18,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoCard: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH * 1.25,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EDF2F7',
    position: 'relative',
    borderWidth: 3,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  photoCardActive: {
    borderColor: '#2F80ED',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  badgeActive: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2F80ED',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  badgeInactive: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    borderRadius: 24,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  retakeButtonText: {
    color: '#4A5568',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
  },
  confirmButtonActive: {
    backgroundColor: '#2ecc71',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
});
