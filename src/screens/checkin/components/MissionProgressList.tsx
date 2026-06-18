import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMissionProgress } from '../../../hooks/useMissionProgress';
import { MissionProgressCard } from './MissionProgressCard';
import { missionService } from '../../../services/missionService';
import { MissionProgress } from '../../../types/mission.type';

export const MissionProgressList: React.FC = () => {
  const { missions, loading, error, refresh } = useMissionProgress();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  const handleClaimReward = async (id: string) => {
    try {
      const res = await missionService.claimReward(id);
      if (res && res.success) {
        Alert.alert('Thành công', res.message || 'Đã nhận thưởng thành công!');
        await refresh();
      } else {
        Alert.alert('Thất bại', res?.message || 'Không thể nhận thưởng vào lúc này.');
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ để nhận thưởng.');
    }
  };

  // Sort: In-progress -> Completed (unclaimed) -> Completed (claimed)
  const sortedMissions = [...missions].sort((a, b) => {
    const getWeight = (item: MissionProgress) => {
      if (!item.isCompleted) return 1;
      if (!item.rewardGranted) return 2;
      return 3;
    };
    return getWeight(a) - getWeight(b);
  });
  const completedCount = missions.filter((item) => item.isCompleted).length;
  const readyCount = missions.filter((item) => item.isCompleted && !item.rewardGranted).length;
  const activeCount = missions.length - completedCount;

  if (loading && !refreshing && missions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F80ED" />
        <Text style={styles.loadingText}>Đang tải danh sách nhiệm vụ...</Text>
      </View>
    );
  }

  if (error && missions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-circle" size={48} color="#EB5757" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedMissions}
        keyExtractor={(item) => item.mission._id}
        renderItem={({ item }) => (
          <MissionProgressCard item={item} onClaimReward={handleClaimReward} />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          missions.length > 0 ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryLabel}>Tiến độ nhiệm vụ</Text>
                  <Text style={styles.summaryTitle}>Hành trình check-in</Text>
                </View>
                <View style={styles.summaryIcon}>
                  <Feather name="target" size={18} color="#2F80ED" />
                </View>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{missions.length}</Text>
                  <Text style={styles.statLabel}>Tổng</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{activeCount}</Text>
                  <Text style={styles.statLabel}>Đang làm</Text>
                </View>
                <View style={[styles.statPill, completedCount > 0 && styles.completedStatPill]}>
                  <Text style={[styles.statValue, completedCount > 0 && styles.completedStatValue]}>
                    {completedCount}
                  </Text>
                  <Text style={[styles.statLabel, completedCount > 0 && styles.completedStatLabel]}>
                    Hoàn thành
                  </Text>
                </View>
              </View>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2F80ED']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color="#A0AEC0" />
            <Text style={styles.emptyTitle}>Chưa có nhiệm vụ nào dành cho bạn</Text>
            <Text style={styles.emptySubtitle}>Các nhiệm vụ khám phá sẽ sớm quay trở lại.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    shadowColor: '#1E293B',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#2F80ED',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryTitle: {
    marginTop: 2,
    fontSize: 17,
    color: '#1E293B',
    fontWeight: '900',
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#F3F7FB',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E293B',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#7B8798',
  },
  readyStatPill: {
    backgroundColor: '#FFF7E6',
  },
  readyStatValue: {
    color: '#D97706',
  },
  readyStatLabel: {
    color: '#B7791F',
  },
  completedStatPill: {
    backgroundColor: '#E9F8F0',
  },
  completedStatValue: {
    color: '#22A661',
  },
  completedStatLabel: {
    color: '#1E8C51',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A5568',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
  },
});
