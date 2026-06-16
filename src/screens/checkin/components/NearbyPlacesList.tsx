import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocation } from '../../../hooks/useLocation';
import { useNearbyPlaces } from '../../../hooks/useNearbyPlaces';
import { NearbyPlaceCard } from './NearbyPlaceCard';
import { CheckinVerifyModal } from './CheckinVerifyModal';
import { NearbyPlace } from '../../../types/checkin.type';

export const NearbyPlacesList: React.FC = () => {
  const {
    latitude,
    longitude,
    loading: locationLoading,
    error: locationError,
    refresh: refreshLocation,
  } = useLocation();
  const {
    places,
    loading: placesLoading,
    error: placesError,
    refresh: refreshPlaces,
  } = useNearbyPlaces(latitude, longitude);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshLocation();
    await refreshPlaces();
    setRefreshing(false);
  };

  const handleCheckin = (place: NearbyPlace) => {
    setSelectedPlace(place);
    setModalVisible(true);
  };

  const isLoading = locationLoading || placesLoading;
  const hasError = !!locationError || !!placesError;
  const errorMessage = locationError || placesError || '';
  const closestPlace = places.reduce<NearbyPlace | null>((closest, place) => {
    if (!closest || place.distanceMeters < closest.distanceMeters) {
      return place;
    }
    return closest;
  }, null);
  const closePlacesCount = places.filter((place) => place.distanceMeters <= 200).length;

  if (isLoading && !refreshing && places.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F80ED" />
        <Text style={styles.loadingText}>Đang xác định vị trí & tìm địa điểm gần bạn...</Text>
      </View>
    );
  }

  if (hasError && places.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-triangle" size={48} color="#EB5757" />
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
          <Feather name="refresh-cw" size={14} color="#fff" style={styles.btnIcon} />
          <Text style={styles.retryBtnText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={places}
        keyExtractor={(item) => item.placeId}
        renderItem={({ item }) => <NearbyPlaceCard place={item} onCheckin={handleCheckin} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          places.length > 0 ? (
            <View style={styles.listHeader}>
              <View style={styles.headerIconWrap}>
                <Feather name="navigation" size={18} color="#2F80ED" />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Địa điểm gần bạn</Text>
                <Text style={styles.headerSubtitle}>
                  {places.length} địa điểm khả dụng
                  {closestPlace ? ` • gần nhất ${Math.round(closestPlace.distanceMeters)} m` : ''}
                </Text>
              </View>
              {closePlacesCount > 0 && (
                <View style={styles.readyBadge}>
                  <Text style={styles.readyBadgeText}>{closePlacesCount} sẵn sàng</Text>
                </View>
              )}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2F80ED']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="map" size={48} color="#A0AEC0" />
            <Text style={styles.emptyTitle}>Không có địa điểm nào gần đây</Text>
            <Text style={styles.emptySubtitle}>
              Hãy thử di chuyển đến khu vực có nhiều địa danh hơn.
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
              <Feather name="refresh-cw" size={14} color="#2F80ED" style={styles.btnIcon} />
              <Text style={styles.refreshBtnText}>Làm mới</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <CheckinVerifyModal
        visible={modalVisible}
        place={selectedPlace}
        latitude={latitude}
        longitude={longitude}
        onClose={() => {
          setModalVisible(false);
          setSelectedPlace(null);
        }}
        onSuccess={() => {
          // Keep modal open, verify modal handles showing success state and transition
          // We can optionally refresh places list
          refreshPlaces();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 100,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
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
  readyBadge: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: '#E9F8F0',
  },
  readyBadgeText: {
    fontSize: 11,
    color: '#22A661',
    fontWeight: '800',
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
    marginBottom: 20,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2F80ED',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  refreshBtnText: {
    color: '#2F80ED',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
