import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { missionService } from '@/services/missionService';
import { MissionProgress } from '@/types/mission.type';

export default function AchievementScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progressList, setProgressList] = useState<MissionProgress[]>([]);
  const [stats, setStats] = useState({ collected: 0, coins: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await missionService.getMyProgress();
      setProgressList(data || []);

      let collectedCount = 0;
      let totalCoins = 0;

      if (data && Array.isArray(data)) {
        data.forEach((item) => {
          if (item.rewardGranted) {
            const rewardType = item.mission?.reward?.type || item.reward?.type;
            if (rewardType === 'points') {
              const amount = Number(item.mission?.reward?.pointsAmount || item.reward?.pointsAmount || 0);
              totalCoins += amount;
            } else {
              collectedCount++;
            }
          }
        });
      }

      setStats({
        collected: collectedCount,
        coins: totalCoins,
      });
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7CFF" />
      </View>
    );
  }

  const claimedMissions = progressList.filter((item) => item.rewardGranted);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Feather name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thành tựu</Text>
          <View style={styles.headerBtn} />
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
                <Text style={styles.statValue}>{stats.collected}</Text>
                <Text style={styles.statLabel}>Đã thu thập</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.coins}</Text>
                <Text style={styles.statLabel}>Xu đã nhận</Text>
              </View>
            </View>
          </View>

          {/* Missions card */}
          <TouchableOpacity
            style={styles.missionsCard}
            activeOpacity={0.7}
            onPress={() => router.push('/missions')}
          >
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
            {claimedMissions.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Feather name="package" size={56} color="#CBD5E0" />
                </View>
                <Text style={styles.emptyTitle}>Chưa có quà lưu niệm</Text>
                <Text style={styles.emptyMessage}>
                  Mua quà lưu niệm tại Cửa hàng hoặc hoàn thành nhiệm vụ để thấy chúng ở đây
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {claimedMissions.map((item, index) => {
                  const rewardType = item.mission?.reward?.type || item.reward?.type;
                  const isPoints = rewardType === 'points';
                  const pointsAmount = item.mission?.reward?.pointsAmount || item.reward?.pointsAmount || 0;
                  
                  return (
                    <View key={item.mission?._id || index} style={styles.historyItem}>
                      <View style={[styles.historyIconWrap, isPoints ? styles.iconPoints : styles.iconFrame]}>
                        <Feather 
                          name={isPoints ? "database" : "image"} 
                          size={22} 
                          color={isPoints ? "#EAB308" : "#3B82F6"} 
                        />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyItemTitle} numberOfLines={1}>
                          {item.mission?.title || item.mission?.name || 'Nhiệm vụ'}
                        </Text>
                        <Text style={styles.historyItemReward}>
                          {isPoints ? `+${pointsAmount} xu` : 'Nhận khung ảnh check-in'}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>
                        {item.progress?.rewardGrantedAt 
                          ? new Date(item.progress.rewardGrantedAt).toLocaleDateString('vi-VN') 
                          : 'Đã nhận'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
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
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  historyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconPoints: {
    backgroundColor: '#FEF9C3',
  },
  iconFrame: {
    backgroundColor: '#DBEAFE',
  },
  historyContent: {
    flex: 1,
    marginRight: 8,
  },
  historyItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  historyItemReward: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
