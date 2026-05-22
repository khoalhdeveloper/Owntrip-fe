import React from 'react';
import {
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFetchFrames } from '../../hooks/useFrames';
import { CheckinFrame } from '../../types/checkin.type';

interface FrameGalleryProps {
  selectedFrameId: string | null;
  onSelectFrame: (frame: CheckinFrame | null) => void;
}

export const FrameGallery: React.FC<FrameGalleryProps> = ({
  selectedFrameId,
  onSelectFrame,
}) => {
  const { frames, loading } = useFetchFrames();

  const renderItem = ({ item }: { item: CheckinFrame }) => {
    const isSelected = item.id === (selectedFrameId || 'no-frame');

    return (
      <TouchableOpacity
        style={[styles.itemContainer, isSelected && styles.selectedItem]}
        onPress={() => onSelectFrame(item.type === 'none' ? null : item)}
        activeOpacity={0.7}
      >
        {/* Hiển thị ảnh: null → icon X, có URL → Image uri */}
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.framePreview}
          />
        ) : (
          <View style={[styles.framePreview, styles.noFramePreview]}>
            <Feather name="x" size={24} color="#999" />
          </View>
        )}
        <Text style={styles.frameName} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chọn khung hình</Text>

      {loading ? (
        // Hiển thị spinner khi đang fetch
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={frames}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 20,
    color: '#333',
  },
  loadingContainer: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 15,
  },
  itemContainer: {
    width: 80,
    marginHorizontal: 5,
    padding: 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  selectedItem: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  framePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#fff',
    resizeMode: 'contain',
  },
  frameName: {
    fontSize: 10,
    marginTop: 5,
    color: '#666',
    textAlign: 'center',
  },
  noFramePreview: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
});
