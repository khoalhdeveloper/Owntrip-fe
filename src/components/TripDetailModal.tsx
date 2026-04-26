import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { TripDetailResponse, tripService } from '../services/tripService';
import { getImageSource } from '../utils/imageUtils';

interface TripDetailModalProps {
  visible: boolean;
  loading: boolean;
  selectedTripDetail: TripDetailResponse | null;
  onClose: () => void;
  onRefresh?: () => void;
}

const { width } = Dimensions.get('window');

export default function TripDetailModal({ visible, loading, selectedTripDetail, onClose, onRefresh }: TripDetailModalProps) {
  const [publishing, setPublishing] = React.useState(false);

  const handlePublish = async () => {
    if (!selectedTripDetail?.trip._id) return;
    setPublishing(true);
    const success = await tripService.publishTrip(selectedTripDetail.trip._id);
    if (success) {
        // Optionally show success toast/alert here
        if (onRefresh) onRefresh();
        onClose();
    }
    setPublishing(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalCloseArea} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#4A7CFF" />
              <Text style={{ marginTop: 16, color: '#718096', fontWeight: '500' }}>Loading plan...</Text>
            </View>
          ) : selectedTripDetail && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={[styles.modalGallery, { height: 260 }]}>
                <ExpoImage source={getImageSource(selectedTripDetail.trip.provinceImage || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800')} style={[styles.modalImage, { width, height: 260 }]} contentFit="cover" />
                <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                  <Feather name="x" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={[styles.modalInfoContent, { paddingTop: 28 }]}>
                <View style={styles.tripDetailHeader}>
                  <Text style={styles.tripDetailTitle}>{selectedTripDetail.trip.title}</Text>
                  <View style={styles.tripDetailMeta}>
                    <View style={styles.metaBadge}>
                      <Feather name="map-pin" size={12} color="#4A7CFF" />
                      <Text style={styles.metaBadgeText}>{selectedTripDetail.trip.destination}</Text>
                    </View>
                    <View style={[styles.metaBadge, { backgroundColor: '#FFF5F5' }]}>
                      <Feather name="clock" size={12} color="#FF4D4D" />
                      <Text style={[styles.metaBadgeText, { color: '#FF4D4D' }]}>{selectedTripDetail.trip.totalDays} Ngày</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.modalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionIconBox}>
                      <Feather name="align-left" size={16} color="#4A7CFF" />
                    </View>
                    <Text style={styles.modalSectionTitle}>Giới thiệu</Text>
                  </View>
                  <Text style={styles.modalSectionText}>
                    {selectedTripDetail.trip.description || 'Khám phá hành trình tuyệt vời này với những trải nghiệm thú vị và điểm đến độc đáo.'}
                  </Text>
                </View>

                {!selectedTripDetail.trip.isPublished && (
                  <TouchableOpacity 
                    style={[styles.publishButton, publishing && styles.publishButtonDisabled]} 
                    onPress={handlePublish}
                    disabled={publishing}
                  >
                    {publishing ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Feather name="globe" size={18} color="#FFF" />
                        <Text style={styles.publishButtonText}>Publish Plan</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <View style={styles.modalDivider} />

                <View style={styles.modalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionIconBox}>
                      <Feather name="calendar" size={16} color="#4A7CFF" />
                    </View>
                    <Text style={styles.modalSectionTitle}>Lịch trình chi tiết</Text>
                  </View>
                  
                  {selectedTripDetail.days.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Feather name="info" size={24} color="#A0AEC0" />
                      <Text style={styles.emptyStateText}>Chưa có lịch trình cụ thể.</Text>
                    </View>
                  ) : (
                    <View style={styles.timelineContainer}>
                      {selectedTripDetail.days.map((dayPlan, index) => (
                        <View key={index} style={styles.timelineItem}>
                          <View style={styles.timelineLeft}>
                            <View style={styles.timelineDot} />
                            {index < selectedTripDetail.days.length - 1 && <View style={styles.timelineLine} />}
                          </View>
                          <View style={styles.timelineRight}>
                            <View style={styles.dayCard}>
                              <View style={styles.dayCardHeader}>
                                <Text style={styles.dayNumberText}>NGÀY {dayPlan.day}</Text>
                                <Text style={styles.dayStatusText}>
                                  {dayPlan.places && dayPlan.places.length > 0 ? `${dayPlan.places.length} địa điểm` : 'Ngày tự do'}
                                </Text>
                              </View>
                              {dayPlan.places && dayPlan.places.length > 0 && (
                                <View style={styles.dayPlacesList}>
                                  {dayPlan.places.map((p, pIdx) => (
                                    <View key={pIdx} style={pIdx === 0 ? styles.firstPlaceItem : styles.placeItem}>
                                      <View style={styles.placeDot} />
                                      <Text style={styles.placeNameText}>{p.name || 'Địa điểm tham quan'}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '92%',
    overflow: 'hidden',
  },
  modalInfoContent: {
    padding: 24,
  },
  modalGallery: {
    backgroundColor: '#EDF2F7',
    position: 'relative',
  },
  modalImage: {
    resizeMode: 'cover',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  tripDetailHeader: {
    marginBottom: 24,
  },
  tripDetailTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A2B4A',
    marginBottom: 12,
    lineHeight: 34,
  },
  tripDetailMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A7CFF',
  },
  modalSection: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
  },
  modalSectionText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 24,
    fontWeight: '400',
  },
  publishButton: {
    backgroundColor: '#48BB78',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16,
    gap: 8,
    shadowColor: '#48BB78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishButtonDisabled: {
    backgroundColor: '#A0AEC0',
    shadowOpacity: 0,
    elevation: 0,
  },
  publishButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 24,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    gap: 12,
  },
  emptyStateText: {
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: '500',
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A7CFF',
    borderWidth: 3,
    borderColor: '#EBF4FF',
    marginTop: 6,
    zIndex: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#EBF2FF',
    marginTop: -2,
    marginBottom: -6,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 24,
  },
  dayCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F5FF',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4A7CFF',
    letterSpacing: 1,
  },
  dayStatusText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  dayPlacesList: {
    gap: 10,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
  },
  firstPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E0',
  },
  placeNameText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
});
