import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { decorationsService, Decoration } from '@/services/decorationsService';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 12;
const COLS = 4;
const CARD_SIZE = (width - PADDING * 2 - GAP * (COLS - 1)) / COLS;
const ITEMS_PER_PAGE = 12;
const FEATURED_COUNT = 6;
const PROMO_CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;

export default function DecorationsScreen() {
  const router = useRouter();
  const [list, setList] = useState<Decoration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await decorationsService.getList();
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(list.length / ITEMS_PER_PAGE));
  const start = (page - 1) * ITEMS_PER_PAGE;
  const pageItems = list.slice(start, start + ITEMS_PER_PAGE);
  const featuredItems = list.slice(0, FEATURED_COUNT);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Feather name="arrow-left" size={24} color="#E2E8F0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trang trí</Text>
          <TouchableOpacity style={styles.headerBtn}>
            <Feather name="settings" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Promo: Limited Time + Gothica */}
            <View style={styles.promoRow}>
              <View style={styles.promoCard}>
                <View style={styles.limitedBadge}>
                  <Text style={styles.limitedBadgeText}>Thời gian có hạn</Text>
                </View>
                <Text style={styles.promoTitle}>CHECKPOINT CACHE</Text>
                <View style={styles.emojiRow}>
                  <View style={styles.emojiCircle}><Text style={styles.emojiText}>✨</Text></View>
                  <View style={styles.emojiCircle}><Text style={styles.emojiText}>🍌</Text></View>
                  <View style={styles.emojiCircle}><Text style={styles.emojiText}>🐻</Text></View>
                </View>
                <TouchableOpacity style={styles.takeMeBtn} activeOpacity={0.85}>
                  <Text style={styles.takeMeBtnText}>Khám phá ngay</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.promoCard}>
                <View style={styles.promoCardTopSpacer} />
                <Text style={styles.promoTitle}>Gothica</Text>
                <View style={styles.emojiRow}>
                  <View style={styles.emojiCircle}><Text style={styles.emojiText}>🦇</Text></View>
                  <View style={styles.emojiCircle}><Text style={styles.emojiText}>🌹</Text></View>
                </View>
                <TouchableOpacity style={styles.takeMeBtn} activeOpacity={0.85}>
                  <Text style={styles.takeMeBtnText}>Khám phá ngay</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Featured */}
            {featuredItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Nổi bật</Text>
                  <TouchableOpacity style={styles.buyAllBtn}>
                    <Text style={styles.buyAllText}>Mua tất cả</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredScroll}
                >
                  {featuredItems.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.featuredCard} activeOpacity={0.85}>
                      <View style={styles.featuredImageWrap}>
                        <Image source={{ uri: item.image }} style={styles.featuredImage} />
                      </View>
                      <Text style={styles.featuredName} numberOfLines={2}>{item.name}</Text>
                      <View style={styles.coinsRow}>
                        <Feather name="award" size={12} color="#C4B5FD" />
                        <Text style={styles.coinsText}>{item.coins} xu</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* All */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Tất cả</Text>
                <Text style={styles.pageInfo}>Trang {page} / {totalPages}</Text>
              </View>
              <View style={styles.grid}>
                {pageItems.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.gridCard} activeOpacity={0.85}>
                    <View style={styles.gridImageWrap}>
                      <Image source={{ uri: item.image }} style={styles.gridImage} />
                    </View>
                    <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.coinsRow}>
                      <Feather name="award" size={10} color="#C4B5FD" />
                      <Text style={styles.gridCoins}>{item.coins} xu</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <Text style={styles.pageBtnText}>&lt; Trước</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <Text style={styles.pageBtnText}>Tiếp &gt;</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0d18' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15, 13, 24, 0.95)',
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: PADDING, paddingTop: 16 },

  promoRow: { flexDirection: 'row', gap: GAP, marginBottom: 24 },
  promoCard: {
    width: PROMO_CARD_WIDTH,
    backgroundColor: '#4C1D95',
    borderRadius: 16,
    padding: 14,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  limitedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  limitedBadgeText: { fontSize: 11, fontWeight: '600', color: '#E2E8F0' },
  promoTitle: { fontSize: 14, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  emojiRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  emojiCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: { fontSize: 14 },
  takeMeBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  takeMeBtnText: { fontSize: 12, fontWeight: '700', color: '#4C1D95' },
  promoCardTopSpacer: { height: 28, marginBottom: 4 },

  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#F8FAFC' },
  buyAllBtn: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#7C3AED', borderRadius: 8 },
  buyAllText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  pageInfo: { fontSize: 13, color: '#A78BFA', fontWeight: '500' },

  featuredScroll: { gap: 14, paddingBottom: 8 },
  featuredCard: {
    width: 100,
    backgroundColor: 'rgba(76, 29, 149, 0.5)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  featuredImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignSelf: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  featuredImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  featuredName: { fontSize: 11, fontWeight: '600', color: '#E2E8F0', marginTop: 8, marginBottom: 4, textAlign: 'center' },
  coinsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  coinsText: { fontSize: 11, color: '#C4B5FD', fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  gridCard: {
    width: CARD_SIZE,
    backgroundColor: 'rgba(76, 29, 149, 0.5)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  gridImageWrap: {
    width: CARD_SIZE - 16,
    height: CARD_SIZE - 16,
    borderRadius: (CARD_SIZE - 16) / 2,
    alignSelf: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridName: { fontSize: 10, fontWeight: '600', color: '#E2E8F0', marginTop: 6, marginBottom: 2, textAlign: 'center' },
  gridCoins: { fontSize: 9, color: '#C4B5FD', fontWeight: '600', textAlign: 'center' },

  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 20 },
  pageBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#5B21B6', borderRadius: 10 },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: '#E2E8F0' },
});
