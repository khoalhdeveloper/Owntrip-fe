import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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

const { width } = Dimensions.get('window');
const PREVIEW_SIZE = width - 40;

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
  const rawImageUri = params.finalImageUri;
  const finalImageUri = normalizeFilePath(rawImageUri);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!finalImageUri) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-in Photo Booth</Text>
        <TouchableOpacity>
          <Feather name="settings" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Looking Good!</Text>
        <Text style={styles.subtitle}>Kỷ niệm hành trình của bạn đã sẵn sàng để chia sẻ.</Text>

        {/* Large preview */}
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: finalImageUri as string }}
            style={styles.previewImage}
            resizeMode="contain"
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
            onPress={() => setIsFavorite(!isFavorite)}
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
      </View>

      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2F80ED" />
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
    flex: 1,
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
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
