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
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, TripBudget, tripService } from '@/services/tripService';
import { API_CONFIG } from '@/constants/api';
import axiosClient from '@/services/axiosClient';
import { useConfirm } from '@/components/ConfirmProvider';
import { toastConfig } from '@/components/ui/ToastConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = '#4A7CFF';

const getBudgetTotal = (value?: TripBudget | number | null) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;

  return (
    (Number(value.accommodation) || 0) +
    (Number(value.food) || 0) +
    (Number(value.transport) || 0) +
    (Number(value.activities) || 0)
  );
};

const splitBudgetTotal = (total: number, current?: TripBudget | number | null): TripBudget => {
  if (typeof current === 'object' && current && getBudgetTotal(current) > 0) {
    const oldTotal = getBudgetTotal(current);
    const accommodation = Math.round(((current.accommodation || 0) / oldTotal) * total);
    const food = Math.round(((current.food || 0) / oldTotal) * total);
    const transport = Math.round(((current.transport || 0) / oldTotal) * total);

    return {
      accommodation,
      food,
      transport,
      activities: Math.max(0, total - accommodation - food - transport),
    };
  }

  const accommodation = Math.round(total * 0.4);
  const food = Math.round(total * 0.25);
  const transport = Math.round(total * 0.2);

  return {
    accommodation,
    food,
    transport,
    activities: Math.max(0, total - accommodation - food - transport),
  };
};

const uploadTripImage = async (uri: string): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'trip-cover.jpg',
    } as any);

    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/system/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    return data?.url ?? null;
  } catch (error) {
    console.error('📡 Backend upload error:', error);
    return null;
  }
};

interface EditTripModalProps {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
  onUpdated: (updated: Trip) => void;
}

