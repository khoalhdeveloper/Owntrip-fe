import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { checkinService } from '../../services/checkinService';
import { CheckedInPlace } from '../../types/checkin.type';
import { getFirstValidImageUri } from '../../utils/imageUtils';

export const CheckedInPlacesSection: React.FC = () => {
  const [places, setPlaces] = useState<CheckedInPlace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCheckedInPlaces = async () => {
      try {
        const data = await checkinService.getMyCheckedInPlaces();
        setPlaces(data);
      } catch (err) {
        console.error('Error fetching checked-in places:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCheckedInPlaces();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2F80ED" />
      </View>
    );
  }

  if (places.length === 0) {
    return null; // Hide section if user has not checked in anywhere
  }

  const defaultImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="map-pin" size={16} color="#005CB8" style={styles.headerIcon} />
        <Text style={styles.title}>Địa điểm đã check-in ({places.length})</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {places.map((item, index) => {
          const displayImage =
            getFirstValidImageUri(item.place?.images, defaultImage) || defaultImage;
          const checkedDate = item.checkedInAt
            ? new Date(item.checkedInAt).toLocaleDateString('vi-VN')
            : 'Mới đây';

          return (
            <View key={index} style={styles.card}>
              <Image source={{ uri: displayImage }} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.cardInfo}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {item.place?.name || 'Địa điểm'}
                </Text>
                <Text style={styles.checkedDate}>{checkedDate}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  loadingContainer: {
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerIcon: {
    marginRight: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A253C',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 130,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 85,
  },
  cardInfo: {
    padding: 8,
  },
  placeName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1A253C',
    marginBottom: 2,
  },
  checkedDate: {
    fontSize: 10,
    color: '#718096',
  },
});
