import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkinService } from '../../services/checkinService';
import {
  getCheckinHeaderTopPadding,
  getTabScreenBottomPadding,
} from '../../utils/mobileLayout';

const { width } = Dimensions.get('window');
const PREVIEW_WIDTH = width - 40;

const normalizeFilePath = (uri: any): string | null => {
  if (!uri || typeof uri !== 'string') return null;
  let cleanUri = uri;
  
  // Double encode percent signs so Fresco image loader doesn't decode them prematurely
  if (cleanUri.includes('%')) {
    cleanUri = cleanUri.replace(/%/g, '%25');
  }
  
  if (cleanUri.startsWith('file:/') && !cleanUri.startsWith('file:///')) {
    cleanUri = cleanUri.replace('file:/', 'file:///');
  }
  return cleanUri;
};

export const CheckinResultScreen = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const rawImageUri = params.finalImageUri;
  const finalImageUri = normalizeFilePath(rawImageUri);
  const fromGallery = params.fromGallery === 'true';
  const resultTitle = params.title ? String(params.title) : 'Ká»· niá»‡m Check-in';

  const [isFavorite, setIsFavorite] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dbId, setDbId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageHeight, setImageHeight] = useState(PREVIEW_WIDTH); // default square

  // Determine actual image aspect ratio for correct preview height
  useEffect(() => {
    if (!finalImageUri) return;
    Image.getSize(
      finalImageUri,
      (w, h) => {
        const ratio = h / w;
        setImageHeight(Math.min(PREVIEW_WIDTH * ratio, PREVIEW_WIDTH * 3.2));
      },
      () => setImageHeight(PREVIEW_WIDTH) // fallback square
    );
  }, [finalImageUri]);

  useEffect(() => {
    if (fromGallery && params.id) {
      setDbId(String(params.id));
      setIsFavorite(params.isFavorite === 'true');
    }
  }, [fromGallery, params.id, params.isFavorite]);

  useEffect(() => {
    const saveToBackend = async () => {
      if (fromGallery || !finalImageUri) return;

      // Prevent double-saving if effect triggers multiple times
      if ((global as any).lastSavedCheckinUri === finalImageUri) {
        return;
      }
      (global as any).lastSavedCheckinUri = finalImageUri;

      setIsSaving(true);
      let uploadUrl = finalImageUri;

      const isLocalUri =
        uploadUrl.startsWith('file:/') ||
        uploadUrl.startsWith('content:/') ||
        uploadUrl.startsWith('ph:/');

      if (isLocalUri) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
          console.log('☁️ Uploading composed check-in image to Cloudinary...', uploadUrl);
          const formData = new FormData();
          formData.append('file', {
            uri: uploadUrl,
            type: 'image/jpeg',
            name: 'checkin.jpg',
          } as any);
          formData.append('upload_preset', 'owntrip');

          const cloudResponse = await fetch('https://api.cloudinary.com/v1_1/djm9x06oh/image/upload', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const cloudData = await cloudResponse.json();
          if (cloudData.secure_url) {
            uploadUrl = cloudData.secure_url;
            console.log('✅ Composed check-in uploaded to Cloudinary:', uploadUrl);
          } else {
            console.warn('⚠️ Cloudinary composed image upload failed, falling back to local URI:', cloudData);
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          console.warn('⚠️ Cloudinary Upload Failed, falling back to local URI:', err);
        }
      }

      // Save to backend database
      try {
        console.log('📡 Saving checkin to Backend database...', uploadUrl);
        const date = new Date().toLocaleDateString('vi-VN');
        const savedMemory = await checkinService.createMemory(uploadUrl, resultTitle, date);

        if (savedMemory) {
          console.log('✅ Composed check-in saved to backend:', savedMemory);
          setDbId(savedMemory.id);
          setIsFavorite(savedMemory.isFavorite);
        } else {
          Alert.alert('Thông báo', 'Không thể lưu kỷ niệm vào máy chủ.');
        }
      } catch (err: any) {
        console.error('🔥 Backend Save Failed:', err);
        Alert.alert('Lỗi lưu máy chủ', 'Không thể lưu kỷ niệm vào máy chủ backend. Chi tiết: ' + err.message);
      } finally {
        setIsSaving(false);
      }
    };

    saveToBackend();
  }, [finalImageUri, fromGallery, resultTitle]);

  const handleToggleFavorite = async () => {
    if (!dbId) {
      // Toggle locally if not synced yet
      setIsFavorite(!isFavorite);
      return;
    }
    const success = await checkinService.toggleFavorite(dbId);
    if (success) {
      setIsFavorite(!isFavorite);
    } else {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái yêu thích.');
    }
  };

  if (!finalImageUri) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: getCheckinHeaderTopPadding(insets.top) }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kết quả</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy ảnh kết quả.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDownload = async () => {
    try {
      setIsProcessing(true);

      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Chúng tôi cần quyền lưu ảnh vào thư viện của bạn.');
        return;
      }

      const assetUri = finalImageUri as string;

      if (assetUri.startsWith('http')) {
        Alert.alert('Thành công', 'Ảnh mẫu đã được lưu vào thư viện của bạn!');
        return;
      }

      const asset = await MediaLibrary.createAssetAsync(assetUri);
      await MediaLibrary.createAlbumAsync('OwnTrip Booth', asset, false);
      Alert.alert('Thành công', 'Ảnh đã được lưu vào thư viện!');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Lỗi', 'Không thể lưu ảnh. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsProcessing(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Lỗi', 'Tính năng chia sẻ không khả dụng trên thiết bị này.');
        return;
      }

      const shareUri = finalImageUri as string;
      if (shareUri.startsWith('http')) {
        Alert.alert('Chia sẻ', 'Đang chia sẻ link ảnh: ' + shareUri);
        return;
      }

      await Sharing.shareAsync(shareUri);
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: getCheckinHeaderTopPadding(insets.top) }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-in Photo Booth</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getTabScreenBottomPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Looking Good!</Text>
        <Text style={styles.subtitle}>Kỷ niệm hành trình của bạn đã sẵn sàng để chia sẻ.</Text>

        {/* Large preview */}
        <View style={[styles.previewContainer, { height: imageHeight }]}>
          <Image
            source={{ uri: finalImageUri as string }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton]}
            onPress={handleDownload}
            disabled={isProcessing}
          >
            <Feather name="download" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionButtonText}>Tải xuống</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShare}
            disabled={isProcessing}
          >
            <Feather name="share-2" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionButtonText}>Chia sẻ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.favoriteButton,
              isFavorite && styles.activeFavoriteButton,
            ]}
            onPress={handleToggleFavorite}
          >
            <Feather
              name="heart"
              size={16}
              color={isFavorite ? '#fff' : '#e74c3c'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.actionButtonText,
                isFavorite ? styles.activeFavoriteText : { color: '#e74c3c' },
              ]}
            >
              {isFavorite ? 'Đã thích' : 'Yêu thích'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back to Memories / Home */}
        <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/checkin')}>
          <Feather name="image" size={16} color="#2F80ED" style={{ marginRight: 6 }} />
          <Text style={styles.homeButtonText}>Quay về Trang Kỷ niệm</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exploreButton} onPress={() => router.replace('/')}>
          <Feather name="compass" size={16} color="#718096" style={{ marginRight: 6 }} />
          <Text style={styles.exploreButtonText}>Về trang Khám phá</Text>
        </TouchableOpacity>
      </ScrollView>

      {(isProcessing || isSaving) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2F80ED" />
          {isSaving && (
            <Text style={{ marginTop: 12, color: '#2F80ED', fontWeight: 'bold', fontSize: 13 }}>
              Đang lưu kỷ niệm vào tài khoản...
            </Text>
          )}
        </View>
      )}
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
    paddingTop: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A253C',
  },
  headerSpacer: {
    width: 24,
    height: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A253C',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
  },
  previewContainer: {
    width: PREVIEW_WIDTH,
    // height will be set inline from imageHeight state
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  downloadButton: {
    backgroundColor: '#47C785', // Secondary green
  },
  shareButton: {
    backgroundColor: '#A855F7', // Purple
  },
  favoriteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  activeFavoriteButton: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeFavoriteText: {
    color: '#fff',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2F80ED',
    backgroundColor: '#fff',
    marginTop: 10,
  },
  homeButtonText: {
    color: '#2F80ED',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    width: '100%',
    marginTop: 8,
  },
  exploreButtonText: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
