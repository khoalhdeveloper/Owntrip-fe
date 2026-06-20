import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AIItineraryScoreResult } from '@/services/aiService';

const BRAND = '#4A7CFF';
const PURPLE = '#7C3AED';

interface AiScoreModalProps {
  visible: boolean;
  onClose: () => void;
  aiScoreResult: AIItineraryScoreResult | null;
  onReScore?: () => Promise<void>;
  aiScoreLoading?: boolean;
}

export default function AiScoreModal({ visible, onClose, aiScoreResult, onReScore, aiScoreLoading }: AiScoreModalProps) {
  if (!aiScoreResult) return null;

  const { score, level, summary, warnings, suggestions, dayReviews } = aiScoreResult;

  // Determine colors based on score / level
  let levelText = 'Cần xem lại';
  let themeColor = '#EF4444'; // Red
  let bgColor = '#FEF2F2'; // Light red

  if (level === 'good') {
    levelText = 'Lịch trình rất tốt';
    themeColor = '#10B981'; // Green
    bgColor = '#ECFDF5';
  } else if (level === 'too_busy') {
    levelText = 'Lịch trình hơi dày';
    themeColor = '#F59E0B'; // Orange
    bgColor = '#FFFBEB';
  } else if (score >= 70) {
    levelText = 'Khá ổn';
    themeColor = '#3B82F6'; // Blue
    bgColor = '#EFF6FF';
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Feather name="zap" size={20} color={PURPLE} />
            <Text style={styles.title}>AI chấm điểm chi tiết</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Score Section */}
          <View style={[styles.heroCard, { backgroundColor: bgColor }]}>
            <View style={[styles.scoreCircle, { borderColor: themeColor }]}>
              <Text style={[styles.scoreVal, { color: themeColor }]}>{Math.round(score)}</Text>
              <Text style={[styles.scoreMax, { color: themeColor }]}>/100</Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={[styles.levelTitle, { color: themeColor }]}>{levelText}</Text>
              <Text style={styles.summaryText}>{summary || 'Lịch trình của bạn đã được AI phân tích.'}</Text>
            </View>
          </View>

          {/* Warnings Section */}
          {warnings && warnings.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Feather name="alert-triangle" size={18} color="#EF4444" />
                <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Cảnh báo & Vấn đề</Text>
              </View>
              <View style={styles.listContainer}>
                {warnings.map((warn, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={[styles.bulletPoint, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.listItemText}>{warn}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Suggestions Section */}
          {suggestions && suggestions.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Feather name="star" size={18} color="#F59E0B" />
                <Text style={[styles.sectionTitle, { color: '#D97706' }]}>Gợi ý cải thiện</Text>
              </View>
              <View style={styles.listContainer}>
                {suggestions.map((sug, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={[styles.bulletPoint, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.listItemText}>{sug}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Day Reviews Section */}
          {dayReviews && dayReviews.length > 0 && (
            <View style={styles.dayReviewsWrapper}>
              <Text style={styles.dayReviewsHeading}>Phân tích theo từng ngày</Text>
              {dayReviews.map((dayRev, index) => {
                let dayColor = '#10B981';
                let dayBg = '#ECFDF5';
                if (dayRev.score < 50) {
                  dayColor = '#EF4444';
                  dayBg = '#FEF2F2';
                } else if (dayRev.score < 75) {
                  dayColor = '#F59E0B';
                  dayBg = '#FFFBEB';
                }

                return (
                  <View key={index} style={styles.dayCard}>
                    <View style={styles.dayCardHeader}>
                      <Text style={styles.dayTitle}>Ngày {dayRev.day}</Text>
                      <View style={[styles.dayScoreBadge, { backgroundColor: dayBg }]}>
                        <Text style={[styles.dayScoreText, { color: dayColor }]}>{Math.round(dayRev.score)}đ</Text>
                      </View>
                    </View>

                    {/* Day Warnings */}
                    {dayRev.warnings && dayRev.warnings.length > 0 && (
                      <View style={styles.daySubSection}>
                        <View style={styles.daySubHeader}>
                          <Feather name="alert-circle" size={14} color="#EF4444" />
                          <Text style={styles.daySubTitle}>Cần lưu ý:</Text>
                        </View>
                        {dayRev.warnings.map((w, idx) => (
                          <Text key={idx} style={styles.daySubText}>• {w}</Text>
                        ))}
                      </View>
                    )}

                    {/* Day Suggestions */}
                    {dayRev.suggestions && dayRev.suggestions.length > 0 && (
                      <View style={styles.daySubSection}>
                        <View style={styles.daySubHeader}>
                          <Feather name="info" size={14} color="#3B82F6" />
                          <Text style={styles.daySubTitle}>Gợi ý:</Text>
                        </View>
                        {dayRev.suggestions.map((s, idx) => (
                          <Text key={idx} style={styles.daySubText}>• {s}</Text>
                        ))}
                      </View>
                    )}

                    {(!dayRev.warnings?.length && !dayRev.suggestions?.length) && (
                      <Text style={styles.dayGoodText}>Lịch trình ngày này rất hợp lý!</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {onReScore && (
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: PURPLE, marginBottom: 8 }]}
              onPress={onReScore}
              disabled={aiScoreLoading}
            >
              {aiScoreLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.closeBtnText}>Chấm điểm lại</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 16,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  scoreVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  heroMeta: {
    flex: 1,
    gap: 4,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  listItemText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  dayReviewsWrapper: {
    marginTop: 8,
    gap: 12,
  },
  dayReviewsHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  dayScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayScoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  daySubSection: {
    marginTop: 8,
    gap: 2,
  },
  daySubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  daySubTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  daySubText: {
    fontSize: 13,
    color: '#6B7280',
    paddingLeft: 18,
    lineHeight: 18,
  },
  dayGoodText: {
    fontSize: 13,
    color: '#10B981',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  closeBtn: {
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
