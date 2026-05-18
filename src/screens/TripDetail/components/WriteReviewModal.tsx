import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Accommodation, accommodationService } from '@/services/accommodationService';
import { useConfirm } from '@/components/ConfirmProvider';

const BRAND = '#4A7CFF';
const MAX_IMAGES = 5;
const STAR_LABELS = ['Chọn đánh giá', 'Tệ', 'Trung bình', 'Tốt', 'Rất tốt', 'Tuyệt vời'];
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djm9x06oh/image/upload';
const UPLOAD_PRESET = 'owntrip';

interface WriteReviewModalProps {
  visible: boolean;
  hotel: Accommodation | null;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export default function WriteReviewModal({
  visible,
  hotel,
  onClose,
  onReviewSubmitted,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { alert: showAlert, confirm: showConfirm, confirmDelete } = useConfirm();

  useEffect(() => {
    if (visible && hotel) {
      // Fetch my existing review
      const fetchReview = async () => {
        const myReview = await accommodationService.getMyReview(hotel.hotelId);
        if (myReview) {
          setRating(myReview.rating || 0);
          setComment(myReview.comment || '');
          setIsEditing(true);
        } else {
          resetForm();
          setIsEditing(false);
        }
      };
      fetchReview();
    }
  }, [visible, hotel]);

  const resetForm = () => {
    setRating(0);
    setComment('');
    setImages([]);
  };

  const handleClose = async () => {
    if (rating > 0 || comment.length > 0 || images.length > 0) {
      const isConfirmed = await showConfirm(
        'Huỷ đánh giá?', 
        'Nội dung bạn nhập sẽ bị mất.', 
        'Huỷ',
        'question'
      );
      if (isConfirmed) {
        resetForm(); 
        onClose();
      }
    } else {
      onClose();
    }
  };

  const pickFromCamera = async () => {
    if (images.length >= MAX_IMAGES) {
      showAlert('Giới hạn', `Tối đa ${MAX_IMAGES} ảnh`, 'warning');
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert('Quyền truy cập', 'Cần cấp quyền camera để chụp ảnh', 'warning');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const pickFromGallery = async () => {
    if (images.length >= MAX_IMAGES) {
      showAlert('Giới hạn', `Tối đa ${MAX_IMAGES} ảnh`, 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.6,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (uri: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'review.jpg',
      } as any);
      formData.append('upload_preset', UPLOAD_PRESET);

      const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
      const data = await res.json();
      return data.secure_url || null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      showAlert('Lỗi', 'Vui lòng chọn số sao đánh giá', 'error');
      return;
    }
    if (comment.trim().length < 10) {
      showAlert('Lỗi', 'Nhận xét cần ít nhất 10 ký tự', 'error');
      return;
    }
    if (!hotel) return;

    setSubmitting(true);
    try {
      // Upload images to Cloudinary
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        const uploads = await Promise.all(images.map(uploadToCloudinary));
        uploadedUrls = uploads.filter((u): u is string => u !== null);
      }

      const success = await accommodationService.submitReview(hotel.hotelId, {
        rating,
        comment: comment.trim(),
        images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await showAlert('Thành công! 🎉', isEditing ? 'Đánh giá của bạn đã được cập nhật' : 'Đánh giá của bạn đã được gửi', 'success');
        resetForm(); 
        onReviewSubmitted(); 
        onClose();
      } else {
        showAlert('Lỗi', isEditing ? 'Không thể cập nhật đánh giá' : 'Không thể gửi đánh giá. Vui lòng thử lại.', 'error');
      }
    } catch {
      showAlert('Lỗi', 'Đã xảy ra lỗi khi gửi đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!hotel) return;
    const confirmed = await confirmDelete('Xóa đánh giá', 'Bạn có chắc chắn muốn xóa đánh giá này không? Hành động này không thể hoàn tác.', 'Xóa');
    if (confirmed) {
      setSubmitting(true);
      try {
        const success = await accommodationService.deleteReview(hotel.hotelId);
        if (success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await showAlert('Thành công', 'Đã xóa đánh giá', 'success');
          resetForm();
          onReviewSubmitted();
          onClose();
        } else {
          showAlert('Lỗi', 'Không thể xóa đánh giá', 'error');
        }
      } catch {
        showAlert('Lỗi', 'Đã xảy ra lỗi khi xóa đánh giá', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (!hotel) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Handle */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={22} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Cập nhật đánh giá' : 'Đánh giá khách sạn'}</Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name="trash-2" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Hotel name */}
          <Text style={styles.hotelName} numberOfLines={1}>{hotel.name}</Text>

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.label}>Điểm đánh giá</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(star);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Feather
                    name="star"
                    size={36}
                    color={star <= rating ? '#F59E0B' : '#E5E7EB'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.starLabel, rating > 0 && { color: '#F59E0B' }]}>
              {STAR_LABELS[rating]}
            </Text>
          </View>

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text style={styles.label}>Nhận xét của bạn</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Chia sẻ trải nghiệm của bạn về khách sạn này..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              maxLength={500}
              value={comment}
              onChangeText={setComment}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          {/* Photo */}
          <View style={styles.photoSection}>
            <Text style={styles.label}>Thêm ảnh (tùy chọn)</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickFromCamera} activeOpacity={0.7}>
                <Feather name="camera" size={20} color={BRAND} />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery} activeOpacity={0.7}>
                <Feather name="image" size={20} color={BRAND} />
                <Text style={styles.photoBtnText}>Thư viện</Text>
              </TouchableOpacity>
            </View>

            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPreview}>
                {images.map((uri, idx) => (
                  <View key={idx} style={styles.photoThumbWrap}>
                    <Image source={{ uri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => removeImage(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <Text style={styles.photoHint}>{images.length}/{MAX_IMAGES} ảnh</Text>
          </View>
        </ScrollView>

        {/* Submit */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name={isEditing ? 'edit-3' : 'send'} size={18} color="#FFF" />
                <Text style={styles.submitText}>{isEditing ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  handleBar: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  scroll: { padding: 20, paddingBottom: 30 },

  hotelName: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginBottom: 20, textAlign: 'center' },

  ratingSection: { alignItems: 'center', marginBottom: 28 },
  label: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 12, alignSelf: 'flex-start' },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  starLabel: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },

  commentSection: { marginBottom: 24 },
  commentInput: {
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14,
    fontSize: 14, color: '#1A1A1A', minHeight: 120,
    borderWidth: 1, borderColor: '#F3F4F6',
    lineHeight: 22,
  },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },

  photoSection: { marginBottom: 20 },
  photoActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
    backgroundColor: '#EBF5FF', borderRadius: 12,
  },
  photoBtnText: { fontSize: 14, fontWeight: '600', color: BRAND },

  photoPreview: { marginBottom: 8 },
  photoThumbWrap: { position: 'relative', marginRight: 8 },
  photoThumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F3F4F6' },
  photoRemoveBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#FFF', borderRadius: 10,
  },
  photoHint: { fontSize: 12, color: '#9CA3AF' },

  footer: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    ...Platform.select({ ios: { paddingBottom: 30 } }),
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: BRAND, borderRadius: 14,
    paddingVertical: 16,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
