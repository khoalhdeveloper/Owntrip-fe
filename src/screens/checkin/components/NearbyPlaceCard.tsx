import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NearbyPlace } from '../../../types/checkin.type';
import { getFirstValidImageUri } from '../../../utils/imageUtils';

interface NearbyPlaceCardProps {
  place: NearbyPlace;
  onCheckin: (place: NearbyPlace) => void;
}

export const NearbyPlaceCard: React.FC<NearbyPlaceCardProps> = ({ place, onCheckin }) => {
  const isClose = place.distanceMeters <= 200;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isClose) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isClose, pulseAnim]);

  const defaultImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500';
  const displayImage = getFirstValidImageUri(place.images, defaultImage) || defaultImage;
  const shouldShowImage = !!displayImage && !imageError;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
      <View style={styles.imageShell}>
        {shouldShowImage ? (
          <Image
            source={{ uri: displayImage }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="map-pin" size={24} color="#2F80ED" />
          </View>
        )}
        {isClose && (
          <View style={styles.closeBadge}>
            <Feather name="zap" size={10} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.address} numberOfLines={2}>
          {place.address}
        </Text>
        <View style={styles.footer}>
          <View style={styles.distanceContainer}>
            <Feather name="map-pin" size={13} color={isClose ? '#22A661' : '#64748B'} />
            <Text style={[styles.distanceText, isClose && styles.distanceTextClose]}>
              {place.distanceMeters < 1000
                ? `${Math.round(place.distanceMeters)} m`
                : `${(place.distanceMeters / 1000).toFixed(1)} km`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.checkinBtn, isClose ? styles.checkinBtnClose : styles.checkinBtnFar]}
            onPress={() => onCheckin(place)}
          >
            <Feather name="check-circle" size={14} color="#fff" style={styles.btnIcon} />
            <Text style={styles.checkinBtnText}>Check-in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    flexDirection: 'row',
    minHeight: 116,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    elevation: 3,
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  imageShell: {
    width: 98,
    height: 100,
    margin: 8,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EAF2FF',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FF',
  },
  closeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoContainer: {
    flex: 1,
    paddingVertical: 13,
    paddingRight: 12,
    paddingLeft: 2,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A253C',
    marginBottom: 4,
    lineHeight: 20,
  },
  address: {
    fontSize: 12,
    color: '#7B8798',
    lineHeight: 17,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginLeft: 4,
  },
  distanceTextClose: {
    color: '#22A661',
  },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  checkinBtnClose: {
    backgroundColor: '#2F80ED',
    shadowColor: '#2F80ED',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  checkinBtnFar: {
    backgroundColor: '#94A3B8',
  },
  btnIcon: {
    marginRight: 4,
  },
  checkinBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
