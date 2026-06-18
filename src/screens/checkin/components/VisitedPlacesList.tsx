import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { checkinService } from '../../../services/checkinService';
import { CheckedInPlace } from '../../../types/checkin.type';
import { getFirstValidImageUri } from '../../../utils/imageUtils';
import PlaceDetailModal from '../../TripDetail/components/PlaceDetailModal';

export const VisitedPlacesList: React.FC = () => {
  const [visitedPlaces, setVisitedPlaces] = useState<CheckedInPlace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<any | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const fetchVisited = async () => {
    try {
      setError(null);
      const data = await checkinService.getMyCheckedInPlaces();
      // Sắp xếp địa điểm check-in mới nhất lên đầu
      const sortedData = (data || []).sort((a, b) => {
        const dateA = new Date(a.checkedInAt || a.checkin?.checkedInAt || 0).getTime();
        const dateB = new Date(b.checkedInAt || b.checkin?.checkedInAt || 0).getTime();
        return dateB - dateA;
      });
      setVisitedPlaces(sortedData);
    } catch (err) {
      console.error('Error in VisitedPlacesList:', err);
      setError('Không thể tải lịch sử địa điểm đã đi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisited();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVisited();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F80ED" />
        <Text style={styles.loadingText}>Đang tải lịch sử địa điểm đã đi...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-triangle" size={48} color="#EB5757" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchVisited}>
          <Feather name="refresh-cw" size={14} color="#fff" style={styles.btnIcon} />
          <Text style={styles.retryBtnText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const defaultImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500';

  const renderVisitedCard = ({ item }: { item: CheckedInPlace }) => {
    const place = item.place || {};
    const checkin = item.checkin || {};
    const dateStr = formatDate(item.checkedInAt || checkin.checkedInAt);
    
    // Lấy ảnh hiển thị
    const displayImage = getFirstValidImageUri(place.images, defaultImage) || defaultImage;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedPlaceForModal(place);
          setIsModalVisible(true);
        }}
      >
        <Image source={{ uri: displayImage }} style={styles.placeImage} resizeMode="cover" />
        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.placeName} numberOfLines={1}>
              {place.name || 'Địa điểm du lịch'}
            </Text>
            <View style={styles.visitedBadge}>
              <Feather name="check" size={10} color="#fff" style={{ marginRight: 2 }} />
              <Text style={styles.visitedBadgeText}>Đã đi</Text>
            </View>
          </View>
          
          <Text style={styles.placeAddress} numberOfLines={2}>
            {place.address || 'Địa chỉ đang cập nhật...'}
          </Text>

          <View style={styles.footerRow}>
            <View style={styles.infoItem}>
              <Feather name="calendar" size={12} color="#718096" style={styles.infoIcon} />
              <Text style={styles.infoText}>{dateStr}</Text>
            </View>
            
            {item.distanceMeters !== undefined && (
              <View style={styles.infoItem}>
                <Feather name="navigation" size={12} color="#2F80ED" style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  {item.distanceMeters < 1000
                    ? `${Math.round(item.distanceMeters)} m`
                    : `${(item.distanceMeters / 1000).toFixed(1)} km`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={visitedPlaces}
        keyExtractor={(item, index) => item.checkin?._id || index.toString()}
        renderItem={renderVisitedCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2F80ED']} />
        }
        ListHeaderComponent={
          visitedPlaces.length > 0 ? (
            <View style={styles.listHeader}>
              <View style={styles.headerIconWrap}>
                <FontAwesome5 name="map-marked-alt" size={16} color="#2F80ED" />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Hành trình đã qua</Text>
                <Text style={styles.headerSubtitle}>
                  Bạn đã ghé thăm {visitedPlaces.length} địa điểm
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="map" size={48} color="#A0AEC0" />
            <Text style={styles.emptyTitle}>Chưa có địa điểm đã đi nào</Text>
            <Text style={styles.emptySubtitle}>
              Hãy bắt đầu check-in tại các địa điểm thú vị để lưu lại hành trình nhé!
            </Text>
          </View>
        }
      />

      {selectedPlaceForModal && (
        <PlaceDetailModal
          isVisible={isModalVisible}
          onClose={() => {
            setIsModalVisible(false);
            setSelectedPlaceForModal(null);
          }}
          place={{
            ...selectedPlaceForModal,
            photos: selectedPlaceForModal.images || [],
            photo: selectedPlaceForModal.images?.[0] || '',
            latitude: selectedPlaceForModal.location?.lat || selectedPlaceForModal.latitude || 15.8770742,
            longitude: selectedPlaceForModal.location?.lng || selectedPlaceForModal.longitude || 108.3258838,
          }}
          onAdd={() => {}}
          showAddButton={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    shadowColor: '#1E293B',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#7B8798',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
  },
  placeImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#EDF2F7',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  placeName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A253C',
    flex: 1,
    marginRight: 8,
  },
  visitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27AE60',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  visitedBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  placeAddress: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 6,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  infoIcon: {
    marginRight: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2F80ED',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  btnIcon: {
    marginRight: 6,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A5568',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
