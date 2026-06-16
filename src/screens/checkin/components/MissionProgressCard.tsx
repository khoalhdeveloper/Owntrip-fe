import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { MissionProgress } from '../../../types/mission.type';
import { getImageSource, isRenderableImageUri } from '../../../utils/imageUtils';
import { placesService } from '../../../services/placesService';

const { width } = Dimensions.get('window');

const MOCK_REVIEWS = [
  {
    id: '1',
    userName: 'Nguyễn Văn An',
    rating: 5,
    content: 'Địa điểm tuyệt vời, không khí rất trong lành và mát mẻ. Rất xứng đáng để ghé thăm!',
    date: '2 ngày trước',
    userAvatar: 'https://i.pravatar.cc/150?u=1',
  },
  {
    id: '2',
    userName: 'Lê Thị Bình',
    rating: 4,
    content: 'Cảnh quan đẹp tuyệt vời, tuy nhiên đường đi hơi đông đúc vào cuối tuần.',
    date: '1 tuần trước',
    userAvatar: 'https://i.pravatar.cc/150?u=2',
  },
  {
    id: '3',
    userName: 'Phạm Minh Đức',
    rating: 5,
    content:
      'Hành trình chinh phục đỉnh núi rất thú vị. Tượng Phật Bà Tây Bổ Đà Sơn thật sự hùng vĩ.',
    date: '2 tuần trước',
    userAvatar: 'https://i.pravatar.cc/150?u=3',
  },
];

interface MissionProgressCardProps {
  item: MissionProgress;
  onClaimReward: (id: string) => Promise<void>;
}

const PLACE_ID_NAMES: Record<string, string> = {
  ChIJ5QyCObsZQjERdDRJT7jycjA: 'Chùa Cầu (Hội An)',
  ChIJhX4YnlUPQjERx5eDC83Jr14: 'Hội Quán Quảng Đông',
  ChIJW2ZQBOENQjERyhur280Tsfk: 'Hội Quán Phúc Kiến',
};

const PLACE_ID_DETAILS: Record<string, any> = {
  ChIJ5QyCObsZQjERdDRJT7jycjA: {
    placeId: 'ChIJ5QyCObsZQjERdDRJT7jycjA',
    name: 'Chùa Cầu (Hội An)',
    address: '186 Nguyễn Thị Minh Khai, Phường Minh An, Hội An, Quảng Nam, Vietnam',
    latitude: 15.8770742,
    longitude: 108.3258838,
    rating: 4.5,
    totalReviews: 2450,
    photo: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    photos: [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      'https://images.unsplash.com/photo-1528127269322-539801943592?w=800',
    ],
    types: ['tourist_attraction', 'place_of_worship'],
  },
  ChIJhX4YnlUPQjERx5eDC83Jr14: {
    placeId: 'ChIJhX4YnlUPQjERx5eDC83Jr14',
    name: 'Hội Quán Quảng Đông',
    address: '176 Trần Phú, Phường Minh An, Hội An, Quảng Nam, Vietnam',
    latitude: 15.8772096,
    longitude: 108.3263158,
    rating: 4.4,
    totalReviews: 890,
    photo:
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=800',
    photos: [
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    ],
    types: ['tourist_attraction', 'place_of_worship'],
  },
  ChIJW2ZQBOENQjERyhur280Tsfk: {
    placeId: 'ChIJW2ZQBOENQjERyhur280Tsfk',
    name: 'Hội Quán Phúc Kiến',
    address: '46 Trần Phú, Cẩm Châu, Hội An, Quảng Nam, Vietnam',
    latitude: 15.877229,
    longitude: 108.330366,
    rating: 4.6,
    totalReviews: 1980,
    photo: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800',
    photos: [
      'https://images.unsplash.com/photo-1528127269322-539801943592?w=800',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    ],
    types: ['tourist_attraction', 'place_of_worship'],
  },
};