export default function EditTripModal({ visible, trip, onClose, onUpdated }: EditTripModalProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [budget, setBudget] = useState('');
  const [provinceImage, setProvinceImage] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [saving, setSaving] = useState(false);
  const { confirm } = useConfirm();

  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Validation error states
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Populate fields when modal opens
  useEffect(() => {
    if (visible && trip) {
      setTitle(trip.title || '');
      setDestination(trip.destination || '');
      setDescription(trip.description || '');
      setStartDate(new Date(trip.startDate));
      setEndDate(new Date(trip.endDate));
      setBudget(getBudgetTotal(trip.budget) ? String(getBudgetTotal(trip.budget)) : '');
      setProvinceImage(trip.provinceImage || '');
      setSelectedImageUri('');
      setErrors({});
    }
  }, [visible, trip]);

  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDisplayDate = (d: Date) => {
    return d.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const hasChanges = () => {
    return (
      title !== (trip.title || '') ||
      destination !== (trip.destination || '') ||
      description !== (trip.description || '') ||
      toDateStr(startDate) !== (trip.startDate?.split('T')[0] || '') ||
      toDateStr(endDate) !== (trip.endDate?.split('T')[0] || '') ||
      budget !== (getBudgetTotal(trip.budget) ? String(getBudgetTotal(trip.budget)) : '') ||
      selectedImageUri.length > 0 ||
      provinceImage !== (trip.provinceImage || '')
    );
  };

  const handleClose = async () => {
    if (hasChanges()) {
      const discard = await confirm(
        'Huỷ thay đổi?',
        'Các thay đổi chưa lưu sẽ bị mất.',
        'Bỏ thay đổi',
        'question',
      );
      if (!discard) return;
    }
    onClose();
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }));
  };

  const pickTripImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: 'error',
        text1: 'Cần quyền truy cập ảnh',
        text2: 'Hãy cấp quyền thư viện ảnh để đổi ảnh chuyến đi.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.4, // Giảm dung lượng ảnh để upload nhanh hơn
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const newErrors: Record<string, boolean> = {};
    if (!title.trim()) newErrors.title = true;
    if (endDate <= startDate) newErrors.endDate = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Thiếu thông tin',
        text2: newErrors.title
          ? 'Tiêu đề không được để trống'
          : 'Ngày kết thúc phải sau ngày bắt đầu',
      });
      return;
    }

    setSaving(true);
    try {
      const data: any = {};
      if (title.trim() !== trip.title) data.title = title.trim();
      if (destination.trim() !== trip.destination) data.destination = destination.trim();
      if (description.trim() !== (trip.description || '')) data.description = description.trim();
      if (toDateStr(startDate) !== trip.startDate?.split('T')[0])
        data.startDate = toDateStr(startDate);
      if (toDateStr(endDate) !== trip.endDate?.split('T')[0]) data.endDate = toDateStr(endDate);
      const budgetTotal = budget ? Number(budget) : 0;
      if (budget && budgetTotal !== getBudgetTotal(trip.budget)) {
        data.budget = splitBudgetTotal(budgetTotal, trip.budget);
      }
      if (selectedImageUri) {
        const uploadedUrl = await uploadTripImage(selectedImageUri);
        if (!uploadedUrl) throw new Error('Upload failed');
        data.provinceImage = uploadedUrl;
      } else if (provinceImage !== (trip.provinceImage || '')) {
        data.provinceImage = provinceImage;
      }

      if (Object.keys(data).length === 0) {
        onClose();
        return;
      }

      const result = await tripService.updateTrip(trip._id, data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdated(result || { ...trip, ...data });
      onClose();

      // Show toast AFTER modal closes
      setTimeout(() => {
        Toast.show({
          type: 'success',
          text1: 'Đã cập nhật! ✅',
          text2: 'Thông tin chuyến đi đã được lưu.',
        });
      }, 300);
    } catch (error) {
      console.error('Update trip error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể cập nhật chuyến đi. Vui lòng thử lại.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStartDateChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(Platform.OS === 'ios'); // iOS keeps picker open
    if (date) {
      setStartDate(date);
      // Auto-adjust end date if it's before start
      if (date >= endDate) {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        setEndDate(next);
      }
    }
  };

  const handleEndDateChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (date) {
      setEndDate(date);
      clearError('endDate');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Handle */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top - 20, 4) }]}>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chỉnh sửa chuyến đi</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={BRAND} />
              ) : (
                <Text style={[styles.headerSave, !hasChanges() && { opacity: 0.4 }]}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Trip image */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ảnh chuyến đi</Text>
              <TouchableOpacity
                style={styles.tripImagePicker}
                onPress={pickTripImage}
                activeOpacity={0.86}
              >
                {selectedImageUri || provinceImage ? (
                  <Image
                    source={{ uri: selectedImageUri || provinceImage }}
                    style={styles.tripImage}
                  />
                ) : (
                  <View style={styles.tripImagePlaceholder}>
                    <Feather name="image" size={28} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.tripImageOverlay}>
                  <View style={styles.cameraBadge}>
                    <Feather name="camera" size={16} color="#FFF" />
                  </View>
                  <Text style={styles.tripImageText}>
                    {selectedImageUri || provinceImage ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Tiêu đề <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  clearError('title');
                }}
                placeholder="Tên chuyến đi"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
                returnKeyType="next"
              />
              {errors.title && <Text style={styles.errorText}>Tiêu đề không được để trống</Text>}
            </View>

            {/* Destination */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Điểm đến</Text>
              <TextInput
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
                placeholder="Ví dụ: Đà Lạt, Hà Nội"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
                returnKeyType="next"
              />
            </View>

            {/* Date Range — Touchable with DatePicker */}
            <View style={styles.dateRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Ngày bắt đầu</Text>
                <Pressable style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                  <Feather name="calendar" size={15} color={BRAND} />
                  <Text style={styles.dateBtnText}>{formatDisplayDate(startDate)}</Text>
                </Pressable>
              </View>
              <View style={styles.dateArrow}>
                <Feather name="arrow-right" size={16} color="#D1D5DB" />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Ngày kết thúc</Text>
                <Pressable
                  style={[styles.dateBtn, errors.endDate && styles.inputError]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Feather name="calendar" size={15} color={BRAND} />
                  <Text style={styles.dateBtnText}>{formatDisplayDate(endDate)}</Text>
                </Pressable>
                {errors.endDate && <Text style={styles.errorText}>Phải sau ngày bắt đầu</Text>}
              </View>
            </View>

            {/* Budget */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ngân sách (₫)</Text>
              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={(v) => setBudget(v.replace(/[^0-9]/g, ''))}
                placeholder="Ví dụ: 5,000,000"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                returnKeyType="next"
              />
              {budget ? (
                <Text style={styles.budgetHint}>{Number(budget).toLocaleString('vi-VN')} ₫</Text>
              ) : null}
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Ghi chú thêm về chuyến đi..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{description.length}/500</Text>
            </View>
          </ScrollView>

          {/* Bottom save button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#FFF" />
                  <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* DatePickers */}
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartDateChange}
              locale="vi"
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date(startDate.getTime() + 86400000)}
              onChange={handleEndDateChange}
              locale="vi"
            />
          )}

          {/* Toast inside modal */}
          <Toast config={toastConfig} />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
  },

  handleBar: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  headerSave: { fontSize: 16, fontWeight: '700', color: BRAND },

  scroll: { padding: 20, paddingBottom: 16 },

  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#EF4444', fontSize: 14 },
  tripImagePicker: {
    height: 156,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tripImage: {
    width: '100%',
    height: '100%',
  },
  tripImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  tripImageOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cameraBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tripImageText: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  textArea: { minHeight: 100, lineHeight: 22 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },

  // Date
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  dateArrow: { paddingTop: 38, paddingHorizontal: 2 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateBtnText: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },

  // Budget
  budgetHint: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '500' },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
