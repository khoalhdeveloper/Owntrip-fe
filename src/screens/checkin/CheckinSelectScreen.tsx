import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { sessionCache } from './FrameSelectScreen';

const { width, height } = Dimensions.get('window');
const COLUMN_GAP = 12;
const COLUMNS = 2;
const CARD_WIDTH = (width - 32 - COLUMN_GAP) / COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

/* ─── Mini Slot Preview ────────────────────────────────────────────── */
const SlotPreview = ({
  index,
  uri,
  isActive,
}: {
  index: number;
  uri: string | null;
  isActive: boolean;
}) => (
  <View
    style={[
      styles.slotPreview,
      isActive && styles.slotPreviewActive,
    ]}
  >
    {uri ? (
      <Image source={{ uri }} style={styles.slotPreviewImg} resizeMode="cover" />
    ) : (
      <View style={styles.slotPreviewEmpty}>
        <Text style={styles.slotPreviewEmptyNum}>{index + 1}</Text>
      </View>
    )}
    {isActive && <View style={styles.slotActiveRing} />}
  </View>
);

/* ─── Main Screen ──────────────────────────────────────────────────── */
export const CheckinSelectScreen = () => {
  const capturedPhotos: string[] =
    (sessionCache as any).capturedPhotosTemp || [];

  const [selectedPhotos, setSelectedPhotos] = useState<(string | null)[]>([
    null, null, null, null,
  ]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const selectedCount = selectedPhotos.filter(Boolean).length;

  // Chọn / bỏ chọn ảnh — thứ tự quan trọng
  const togglePhoto = useCallback(
    (uri: string) => {
      setSelectedPhotos((prev) => {
        const idx = prev.indexOf(uri);
        if (idx !== -1) {
          // Đã chọn → bỏ, dịch chuyển các ảnh sau lên
          const next = [...prev];
          next.splice(idx, 1);
          next.push(null);
          return next;
        }
        // Chưa chọn & còn slot trống
        const emptySlot = prev.indexOf(null);
        if (emptySlot === -1) return prev; // đã đủ 4
        const next = [...prev];
        next[emptySlot] = uri;
        return next;
      });
    },
    []
  );

  const handleConfirm = () => {
    if (selectedCount < 4) return;
    selectedPhotos.forEach((uri, idx) => {
      sessionCache.userImageUris[idx] = uri;
    });
    sessionCache.activeSlotIndex = 0;
    (sessionCache as any).capturedPhotosTemp = [];
    router.push({
      pathname: '/checkin/frame',
      params: { multiImageLoaded: 'true' },
    });
  };

  const handleRetake = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleRetake} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color="#1A253C" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chọn 4 tấm ảnh</Text>
          <Text style={styles.headerSub}>
            từ {capturedPhotos.length} ảnh đã chụp
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── 4 Slot Preview Bar ── */}
      <View style={styles.slotBar}>
        <Text style={styles.slotBarLabel}>
          Thứ tự trong khung · Đã chọn{' '}
          <Text style={styles.slotBarCount}>{selectedCount}/4</Text>
        </Text>
        <View style={styles.slotRow}>
          {[0, 1, 2, 3].map((i) => (
            <SlotPreview
              key={i}
              index={i}
              uri={selectedPhotos[i]}
              isActive={selectedPhotos[i] !== null}
            />
          ))}
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${(selectedCount / 4) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* ── Photo Grid ── */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {capturedPhotos.map((uri, index) => {
          const selectOrder = selectedPhotos.indexOf(uri);
          const isSelected = selectOrder !== -1;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => togglePhoto(uri)}
              onLongPress={() => setPreviewUri(uri)}
              activeOpacity={0.85}
            >
              <Image source={{ uri }} style={styles.cardImg} resizeMode="cover" />

              {/* Dim overlay khi đã đủ 4 và ảnh này chưa được chọn */}
              {selectedCount === 4 && !isSelected && (
                <View style={styles.dimOverlay} />
              )}

              {/* Badge số thứ tự */}
              {isSelected ? (
                <View style={styles.badgeSelected}>
                  <Text style={styles.badgeText}>{selectOrder + 1}</Text>
                </View>
              ) : (
                <View style={styles.badgeEmpty} />
              )}

              {/* Nhấn giữ để xem */}
              <View style={styles.hintOverlay} pointerEvents="none">
                <Feather name="zoom-in" size={11} color="rgba(255,255,255,0.7)" />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
          <Feather name="camera" size={17} color="#4A5568" />
          <Text style={styles.retakeBtnText}>Chụp lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            selectedCount === 4
              ? styles.confirmBtnActive
              : styles.confirmBtnDisabled,
          ]}
          disabled={selectedCount !== 4}
          onPress={handleConfirm}
        >
          <Feather name="check-circle" size={18} color="#fff" />
          <Text style={styles.confirmBtnText}>
            {selectedCount === 4 ? 'Xác nhận & Ghép khung' : `Còn thiếu ${4 - selectedCount} ảnh`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Full-screen Preview Modal ── */}
      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <TouchableOpacity
          style={styles.previewModal}
          activeOpacity={1}
          onPress={() => setPreviewUri(null)}
        >
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewModalImg}
              resizeMode="contain"
            />
          )}
          <View style={styles.previewCloseHint}>
            <Feather name="x" size={14} color="#fff" />
            <Text style={styles.previewCloseText}>Nhấn để đóng</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

/* ─── Styles ────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F7',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF2',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A253C',
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 12,
    color: '#718096',
    marginTop: 1,
  },

  /* Slot bar */
  slotBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF2',
  },
  slotBarLabel: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  slotBarCount: {
    color: '#2F80ED',
    fontWeight: '800',
  },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  slotPreview: {
    width: 58,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EDF2F7',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  slotPreviewActive: {
    borderColor: '#2F80ED',
  },
  slotPreviewImg: {
    width: '100%',
    height: '100%',
  },
  slotPreviewEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotPreviewEmptyNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CBD5E0',
  },
  slotActiveRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#2F80ED',
    borderRadius: 8,
  },
  progressBg: {
    height: 4,
    backgroundColor: '#E8EDF2',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2F80ED',
    borderRadius: 2,
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: COLUMN_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
    borderWidth: 3,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardSelected: {
    borderColor: '#2F80ED',
    elevation: 5,
    shadowOpacity: 0.18,
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  badgeSelected: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2F80ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#2F80ED',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  badgeEmpty: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  hintOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF2',
    gap: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    backgroundColor: '#F7FAFC',
    gap: 6,
  },
  retakeBtnText: {
    color: '#4A5568',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    elevation: 3,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  confirmBtnActive: {
    backgroundColor: '#2F80ED',
    shadowColor: '#2F80ED',
  },
  confirmBtnDisabled: {
    backgroundColor: '#CBD5E0',
    shadowColor: '#000',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },

  /* Preview Modal */
  previewModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalImg: {
    width: width - 32,
    height: height * 0.75,
    borderRadius: 16,
  },
  previewCloseHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
    opacity: 0.7,
  },
  previewCloseText: {
    color: '#fff',
    fontSize: 13,
  },
});
