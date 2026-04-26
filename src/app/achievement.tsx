import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AchievementScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Feather name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thành tựu</Text>
          <TouchableOpacity style={styles.headerBtn}>
            <Feather name="settings" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Your achievements card */}
          <View style={styles.achievementsCard}>
            <View style={styles.achievementsCardHeader}>
              <View style={styles.achievementsIconWrap}>
                <Feather name="award" size={28} color="#CA8A04" />
              </View>
              <View style={styles.achievementsCardTitleWrap}>
                <Text style={styles.achievementsCardTitle}>Thành tựu của bạn</Text>
                <Text style={styles.achievementsCardSubtitle}>Lưu niệm bạn đã thu thập được</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Đã thu thập</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Xu đã nhận</Text>
              </View>
            </View>
          </View>

          {/* Missions card */}
          <TouchableOpacity style={styles.missionsCard} activeOpacity={0.7} onPress={() => router.push('/missions')}>
            <View style={styles.missionsIconWrap}>
              <Feather name="crosshair" size={24} color="#1E293B" />
            </View>
            <View style={styles.missionsContent}>
              <Text style={styles.missionsTitle}>Nhiệm vụ</Text>
              <Text style={styles.missionsSubtitle}>Quà lưu niệm chưa thu thập</Text>
            </View>
            <Feather name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>

          {/* Achievement History */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Lịch sử thành tựu</Text>
            <Text style={styles.historySubtitle}>Những món quà bạn đã tích lũy</Text>
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Feather name="package" size={56} color="#CBD5E0" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có quà lưu niệm</Text>
              <Text style={styles.emptyMessage}>Mua quà lưu niệm tại Cửa hàng để thấy chúng ở đây</Text>
            </View>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
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

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  achievementsCard: {
    backgroundColor: '#FEF9C3',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(202, 138, 4, 0.2)',
  },
  achievementsCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  achievementsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  achievementsCardTitleWrap: { flex: 1 },
  achievementsCardTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  achievementsCardSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  missionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  missionsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  missionsContent: { flex: 1 },
  missionsTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  missionsSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  historySection: { marginBottom: 24 },
  historyTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  historySubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16, fontWeight: '500' },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  emptyIconWrap: { marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginBottom: 8 },
  emptyMessage: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
});
