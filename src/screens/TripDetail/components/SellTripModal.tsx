import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tripService } from '@/services/tripService';

const BRAND = '#4A7CFF';

interface SellTripModalProps {
  visible: boolean;
  tripId: string;
  tripTitle: string;
  initialPrice?: number;
  isForSale?: boolean;
  onClose: () => void;
  onSuccess: (price: number) => void;
}

const PRESET_PRICES = [29000, 49000, 99000, 199000];

export default function SellTripModal({
  visible,
  tripId,
  tripTitle,
  initialPrice = 49000,
  isForSale = false,
  onClose,
  onSuccess,
}: SellTripModalProps) {
  const insets = useSafeAreaInsets();
  const [priceInput, setPriceInput] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (visible) {
      setPriceInput(initialPrice > 0 ? String(initialPrice) : '49000');
    }
  }, [visible, initialPrice]);

  const formatPriceInput = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setPriceInput(cleaned);
  };

  const handlePresetPress = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPriceInput(String(val));
  };

  const handlePublish = async () => {
    const numericPrice = parseInt(priceInput, 10);
    if (isNaN(numericPrice) || numericPrice < 10000) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Giá bán không hợp lệ',
        text2: 'Vui lòng thiết lập giá tối thiểu là 10.000 ₫',
      });
      return;
    }

    setPublishing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const success = await tripService.publishToMarketplace(tripId, numericPrice);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess(numericPrice);
        onClose();
        
        // Show toast on the parent screen after modal closes
        setTimeout(() => {
          Toast.show({
            type: 'success',
            text1: isForSale ? 'Cập nhật giá thành công! 🎉' : 'Đăng bán thành công! 🎉',
            text2: isForSale 
              ? `Giá mới đã được cập nhật thành ${numericPrice.toLocaleString('vi-VN')} ₫`
              : `Lịch trình đã được đưa lên chợ với giá ${numericPrice.toLocaleString('vi-VN')} ₫`,
            visibilityTime: 4000,
          });
        }, 300);
      } else {
        throw new Error('Failed to publish');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Đăng bán thất bại',
        text2: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const displayFormatted = () => {
    const val = parseInt(priceInput, 10);
    if (isNaN(val)) return '0 ₫';
    return `${val.toLocaleString('vi-VN')} ₫`;
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
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isForSale ? 'Chỉnh sửa giá bán' : 'Đăng bán lịch trình'}</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.infoContainer}>
              <View style={styles.iconWrapper}>
                <Feather name="dollar-sign" size={32} color="#F59E0B" />
              </View>
              <Text style={styles.infoTitle}>Kiếm doanh thu từ lịch trình của bạn</Text>
              <Text style={styles.infoSubtitle} numberOfLines={2}>
                {isForSale 
                  ? `Cập nhật lại giá bán cho "${tripTitle}" trên Marketplace.` 
                  : `"${tripTitle}" sẽ được chia sẻ công khai trên chợ. Địa điểm nhạy cảm sẽ được ẩn cho đến khi có người mua.`}
              </Text>
            </View>

            {/* Price input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Giá bán mong muốn (₫)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={priceInput}
                  onChangeText={formatPriceInput}
                  placeholder="Nhập giá tiền, ví dụ: 49000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={9}
                  returnKeyType="done"
                />
                <Text style={styles.currencyBadge}>VNĐ</Text>
              </View>
              {priceInput ? (
                <Text style={styles.formattedHint}>
                  Khách mua sẽ thấy: <Text style={styles.boldText}>{displayFormatted()}</Text>
                </Text>
              ) : null}
            </View>

            {/* Presets */}
            <Text style={styles.presetLabel}>Giá gợi ý phổ biến</Text>
            <View style={styles.presetsRow}>
              {PRESET_PRICES.map((p) => {
                const isSelected = parseInt(priceInput, 10) === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                    onPress={() => handlePresetPress(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                      {(p / 1000).toFixed(0)}k
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.actionBtn, publishing && styles.actionBtnDisabled]}
              onPress={handlePublish}
              disabled={publishing}
              activeOpacity={0.8}
            >
              {publishing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Feather name={isForSale ? "edit" : "globe"} size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>{isForSale ? 'Cập nhật giá' : 'Đăng bán ngay'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
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

  scroll: { padding: 24, paddingBottom: 16 },

  infoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  currencyBadge: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    height: '100%',
    textAlignVertical: 'center',
    lineHeight: 44,
  },
  formattedHint: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 6,
  },
  boldText: {
    fontWeight: '700',
    color: '#F59E0B',
  },

  presetLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFBFB',
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  presetTextActive: {
    color: '#FFF',
  },

  footer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 16,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
