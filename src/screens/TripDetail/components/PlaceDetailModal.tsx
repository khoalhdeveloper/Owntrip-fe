import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, ScrollView, Dimensions, Linking } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

const BRAND = '#4A7CFF';
const GRAY_LIGHT = '#F3F4F6';
const TEXT_MAIN = '#1A1A1A';
const TEXT_SUB = '#9CA3AF';

const { width, height } = Dimensions.get('window');

interface PlaceDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  place: any;
  onAdd: (place: any, timeOfDay?: string) => void;
  showAddButton?: boolean;
}

const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({ 
  isVisible, onClose, place, onAdd, showAddButton = true 
}) => {
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  if (!place) return null;

  const handleOpenMap = () => {
    if (place.mapUrl) {
      Linking.openURL(place.mapUrl);
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
      Linking.openURL(url);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header Image */}
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: place.photo || 'https://via.placeholder.com/400x200' }} 
              style={styles.headerImage}
            />
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailsScroll}>
            <View style={styles.mainInfo}>
              <Text style={styles.placeName}>{place.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text style={styles.ratingText}>{place.rating || 'N/A'}</Text>
                {place.totalReviews && (
                  <Text style={styles.reviewCount}>({place.totalReviews} reviews)</Text>
                )}
              </View>
              <Text style={styles.addressText}>{place.address}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleOpenMap}>
                <View style={styles.actionIconCircle}>
                  <Feather name="map-pin" size={20} color={BRAND} />
                </View>
                <Text style={styles.actionLabel}>Chỉ đường</Text>
              </TouchableOpacity>
              
              {place.phoneNumber && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${place.phoneNumber}`)}>
                  <View style={styles.actionIconCircle}>
                    <Feather name="phone" size={20} color={BRAND} />
                  </View>
                  <Text style={styles.actionLabel}>Gọi điện</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
                <View style={styles.actionIconCircle}>
                  <Feather name="share-2" size={20} color={BRAND} />
                </View>
                <Text style={styles.actionLabel}>Chia sẻ</Text>
              </TouchableOpacity>
            </View>

            {/* Photos Section */}
            {place.photos && place.photos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hình ảnh</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                  {place.photos.map((img: string, idx: number) => (
                    <Image key={idx} source={{ uri: img }} style={styles.detailPhoto} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Placeholder for description or other info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Về địa điểm này</Text>
              <Text style={styles.description}>
                Địa điểm này nằm ở khu vực trung tâm, thuận tiện cho việc di chuyển và tham quan. 
                Được đánh giá cao bởi khách du lịch vì chất lượng dịch vụ và không gian đặc trưng.
              </Text>
            </View>
            
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom Add Button */}
          {showAddButton && (
            <View style={styles.footer}>
              <View style={styles.timeSelector}>
                <TouchableOpacity 
                  style={[styles.timeOption, selectedTime === 'morning' && styles.timeOptionActive]}
                  onPress={() => setSelectedTime('morning')}
                >
                  <Text style={[styles.timeOptionText, selectedTime === 'morning' && styles.timeOptionTextActive]}>Sáng</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.timeOption, selectedTime === 'afternoon' && styles.timeOptionActive]}
                  onPress={() => setSelectedTime('afternoon')}
                >
                  <Text style={[styles.timeOptionText, selectedTime === 'afternoon' && styles.timeOptionTextActive]}>Chiều</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.timeOption, selectedTime === 'evening' && styles.timeOptionActive]}
                  onPress={() => setSelectedTime('evening')}
                >
                  <Text style={[styles.timeOptionText, selectedTime === 'evening' && styles.timeOptionTextActive]}>Tối</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  onAdd(place, selectedTime);
                  onClose();
                }}
              >
                <Text style={styles.addButtonText}>Thêm vào lịch trình</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    height: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 220,
    width: '100%',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  detailsScroll: {
    flex: 1,
    padding: 20,
  },
  mainInfo: {
    marginBottom: 24,
  },
  placeName: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_MAIN,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
    color: '#FFB800',
  },
  reviewCount: {
    fontSize: 14,
    color: TEXT_SUB,
    marginLeft: 8,
  },
  addressText: {
    fontSize: 15,
    color: TEXT_SUB,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: GRAY_LIGHT,
    marginBottom: 24,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    color: BRAND,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_MAIN,
    marginBottom: 12,
  },
  photoList: {
    flexDirection: 'row',
  },
  detailPhoto: {
    width: 150,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
  },
  description: {
    fontSize: 15,
    color: TEXT_SUB,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'white',
    paddingBottom: 34, // Safe area
    borderTopWidth: 1,
    borderColor: GRAY_LIGHT,
  },
  addButton: {
    backgroundColor: BRAND,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  timeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  timeOptionActive: {
    borderColor: BRAND,
    backgroundColor: '#F0F4FF',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeOptionTextActive: {
    color: BRAND,
    fontWeight: '600',
  },
});

export default PlaceDetailModal;
