import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';

import { CheckinFrame } from '../../types/checkin.type';
import { FrameGallery } from '../../components/checkin/FrameGallery';
import { CheckinEditor } from '../../components/checkin/CheckinEditor';
import { CheckinToolbar } from '../../components/checkin/CheckinToolbar';

import { saveImageToLibrary } from '../../utils/saveImageToLibrary';
import { shareImage } from '../../utils/shareImage';

// Session Cache to preserve state across camera navigation and route transitions.
// Attached to global scope to be 100% immune to duplicate Metro module bundles.
if (!(global as any).checkinSessionCache) {
  (global as any).checkinSessionCache = {
    userImageUris: [null, null, null, null] as (string | null)[],
    activeSlotIndex: 0,
    selectedFrame: null as CheckinFrame | null,
  };
}
export const sessionCache = (global as any).checkinSessionCache;

export const FrameSelectScreen = () => {
  const params = useLocalSearchParams();
  const [userImageUris, setUserImageUris] = useState<(string | null)[]>(sessionCache.userImageUris);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(sessionCache.activeSlotIndex);
  const [selectedFrame, setSelectedFrame] = useState<CheckinFrame | null>(sessionCache.selectedFrame);
  const [isProcessing, setIsProcessing] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  // Sync state with sessionCache when component mounts or updates
  useEffect(() => {
    setUserImageUris([...sessionCache.userImageUris]);
    setActiveSlotIndex(sessionCache.activeSlotIndex);
    setSelectedFrame(sessionCache.selectedFrame);
  }, [params.imageUri, params.multiImageLoaded]);

  useEffect(() => {
    if (params.imageUri) {
      let cleanUri = params.imageUri as string;
      
      // Double encode percent signs so Fresco image loader doesn't decode them prematurely
      if (cleanUri.includes('%')) {
        cleanUri = cleanUri.replace(/%/g, '%25');
      }
      
      if (cleanUri.startsWith('file:/') && !cleanUri.startsWith('file:///')) {
        cleanUri = cleanUri.replace('file:/', 'file:///');
      }
      
      sessionCache.userImageUris[sessionCache.activeSlotIndex] = cleanUri;
      setUserImageUris([...sessionCache.userImageUris]);
    }
  }, [params.imageUri]);

  const selectSlot = (index: number) => {
    sessionCache.activeSlotIndex = index;
    setActiveSlotIndex(index);
  };

  const handleTakePhotoForSlot = (index: number) => {
    sessionCache.activeSlotIndex = index;
    setActiveSlotIndex(index);
    router.push({
      pathname: '/checkin/camera',
      params: { slotsCount: selectedFrame?.slotsCount || 1 }
    });
  };

  const handleSave = async () => {
    setIsProcessing(true);
    const finalUri = await saveImageToLibrary(viewShotRef);
    setIsProcessing(false);
    if (finalUri) {
      router.push({
        pathname: '/checkin/result',
        params: { finalImageUri: finalUri, title: 'Kỷ niệm tuyệt vời!' },
      });
    }
  };

  const handleShare = async () => {
    setIsProcessing(true);
    const finalUri = await shareImage(viewShotRef);
    setIsProcessing(false);
    if (finalUri) {
      router.push({
        pathname: '/checkin/result',
        params: { finalImageUri: finalUri, title: 'Kỷ niệm tuyệt vời!' },
      });
    }
  };

  const hasAnyImage = userImageUris.some(Boolean);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn khung hình</Text>
        <TouchableOpacity>
          <Feather name="settings" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Thumbnails list on top */}
        <View style={styles.thumbnailsContainer}>
          <Text style={styles.sectionTitle}>
            {selectedFrame?.layoutType === 'filmstrip-4'
              ? 'Thứ tự ảnh trong khung (Chọn ô để thay đổi)'
              : 'Ảnh đã chọn'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailScroll}
          >
            {selectedFrame?.layoutType === 'filmstrip-4' ? (
              [0, 1, 2, 3].map((index) => {
                const uri = userImageUris[index];
                const isActive = index === activeSlotIndex;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.thumbnailWrapper,
                      isActive && styles.activeThumbnailWrapper,
                    ]}
                    onPress={() => selectSlot(index)}
                  >
                    {uri ? (
                      <Image source={{ uri }} style={styles.thumbnailImage} />
                    ) : (
                      <TouchableOpacity
                        style={styles.emptyThumbnailSlot}
                        onPress={() => handleTakePhotoForSlot(index)}
                      >
                        <Feather name="plus" size={14} color="#718096" />
                        <Text style={styles.emptyThumbnailText}>Ô {index + 1}</Text>
                      </TouchableOpacity>
                    )}
                    <View style={[styles.slotBadge, isActive && styles.activeSlotBadge]}>
                      <Text style={styles.slotBadgeText}>{index + 1}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <>
                {userImageUris[0] && (
                  <TouchableOpacity
                    style={[styles.thumbnailWrapper, activeSlotIndex === 0 && styles.activeThumbnailWrapper]}
                    onPress={() => selectSlot(0)}
                  >
                    <Image source={{ uri: userImageUris[0] }} style={styles.thumbnailImage} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.addThumbnailButton}
                  onPress={() => handleTakePhotoForSlot(0)}
                >
                  <Feather name="plus" size={18} color="#718096" />
                  <Text style={styles.addThumbnailText}>Chọn ảnh</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>

        {/* Checkin Preview in Middle */}
        <CheckinEditor
          userImageUri={userImageUris[0]}
          userImageUris={userImageUris}
          selectedFrame={selectedFrame}
          viewShotRef={viewShotRef}
          activeSlotIndex={activeSlotIndex}
          onSelectSlot={selectSlot}
        />

        {/* Frame Selector */}
        <FrameGallery
          selectedFrameId={selectedFrame?.id || null}
          onSelectFrame={(frame) => {
            sessionCache.selectedFrame = frame;
            setSelectedFrame(frame);
            // Default active index reset when changing layout
            if (frame?.layoutType === 'filmstrip-4') {
              selectSlot(0);
            }
          }}
        />
      </ScrollView>

      {/* Action Toolbar */}
      <CheckinToolbar
        onTakePhoto={() => router.push({
          pathname: '/checkin/camera',
          params: { slotsCount: selectedFrame?.slotsCount || 1 }
        })}
        onSave={handleSave}
        onShare={handleShare}
        canSave={hasAnyImage && !isProcessing}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingBottom: 90,
  },
  scrollContent: {
    flexGrow: 1,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A253C',
  },
  thumbnailsContainer: {
    paddingHorizontal: 16,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 8,
  },
  thumbnailScroll: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  thumbnailWrapper: {
    marginRight: 12,
    position: 'relative',
    padding: 2,
  },
  activeThumbnailWrapper: {
    borderColor: '#2F80ED',
    borderWidth: 2,
    borderRadius: 10,
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  emptyThumbnailSlot: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
  },
  emptyThumbnailText: {
    fontSize: 8,
    color: '#718096',
    marginTop: 2,
  },
  slotBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#718096',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  activeSlotBadge: {
    backgroundColor: '#2F80ED',
  },
  slotBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  activeThumbnailIndicator: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2F80ED',
  },
  addThumbnailButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  addThumbnailText: {
    fontSize: 8,
    color: '#718096',
    marginTop: 2,
  },
});
