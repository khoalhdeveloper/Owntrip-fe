import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { NearbyPlace, CheckinVerifyResponse } from '../../../types/checkin.type';
import { checkinService } from '../../../services/checkinService';
import { getCheckinErrorMessage } from '../../../utils/checkinErrors';
import { getFirstValidImageUri } from '../../../utils/imageUtils';
import { sessionCache } from '../FrameSelectScreen';
import axiosClient from '../../../services/axiosClient';
import { ENDPOINTS } from '../../../constants/api';

interface CheckinVerifyModalProps {
  visible: boolean;
  place: NearbyPlace | null;
  latitude: number | undefined;
  longitude: number | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

type CheckinStatus = 'idle' | 'verifying' | 'success' | 'error';

export const CheckinVerifyModal: React.FC<CheckinVerifyModalProps> = ({
  visible,
  place,
  latitude,
  longitude,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<CheckinStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [response, setResponse] = useState<CheckinVerifyResponse | null>(null);
  const [framesList, setFramesList] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchFrames = async () => {
      try {
        const res: any = await axiosClient.get(ENDPOINTS.FRAMES.LIST);
        if (active && res && res.success && res.frames) {
          setFramesList(res.frames);
        }
      } catch (err) {
        console.error('Error fetching frames in CheckinVerifyModal:', err);
      }
    };
    if (visible) {
      fetchFrames();
    }
    return () => {
      active = false;
    };
  }, [visible]);

  if (!place) return null;

  const handleVerifyCheckin = async () => {
    if (latitude === undefined || longitude === undefined) {
      setStatus('error');
      setErrorMessage('Không lấy được tọa độ hiện tại. Vui lòng bật định vị.');
      return;
    }

    try {
      setStatus('verifying');
      const res = await checkinService.verifyLocationCheckin({
        placeId: place.placeId,
        latitude,
        longitude,
      });

      if (res && res.success) {
        setResponse(res);
        setStatus('success');
        onSuccess();
      } else {
        setStatus('error');
        const code = res?.code || 'verify_checkin_failed';
        setErrorMessage(getCheckinErrorMessage(code));
      }
    } catch (err) {
      console.error('Verify checkin failed:', err);
      setStatus('error');
      setErrorMessage('Kết nối máy chủ thất bại. Vui lòng thử lại.');
    }
  };

  const handleGoToPhotoBooth = () => {
    // Reset session cache for new photo booth session
    sessionCache.userImageUris = [null, null, null, null];
    sessionCache.activeSlotIndex = 0;
    sessionCache.selectedFrame = null;
    sessionCache.defaultTitle = `Check-in tại ${place.name}`;

    onClose();
    // Navigate to frame selection screen
    router.push({
      pathname: '/checkin/frame',
      params: { title: `Check-in tại ${place.name}` },
    });
  };

  const defaultImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500';
  const displayImage = getFirstValidImageUri(place.images, defaultImage) || defaultImage;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Xác thực địa điểm</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              disabled={status === 'verifying'}
            >
              <Feather name="x" size={20} color="#718096" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {status === 'idle' && (
              <View style={styles.body}>
                <Image
                  source={{ uri: displayImage }}
                  style={styles.placeImage}
                  resizeMode="cover"
                />
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddress}>{place.address}</Text>

                <View style={styles.distanceBadge}>
                  <Feather name="navigation" size={14} color="#2F80ED" />
                  <Text style={styles.distanceText}>
                    Khoảng cách:{' '}
                    {place.distanceMeters < 1000
                      ? `${Math.round(place.distanceMeters)} m`
                      : `${(place.distanceMeters / 1000).toFixed(1)} km`}
                  </Text>
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={handleVerifyCheckin}>
                  <Text style={styles.actionBtnText}>Xác nhận Check-in</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'verifying' && (
              <View style={styles.loadingBody}>
                <ActivityIndicator size="large" color="#2F80ED" />
                <Text style={styles.loadingText}>Đang xác thực tọa độ GPS của bạn...</Text>
              </View>
            )}

