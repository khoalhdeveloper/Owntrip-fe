import { StyleSheet, Platform } from 'react-native';
import { BRAND } from './types';

export const styles = StyleSheet.create({
  container: { paddingBottom: 40 },

  /* ── Map Card ── */
  mapCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F1F3',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  mapHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  mapHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mapLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapPin: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center',
  },
  mapLocationText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  visitedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0F7FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  visitedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND },
  visitedText: { fontSize: 12, fontWeight: '600', color: BRAND },
  expandBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },

  /* ── Map ── */
  mapContainer: { height: 240, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 10,
    backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  mapLoadingText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  myLocationBtn: {
    position: 'absolute', bottom: 56, right: 12,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  recenterBtn: {
    position: 'absolute', bottom: 12, right: 12,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },

  /* ── Timeline Section ── */
  timelineSection: { marginHorizontal: 16, marginTop: 20 },
  timelineHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  timelineHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  timelineCount: {
    fontSize: 12, fontWeight: '600', color: '#9CA3AF',
    backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  resetBtnText: { fontSize: 11, fontWeight: '600', color: '#EF4444' },
  timelineList: { gap: 0 },

  /* ── Timeline Item ── */
  timelineItem: {
    flexDirection: 'row', gap: 8,
    paddingVertical: 12, paddingLeft: 4, paddingRight: 12,
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  timelineItemHighlighted: {
    borderColor: BRAND, backgroundColor: '#F8FAFF', borderWidth: 1.5,
    ...Platform.select({
      ios: { shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },

  /* ── Drag Handle ── */
  dragHandle: {
    width: 28, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },

  timelineStepCol: { alignItems: 'center', width: 28 },
  timelineStepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  timelineStepDotActive: { backgroundColor: BRAND },
  timelineStepNum: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  timelineStepNumActive: { color: '#FFF' },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 4 },
  timelineAvatar: { width: 44, height: 44 },
  timelineAvatarImg: { width: 44, height: 44, borderRadius: 10 },
  timelineAvatarPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  timelineInfo: { flex: 1, gap: 2 },
  timelinePlaceName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  timelineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timelineMetaText: { fontSize: 12, color: '#9CA3AF' },
  timelineMemory: { fontSize: 12, color: '#6B7280', lineHeight: 17, marginTop: 1 },

  /* ── Distance Badge ── */
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 4, gap: 6,
  },
  distanceLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' },
  distancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F9FAFB', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#F3F4F6',
  },
  distanceText: { fontSize: 9, fontWeight: '600', color: '#9CA3AF' },

  /* ── Direction Bottom Card ── */
  directionCard: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    backgroundColor: '#FFF', borderRadius: 16,
    padding: 14, gap: 12, zIndex: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  directionCardClose: {
    position: 'absolute', top: 10, right: 10, zIndex: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  directionCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  directionCardImg: { width: 52, height: 52, borderRadius: 12 },
  directionCardImgPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  directionCardInfo: { flex: 1, gap: 3 },
  directionCardName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  directionCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  directionCardMetaText: { fontSize: 11, color: '#9CA3AF' },
  directionCardBtns: { flexDirection: 'row', gap: 10 },
  directionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: BRAND, paddingVertical: 10, borderRadius: 12,
  },
  directionBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  navigateBtn: { backgroundColor: '#F0F4FF', borderWidth: 1, borderColor: BRAND },
  navigateBtnText: { color: BRAND },

  /* ── Fullscreen ── */
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenMap: { flex: 1 },
  fullscreenTopBar: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40,
    right: 16, flexDirection: 'column', gap: 10,
  },
  fullscreenTopBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },

  /* ── Bottom Sheet ── */
  sheetBackground: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  sheetHandle: { backgroundColor: '#D1D5DB', width: 40 },
  sheetShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetBrandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  sheetCount: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  sheetContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  /* ── Sheet Timeline Items ── */
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 4,
  },
  sheetItemHighlighted: {
    borderColor: BRAND, backgroundColor: '#F8FAFF', borderWidth: 1.5,
  },
  sheetStepDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  sheetStepDotActive: { backgroundColor: BRAND },
  sheetStepNum: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  sheetStepNumActive: { color: '#FFF' },
  sheetThumb: { width: 40, height: 40, borderRadius: 10 },
  sheetThumbPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  sheetItemInfo: { flex: 1, gap: 2 },
  sheetItemName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  sheetItemMeta: { fontSize: 11, color: '#9CA3AF' },
  sheetDistBadge: {
    alignItems: 'center', paddingVertical: 4, marginBottom: 4,
  },
  sheetDistText: {
    fontSize: 10, fontWeight: '600', color: '#9CA3AF',
    backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
});
