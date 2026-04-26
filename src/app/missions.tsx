import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { souvenirsService, Souvenir } from '@/services/souvenirsService';

const { width } = Dimensions.get('window');
const PADDING = 20;
const GAP = 12;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;

export default function MissionsScreen() {
  const router = useRouter();
  const [list, setList] = useState<Souvenir[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await souvenirsService.getList();
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Feather name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nhiệm vụ</Text>
          <View style={styles.headerBtn} />
        </View>

        <Text style={styles.subtitle}>Quà lưu niệm bạn chưa thu thập</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="package" size={48} color="#CBD5E0" />
            <Text style={styles.emptyText}>Chưa có mission nào</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {list.map((item) => (
                <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.85}>
                  <View style={styles.cardImageWrap}>
                    <Image source={{ uri: item.image }} style={styles.cardImage} />
                    <View style={styles.badgeLock}>
                      <Feather name="lock" size={12} color="#FFF" />
                    </View>
                  </View>
                  <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.cardType}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
                  <View style={styles.coinsRow}>
                    <Feather name="award" size={12} color="#64748B" />
                    <Text style={styles.coinsText}>{item.amount} xu</Text>
                  </View>
                  <Text style={styles.notCollected}>Chưa thu thập</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },

  subtitle: {
    fontSize: 13,
    color: '#64748B',
    paddingHorizontal: PADDING,
    paddingTop: 12,
    paddingBottom: 8,
    fontWeight: '500',
  },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: PADDING, paddingTop: 8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  badgeLock: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 10, marginBottom: 2 },
  cardType: { fontSize: 11, color: '#64748B', marginBottom: 6 },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  coinsText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  notCollected: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
});