            {status === 'success' && (
              <View style={styles.successBody}>
                <View style={styles.successIconContainer}>
                  <Feather name="check-circle" size={54} color="#27AE60" />
                </View>
                <Text style={styles.successTitle}>Check-in Thành Công!</Text>
                <Text style={styles.successText}>Bạn đã check-in thành công tại {place.name}.</Text>

                {/* Unlocked rewards */}
                {response?.rewards && response.rewards.filter((r) => r.granted).length > 0 && (
                  <View style={styles.rewardsBox}>
                    <Text style={styles.sectionTitle}>
                      <FontAwesome5 name="gift" size={14} color="#E2B93B" /> Quà tặng nhận được!
                    </Text>
                    {response.rewards.map((reward, i) => {
                      const isPoints = reward.type === 'points';
                      const isFrame = reward.type === 'checkin_frame';
                      let rewardTitle = '';
                      if (isPoints) {
                        rewardTitle = `Chúc mừng! Bạn nhận được ${reward.pointsAmount} điểm thưởng!`;
                      } else if (isFrame) {
                        const frameTitles: Record<string, string> = {
                          khung_hoi_an_xua: 'Khung Hội An Cổ Kính',
                          khung_ha_noi_xua: 'Khung Hà Nội Cổ Kính',
                        };
                        const matchedFrame = framesList.find(
                          (f) => f._id === reward.frameId || f.id === reward.frameId
                        );
                        const name =
                          (reward as any).frameName ||
                          (reward as any).name ||
                          matchedFrame?.name ||
                          (reward.frameId && frameTitles[reward.frameId]) ||
                          reward.frameId ||
                          'Khung hình giới hạn';
                        rewardTitle = `Đã mở khóa khung hình: ${name}`;
                      } else {
                        rewardTitle = 'Đã mở khóa quà tặng check-in!';
                      }

                      return (
                        <View key={i} style={styles.rewardItem}>
                          {isPoints ? (
                            <FontAwesome5
                              name="coins"
                              size={13}
                              color="#D97706"
                              style={styles.bullet}
                            />
                          ) : (
                            <Feather name="image" size={14} color="#7C3AED" style={styles.bullet} />
                          )}
                          <Text style={styles.rewardText}>{rewardTitle}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Mission Progress */}
                {response?.missionProgress && response.missionProgress.length > 0 && (
                  <View style={styles.missionProgressBox}>
                    <Text style={styles.sectionTitle}>
                      <Feather name="trending-up" size={14} color="#2F80ED" /> Cập nhật nhiệm vụ
                    </Text>
                    <Text style={styles.progressUpdateText}>
                      Check-in đã đóng góp vào các nhiệm vụ đang thực hiện.
                    </Text>
                  </View>
                )}

                <View style={styles.successActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.photoBoothBtn]}
                    onPress={handleGoToPhotoBooth}
                  >
                    <Feather name="camera" size={16} color="#fff" style={styles.btnIcon} />
                    <Text style={styles.actionBtnText}>Chụp ảnh kỷ niệm</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
                    <Text style={styles.closeModalBtnText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {status === 'error' && (
              <View style={styles.errorBody}>
                <View style={styles.errorIconContainer}>
                  <Feather name="alert-triangle" size={54} color="#EB5757" />
                </View>
                <Text style={styles.errorTitle}>Check-in Thất Bại</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>

                <TouchableOpacity style={styles.actionBtn} onPress={handleVerifyCheckin}>
                  <Text style={styles.actionBtnText}>Thử lại</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
                  <Text style={styles.closeModalBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A253C',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  body: {
    padding: 20,
    alignItems: 'center',
  },
  placeImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
  },
  placeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A253C',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeAddress: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2F80ED',
    marginLeft: 6,
  },
  actionBtn: {
    width: '100%',
    backgroundColor: '#2F80ED',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingBody: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  successBody: {
    padding: 20,
    alignItems: 'center',
  },
  successIconContainer: {
    marginVertical: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#27AE60',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  rewardsBox: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  missionProgressBox: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A253C',
    marginBottom: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
  },
  bullet: {
    marginRight: 8,
  },
  progressUpdateText: {
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 18,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  photoBoothBtn: {
    flexDirection: 'row',
  },
  btnIcon: {
    marginRight: 8,
  },
  closeModalBtn: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtnText: {
    color: '#4A5568',
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorBody: {
    padding: 20,
    alignItems: 'center',
  },
  errorIconContainer: {
    marginVertical: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EB5757',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
});