export const MissionProgressCard: React.FC<MissionProgressCardProps> = ({
  item,
  onClaimReward,
}) => {
  const {
    mission,
    checkedCount,
    requiredCount,
    isCompleted,
    rewardGranted,
    checkedPlaceIds = [],
  } = item;
  const { requiredPlaceIds = [] } = mission;
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<any | null>(null);
  const [isPlaceModalVisible, setIsPlaceModalVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [failedPlacePhotoUris, setFailedPlacePhotoUris] = useState<string[]>([]);
  const [loadedPlaces, setLoadedPlaces] = useState<Record<string, any>>({});

  const percent =
    requiredCount > 0 ? Math.min(100, Math.round((checkedCount / requiredCount) * 100)) : 0;
  const statusLabel = !isCompleted ? 'Đang làm' : rewardGranted ? 'Đã nhận' : 'Có thưởng';
  const statusIcon = !isCompleted ? 'map-pin' : rewardGranted ? 'check-circle' : 'gift';
  const modalPhotoUris = selectedPlaceForModal
    ? Array.from(
        new Set(
          [
            ...(Array.isArray(selectedPlaceForModal.photos) ? selectedPlaceForModal.photos : []),
            selectedPlaceForModal.photo,
          ]
            .filter(isRenderableImageUri)
            .map((uri) => uri.trim()),
        ),
      ).filter((uri) => !failedPlacePhotoUris.includes(uri))
    : [];

  // Dynamic loading of place names/details by placeId from backend
  useEffect(() => {
    const fetchPlaceDetails = async () => {
      const newLoadedPlaces = { ...loadedPlaces };
      let changed = false;

      for (const placeId of requiredPlaceIds) {
        if (!newLoadedPlaces[placeId]) {
          try {
            // 1. Check local dictionaries first
            if (PLACE_ID_DETAILS[placeId]) {
              newLoadedPlaces[placeId] = PLACE_ID_DETAILS[placeId];
              changed = true;
              continue;
            }

            // 2. Fetch from backend

            // We try search (autocomplete search) first
            let results = await placesService.search(placeId);

            // If not found, try text search
            if (!results || results.length === 0) {
              results = await placesService.searchText({ q: placeId });
            }

            if (results && results.length > 0) {
              const matchedPlace = (results.find((p) => p.placeId === placeId) ||
                results[0]) as any;
              const placeIdVal = matchedPlace.placeId || matchedPlace.id;
              const nameVal = matchedPlace.name || matchedPlace.displayName?.text;
              const addressVal = matchedPlace.address || matchedPlace.formattedAddress;
              const latVal =
                matchedPlace.latitude ||
                matchedPlace.location?.latitude ||
                matchedPlace.location?.lat ||
                15.8770742;
              const lngVal =
                matchedPlace.longitude ||
                matchedPlace.location?.longitude ||
                matchedPlace.location?.lng ||
                108.3258838;
              const ratingVal = matchedPlace.rating || 4.5;
              const reviewsVal =
                matchedPlace.totalReviews ||
                matchedPlace.reviewCount ||
                matchedPlace.userRatingCount ||
                100;
              const photoVal =
                matchedPlace.photo ||
                (matchedPlace.photos && matchedPlace.photos[0]?.name) ||
                (matchedPlace.images && matchedPlace.images[0]) ||
                'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800';
              const photosVal = (matchedPlace.photos &&
                matchedPlace.photos.map((p: any) => p?.name || p)) ||
                matchedPlace.images || [photoVal];
              const typesVal = matchedPlace.types || [
                matchedPlace.category || 'tourist_attraction',
              ];

              newLoadedPlaces[placeId] = {
                placeId: placeIdVal,
                name: nameVal,
                address: addressVal,
                latitude: latVal,
                longitude: lngVal,
                rating: ratingVal,
                totalReviews: reviewsVal,
                photo: photoVal,
                photos: photosVal,
                types: typesVal,
              };
              changed = true;
            } else {
              // Fallback placeholder if not found
              const fallbackName = PLACE_ID_NAMES[placeId] || `Địa điểm ${placeId.substring(0, 6)}`;
              newLoadedPlaces[placeId] = {
                placeId,
                name: fallbackName,
                address: 'Địa chỉ đang được cập nhật...',
                latitude: 15.8770742,
                longitude: 108.3258838,
                rating: 4.5,
                totalReviews: 120,
                photo: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
                photos: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'],
                types: ['tourist_attraction'],
              };
              changed = true;
            }
          } catch (error) {
            console.error(`Error fetching details for place ${placeId}:`, error);
          }
        }
      }

      if (changed) {
        setLoadedPlaces(newLoadedPlaces);
      }
    };

    if (requiredPlaceIds.length > 0) {
      fetchPlaceDetails();
    }
  }, [requiredPlaceIds]);

  const handleClaim = async () => {
    try {
      setLoading(true);
      await onClaimReward(mission._id);
    } catch (err) {
      console.error('Error claiming reward:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlacePress = (placeId: string) => {
    let details = loadedPlaces[placeId] || PLACE_ID_DETAILS[placeId];
    if (!details) {
      const name = PLACE_ID_NAMES[placeId] || `Địa điểm ${placeId.substring(0, 6)}`;
      details = {
        placeId,
        name: name,
        address: 'Địa chỉ đang được cập nhật...',
        latitude: 15.8770742,
        longitude: 108.3258838,
        rating: 4.5,
        totalReviews: 120,
        photo: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
        photos: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'],
        types: ['tourist_attraction'],
      };
    }
    setCurrentPhotoIndex(0);
    setFailedPlacePhotoUris([]);
    setSelectedPlaceForModal(details);
    setIsPlaceModalVisible(true);
  };

  return (
    <View style={[styles.card, isCompleted && styles.completedCard]}>
      {/* Clickable Header Area */}
      <TouchableOpacity
        style={styles.headerPressable}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderRow}>
          {/* Left Area: Title & Progress Bar */}
          <View style={styles.leftInfoArea}>
            <View
              style={[
                styles.statusBadge,
                !isCompleted
                  ? styles.statusInProgress
                  : rewardGranted
                  ? styles.statusDone
                  : styles.statusRewardReady,
              ]}
            >
              <Feather
                name={statusIcon}
                size={11}
                color={!isCompleted ? '#2F80ED' : rewardGranted ? '#22A661' : '#D97706'}
                style={styles.statusIcon}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  !isCompleted
                    ? styles.statusInProgressText
                    : rewardGranted
                    ? styles.statusDoneText
                    : styles.statusRewardReadyText,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {mission.title || mission.name}
            </Text>

            {/* Progress Section */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.progressRatio}>
                {checkedCount}/{requiredCount} ({percent}%)
              </Text>
            </View>
          </View>

          {/* Right Area: Reward Icon & Expand Icon */}
          <View style={styles.rightRewardArea}>
            {mission.reward && (
              <View
                style={[
                  styles.miniRewardIcon,
                  mission.reward.type === 'points'
                    ? styles.miniRewardPoints
                    : styles.miniRewardFrame,
                ]}
              >
                {mission.reward.type === 'points' ? (
                  <FontAwesome5 name="coins" size={11} color="#D97706" />
                ) : (
                  <Feather name="image" size={11} color="#7C3AED" />
                )}
              </View>
            )}
            <Feather
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#718096"
              style={styles.expandChevron}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Content Area */}
      {expanded && (
        <View style={styles.expandedContent}>
          {mission.description && <Text style={styles.desc}>{mission.description}</Text>}

          {mission.imageUrl && (
            <Image
              source={{ uri: mission.imageUrl }}
              style={styles.missionImage}
              resizeMode="cover"
            />
          )}

          {/* Destinations List */}
          {requiredPlaceIds.length > 0 && (
            <View style={styles.destinationsBox}>
              <Text style={styles.destinationsTitle}>
                Các điểm cần khám phá (Nhấn để xem chi tiết):
              </Text>
              {requiredPlaceIds.map((placeId, index) => {
                const placeName =
                  loadedPlaces[placeId]?.name ||
                  PLACE_ID_NAMES[placeId] ||
                  `Địa điểm thứ ${index + 1}`;
                const isChecked = checkedPlaceIds.includes(placeId);
                return (
                  <TouchableOpacity
                    key={placeId}
                    style={styles.destinationRow}
                    onPress={() => handlePlacePress(placeId)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={isChecked ? 'check-circle' : 'circle'}
                      size={14}
                      color={isChecked ? '#27AE60' : '#A0AEC0'}
                      style={styles.destIcon}
                    />
                    <Text style={[styles.destName, isChecked && styles.destNameChecked]}>
                      {placeName}
                    </Text>
                    <Feather name="info" size={12} color="#94A3B8" style={styles.infoIcon} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Rewards section */}
          {mission.reward && (
            <View
              style={[
                styles.rewardBox,
                mission.reward.type === 'points' ? styles.rewardPointsBox : styles.rewardFrameBox,
              ]}
            >
              <View style={styles.rewardHeader}>
                <View style={styles.rewardHeaderLeft}>
                  {mission.reward.type === 'points' ? (
                    <FontAwesome5
                      name="coins"
                      size={13}
                      color="#D97706"
                      style={styles.rewardIcon}
                    />
                  ) : (
                    <Feather name="image" size={14} color="#7C3AED" style={styles.rewardIcon} />
                  )}
                  <Text
                    style={[
                      styles.rewardTitle,
                      mission.reward.type === 'points'
                        ? styles.rewardPointsText
                        : styles.rewardFrameText,
                    ]}
                  >
                    {mission.reward.title ||
                      (mission.reward.type === 'points'
                        ? `${mission.reward.pointsAmount} Điểm`
                        : 'Khung ảnh giới hạn')}
                  </Text>
                </View>

                <View
                  style={[
                    styles.rewardStatusBadge,
                    !isCompleted
                      ? styles.statusLocked
                      : !rewardGranted
                      ? styles.statusReady
                      : styles.statusClaimed,
                  ]}
                >
                  <Text
                    style={[
                      styles.rewardStatusText,
                      !isCompleted
                        ? styles.statusLockedText
                        : !rewardGranted
                        ? styles.statusReadyText
                        : styles.statusClaimedText,
                    ]}
                  >
                    {!isCompleted ? 'Chưa mở khóa' : !rewardGranted ? 'Nhấn nhận!' : 'Đã nhận'}
                  </Text>
                </View>
              </View>
              {mission.reward.description && (
                <Text style={styles.rewardDesc} numberOfLines={2}>
                  {mission.reward.description}
                </Text>
              )}
            </View>
          )}

          {isCompleted && !rewardGranted && (
            <TouchableOpacity style={styles.claimBtn} onPress={handleClaim} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="gift" size={14} color="#fff" style={styles.claimIcon} />
                  <Text style={styles.claimBtnText}>Nhận phần thưởng</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Place Detail Modal (identical design to home screen) */}
      <Modal
        visible={isPlaceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsPlaceModalVisible(false);
          setSelectedPlaceForModal(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPress={() => {
              setIsPlaceModalVisible(false);
              setSelectedPlaceForModal(null);
            }}
          />
          <View style={styles.modalContent}>
            {selectedPlaceForModal && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {/* Image Gallery */}
                <View style={styles.modalGallery}>
                  {modalPhotoUris.length > 0 ? (
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      scrollEventThrottle={16}
                      onScroll={(e) => {
                        const contentOffsetX = e.nativeEvent.contentOffset.x;
                        const currentIndex = Math.max(
                          0,
                          Math.floor((contentOffsetX + width / 2) / width),
                        );
                        if (currentPhotoIndex !== currentIndex) {
                          setCurrentPhotoIndex(currentIndex);
                        }
                      }}
                    >
                      {modalPhotoUris.map((photoUrl: string, idx: number) => (
                        <ExpoImage
                          key={photoUrl}
                          source={getImageSource(photoUrl)}
                          style={[styles.modalImage, { width }]}
                          contentFit="cover"
                          onError={() => {
                            setFailedPlacePhotoUris((prev) =>
                              prev.includes(photoUrl) ? prev : [...prev, photoUrl],
                            );
                            if (currentPhotoIndex === idx) {
                              setCurrentPhotoIndex(0);
                            }
                          }}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={[styles.modalImage, styles.modalImagePlaceholder, { width }]}>
                      <Feather name="image" size={48} color="#CBD5E0" />
                    </View>
                  )}
                  {/* Close button overlay */}
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setIsPlaceModalVisible(false);
                      setSelectedPlaceForModal(null);
                    }}
                  >
                    <Feather name="x" size={24} color="#FFF" />
                  </TouchableOpacity>
                  {modalPhotoUris.length > 1 && (
                    <View style={styles.galleryBadge}>
                      <Text style={styles.galleryBadgeText}>
                        {`${Math.min(currentPhotoIndex + 1, modalPhotoUris.length)}/${
                          modalPhotoUris.length
                        }`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Details */}
                <View style={styles.modalInfoContent}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>{selectedPlaceForModal.name}</Text>
                    <TouchableOpacity style={styles.favButton}>
                      <Feather name="heart" size={20} color="#FF4D4D" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalLocationRow}>
                    <View style={styles.iconCircle}>
                      <Feather name="map-pin" size={14} color="#4A7CFF" />
                    </View>
                    <Text style={styles.modalAddress}>{selectedPlaceForModal.address}</Text>
                  </View>

                  <View style={styles.modalStatsRow}>
                    {selectedPlaceForModal.rating != null && (
                      <View style={styles.statItem}>
                        <Feather name="star" size={16} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.statValue}>{selectedPlaceForModal.rating}</Text>
                        {selectedPlaceForModal.totalReviews != null && (
                          <Text style={styles.statLabel}>
                            ({selectedPlaceForModal.totalReviews.toLocaleString()})
                          </Text>
                        )}
                      </View>
                    )}
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Feather name="camera" size={16} color="#4A7CFF" />
                      <Text style={styles.statValue}>{modalPhotoUris.length}</Text>
                      <Text style={styles.statLabel}>Ảnh</Text>
                    </View>
                  </View>

                  {selectedPlaceForModal.types && selectedPlaceForModal.types.length > 0 && (
                    <View style={styles.modalTypesContainer}>
                      {selectedPlaceForModal.types.slice(0, 4).map((type: string, idx: number) => (
                        <View key={idx} style={styles.modalTypeBadge}>
                          <Text style={styles.modalTypeText}>{type.replace(/_/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.modalDivider} />

                  {/* Actions */}
                  <TouchableOpacity
                    style={styles.modalPrimaryButton}
                    activeOpacity={0.8}
                    onPress={() => {
                      const mapUrl =
                        selectedPlaceForModal.mapUrl ||
                        `https://www.google.com/maps/search/?api=1&query=${selectedPlaceForModal.latitude},${selectedPlaceForModal.longitude}&query_place_id=${selectedPlaceForModal.placeId}`;
                      Linking.openURL(mapUrl);
                    }}
                  >
                    <Feather name="navigation" size={20} color="#FFF" />
                    <Text style={styles.modalPrimaryButtonText}>Chỉ đường đến đây</Text>
                  </TouchableOpacity>

                  <View style={styles.modalDivider} />

                  {/* Reviews Section */}
                  <View style={styles.reviewsSection}>
                    <View style={styles.reviewsHeader}>
                      <Text style={styles.reviewsTitle}>Đánh giá từ cộng đồng</Text>
                      <TouchableOpacity>
                        <Text style={styles.writeReviewText}>Viết đánh giá</Text>
                      </TouchableOpacity>
                    </View>

                    {MOCK_REVIEWS.map((review) => (
                      <View key={review.id} style={styles.reviewItem}>
                        <View style={styles.reviewUserRow}>
                          <ExpoImage
                            source={getImageSource(review.userAvatar)}
                            style={styles.reviewAvatar}
                            contentFit="cover"
                          />
                          <View style={styles.reviewUserInfo}>
                            <Text style={styles.reviewUserName}>{review.userName}</Text>
                            <Text style={styles.reviewDate}>{review.date}</Text>
                          </View>
                          <View style={styles.reviewRatingBadge}>
                            <Feather name="star" size={10} color="#FFF" fill="#FFF" />
                            <Text style={styles.reviewRatingText}>{review.rating}</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewContent}>{review.content}</Text>
                      </View>
                    ))}

                    <TouchableOpacity style={styles.viewAllReviewsButton}>
                      <Text style={styles.viewAllReviewsText}>
                        Xem tất cả {selectedPlaceForModal.totalReviews?.toLocaleString() || ''} đánh
                        giá
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    elevation: 3,
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  headerPressable: {
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftInfoArea: {
    flex: 1,
    marginRight: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    marginBottom: 9,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusInProgress: {
    backgroundColor: '#EAF2FF',
  },
  statusInProgressText: {
    color: '#2F80ED',
  },
  statusRewardReady: {
    backgroundColor: '#FFF7E6',
  },
  statusRewardReadyText: {
    color: '#D97706',
  },
  statusDone: {
    backgroundColor: '#E9F8F0',
  },
  statusDoneText: {
    color: '#22A661',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A253C',
    lineHeight: 22,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 9,
    backgroundColor: '#EAF0F7',
    borderRadius: 999,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2F80ED',
    borderRadius: 999,
  },
  progressRatio: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  rightRewardArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniRewardIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRewardPoints: {
    backgroundColor: '#FEF3C7',
  },
  miniRewardFrame: {
    backgroundColor: '#F3E8FF',
  },
  expandChevron: {
    marginLeft: 4,
    padding: 2,
  },
  expandedContent: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  desc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  missionImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
  },
  destinationsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  destinationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 10,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  destIcon: {
    marginRight: 8,
  },
  destName: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  destNameChecked: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  infoIcon: {
    marginLeft: 8,
  },
  rewardBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  rewardPointsBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  rewardFrameBox: {
    backgroundColor: '#F3E8FF',
    borderColor: '#E9D5FF',
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rewardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIcon: {
    marginRight: 6,
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  rewardPointsText: {
    color: '#D97706',
  },
  rewardFrameText: {
    color: '#7C3AED',
  },
  rewardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  rewardStatusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  rewardStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusLocked: {
    backgroundColor: '#E2E8F0',
  },
  statusLockedText: {
    color: '#64748B',
  },
  statusReady: {
    backgroundColor: '#EF4444',
  },
  statusReadyText: {
    color: '#fff',
  },
  statusClaimed: {
    backgroundColor: '#10B981',
  },
  statusClaimedText: {
    color: '#fff',
  },
  claimBtn: {
    flexDirection: 'row',
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  claimIcon: {
    marginRight: 6,
  },
  claimBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Place Detail Modal styles (replicated from home index.tsx)
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
    height: 300,
    backgroundColor: '#EDF2F7',
    position: 'relative',
  },
  modalImage: {
    height: 300,
    resizeMode: 'cover',
  },
  modalImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
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
  galleryBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  galleryBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A2B4A',
    flex: 1,
    lineHeight: 32,
  },
  favButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAddress: {
    fontSize: 14,
    color: '#718096',
    flex: 1,
    fontWeight: '500',
  },
  modalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
  },
  statLabel: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 24,
  },
  modalTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalTypeBadge: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  modalTypeText: {
    fontSize: 12,
    color: '#4A5568',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4A7CFF',
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  modalPrimaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // Reviews Styles
  reviewsSection: { marginTop: 8 },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewsTitle: { fontSize: 18, fontWeight: '700', color: '#1A2B4A' },
  writeReviewText: { fontSize: 14, color: '#4A7CFF', fontWeight: '600' },
  reviewItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  reviewUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  reviewUserInfo: { flex: 1 },
  reviewUserName: { fontSize: 14, fontWeight: '600', color: '#1A2B4A' },
  reviewDate: { fontSize: 12, color: '#A0AEC0' },
  reviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECC94B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewRatingText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  reviewContent: { fontSize: 14, color: '#4A5568', lineHeight: 20 },
  viewAllReviewsButton: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  viewAllReviewsText: { fontSize: 14, color: '#718096', fontWeight: '600' },
});
