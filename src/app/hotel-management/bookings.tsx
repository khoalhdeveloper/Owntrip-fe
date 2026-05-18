import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { bookingService } from '@/services/bookingService';

const { width } = Dimensions.get('window');

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  confirmed: { label: 'Đã xác nhận', color: '#16A34A', bg: '#F0FDF4', icon: 'check-circle' },
  completed: { label: 'Hoàn thành', color: '#2563EB', bg: '#EFF6FF', icon: 'award' },
  cancelled: { label: 'Đã hủy', color: '#DC2626', bg: '#FEF2F2', icon: 'x-circle' },
  pending: { label: 'Chờ xác nhận', color: '#D97706', bg: '#FFFBEB', icon: 'clock' },
  'no-show': { label: 'Không đến', color: '#6B7280', bg: '#F3F4F6', icon: 'alert-circle' },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  paid: { label: 'Đã thanh toán', color: '#16A34A' },
  unpaid: { label: 'Chưa thanh toán', color: '#D97706' },
  refunded: { label: 'Đã hoàn tiền', color: '#6366F1' },
};

function formatCurrency(amount: number): string {
  return amount?.toLocaleString('vi-VN') + '₫';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function HotelBookingsScreen() {
  const router = useRouter();
  const { hotelId, hotelName } = useLocalSearchParams<{ hotelId: string; hotelName: string }>();
  const [activeTab, setActiveTab] = useState<'bookings' | 'transactions'>('bookings');
  const [bookings, setBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [txSummary, setTxSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    if (!hotelId) return;
    try {
      if (activeTab === 'bookings') {
        const result = await bookingService.getHotelBookings(hotelId, 1, 50, statusFilter);
        if (result) {
          setBookings(result.data || []);
          setStats(result.stats || null);
        }
      } else {
        const result = await bookingService.getHotelTransactions(hotelId);
        if (result) {
          setTransactions(result.data || []);
          setTxSummary(result.summary || null);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hotelId, activeTab, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const renderStats = () => {
    if (!stats) return null;
    return (
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(96,165,250,0.2)', 'rgba(96,165,250,0.05)']}
            style={styles.statGradient}
          >
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng đơn</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(52,211,153,0.2)', 'rgba(52,211,153,0.05)']}
            style={styles.statGradient}
          >
            <Text style={[styles.statValue, { color: '#34D399' }]}>{stats.confirmed}</Text>
            <Text style={styles.statLabel}>Xác nhận</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(251,191,36,0.2)', 'rgba(251,191,36,0.05)']}
            style={styles.statGradient}
          >
            <Text style={[styles.statValue, { color: '#FBBF24' }]}>
              {formatCurrency(stats.totalRevenue)}
            </Text>
            <Text style={styles.statLabel}>Doanh thu</Text>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const renderTxSummary = () => {
    if (!txSummary) return null;
    return (
      <View style={styles.txSummaryContainer}>
        <View style={styles.txSummaryRow}>
          <View style={styles.txSummaryItem}>
            <Text style={styles.txSummaryLabel}>Tổng doanh thu</Text>
            <Text style={[styles.txSummaryValue, { color: '#16A34A' }]}>
              {formatCurrency(txSummary.totalRevenue)}
            </Text>
          </View>
          <View style={styles.txSummaryDivider} />
          <View style={styles.txSummaryItem}>
            <Text style={styles.txSummaryLabel}>Đã hoàn</Text>
            <Text style={[styles.txSummaryValue, { color: '#DC2626' }]}>
              -{formatCurrency(txSummary.totalRefunded)}
            </Text>
          </View>
          <View style={styles.txSummaryDivider} />
          <View style={styles.txSummaryItem}>
            <Text style={styles.txSummaryLabel}>Thực nhận</Text>
            <Text style={[styles.txSummaryValue, { color: '#2563EB' }]}>
              {formatCurrency(txSummary.netRevenue)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const statusFilters = [
    { key: undefined, label: 'Tất cả' },
    { key: 'confirmed', label: 'Xác nhận' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' },
    { key: 'pending', label: 'Chờ' },
  ];

  if (loading && !refreshing) {
    return (
      <LinearGradient colors={['#0A1628', '#1A365D']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#0A1628', '#1A365D', '#1E40AF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {hotelName || 'Quản lý đặt phòng'}
            </Text>
            <View style={{ width: 42 }} />
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'bookings' && styles.tabActive]}
              onPress={() => setActiveTab('bookings')}
            >
              <Feather
                name="calendar"
                size={16}
                color={activeTab === 'bookings' ? '#FFF' : '#93C5FD'}
              />
              <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
                Đặt phòng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
              onPress={() => setActiveTab('transactions')}
            >
              <Feather
                name="credit-card"
                size={16}
                color={activeTab === 'transactions' ? '#FFF' : '#93C5FD'}
              />
              <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
                Giao dịch
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#60A5FA"
          />
        }
      >
        {/* ===== BOOKINGS TAB ===== */}
        {activeTab === 'bookings' && (
          <>
            {renderStats()}

            {/* Status Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              {statusFilters.map((f) => (
                <TouchableOpacity
                  key={f.key || 'all'}
                  style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
                  onPress={() => {
                    setStatusFilter(f.key);
                    setLoading(true);
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === f.key && styles.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {bookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Chưa có đơn đặt phòng</Text>
                <Text style={styles.emptyDesc}>
                  Các đơn đặt phòng từ khách hàng sẽ hiển thị tại đây
                </Text>
              </View>
            ) : (
              bookings.map((booking) => {
                const st = STATUS_MAP[booking.status] || STATUS_MAP.pending;
                const ps = PAYMENT_STATUS_MAP[booking.paymentStatus] || PAYMENT_STATUS_MAP.unpaid;
                return (
                  <View key={booking.bookingId} style={styles.bookingCard}>
                    {/* Header */}
                    <View style={styles.bookingHeader}>
                      <View>
                        <Text style={styles.bookingId}>#{booking.bookingId}</Text>
                        <Text style={styles.bookingDate}>{formatDate(booking.createdAt)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Feather name={st.icon as any} size={12} color={st.color} />
                        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>

                    {/* Guest Info */}
                    <View style={styles.bookingSection}>
                      <View style={styles.guestRow}>
                        <View style={styles.guestAvatar}>
                          <Feather name="user" size={16} color="#6B7280" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.guestName}>{booking.guest?.name || 'N/A'}</Text>
                          <Text style={styles.guestContact}>
                            {booking.guest?.phone || ''} · {booking.guest?.email || ''}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Room & Date */}
                    <View style={styles.bookingDetails}>
                      <View style={styles.detailItem}>
                        <Feather name="home" size={13} color="#9CA3AF" />
                        <Text style={styles.detailText}>{booking.roomTypeName}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Feather name="calendar" size={13} color="#9CA3AF" />
                        <Text style={styles.detailText}>
                          {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} (
                          {booking.nights} đêm)
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Feather name="layers" size={13} color="#9CA3AF" />
                        <Text style={styles.detailText}>{booking.roomCount} phòng</Text>
                      </View>
                      {booking.specialRequests ? (
                        <View style={styles.detailItem}>
                          <Feather name="message-circle" size={13} color="#9CA3AF" />
                          <Text style={styles.detailText} numberOfLines={2}>
                            {booking.specialRequests}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Footer */}
                    <View style={styles.bookingFooter}>
                      <View style={[styles.paymentBadge, { borderColor: ps.color + '40' }]}>
                        <Text style={[styles.paymentText, { color: ps.color }]}>{ps.label}</Text>
                      </View>
                      <Text style={styles.bookingPrice}>{formatCurrency(booking.totalPrice)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ===== TRANSACTIONS TAB ===== */}
        {activeTab === 'transactions' && (
          <>
            {renderTxSummary()}

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="credit-card" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
                <Text style={styles.emptyDesc}>Các giao dịch thanh toán sẽ hiển thị tại đây</Text>
              </View>
            ) : (
              transactions.map((tx) => {
                const isRefund = tx.paymentStatus === 'refunded';
                return (
                  <View key={tx.bookingId} style={styles.txCard}>
                    <View style={styles.txHeader}>
                      <View
                        style={[
                          styles.txIcon,
                          isRefund ? styles.txIconRefund : styles.txIconIncome,
                        ]}
                      >
                        <Feather
                          name={isRefund ? 'arrow-up-left' : 'arrow-down-right'}
                          size={16}
                          color={isRefund ? '#DC2626' : '#16A34A'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txTitle}>
                          {isRefund ? 'Hoàn tiền' : 'Thanh toán'} - #{tx.bookingId}
                        </Text>
                        <Text style={styles.txSubtitle}>
                          {tx.guestName} · {tx.roomTypeName}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txAmount, isRefund && { color: '#DC2626' }]}>
                          {isRefund ? '-' : '+'}
                          {formatCurrency(isRefund ? tx.refundAmount : tx.amount)}
                        </Text>
                        <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.txMeta}>
                      <Text style={styles.txMetaText}>
                        {formatDate(tx.checkIn)} → {formatDate(tx.checkOut)} · {tx.nights} đêm
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#93C5FD', fontWeight: '500' },

  // Header
  header: { paddingBottom: 20 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center' },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#93C5FD' },
  tabTextActive: { color: '#FFF' },

  // Content
  content: {
    flex: 1,
    marginTop: -1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F1F5F9',
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  statGradient: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(30,64,175,0.1)',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#60A5FA', marginBottom: 2 },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Filter
  filterScroll: { marginBottom: 16 },
  filterRow: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFF' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569' },
  emptyDesc: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  // Booking Card
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bookingId: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  bookingDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  bookingSection: { paddingHorizontal: 14, paddingTop: 10 },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  guestContact: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  bookingDetails: { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#64748B', fontWeight: '500', flex: 1 },

  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  paymentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  paymentText: { fontSize: 11, fontWeight: '600' },
  bookingPrice: { fontSize: 18, fontWeight: '800', color: '#1E40AF' },

  // Transaction Summary
  txSummaryContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  txSummaryRow: { flexDirection: 'row', alignItems: 'center' },
  txSummaryItem: { flex: 1, alignItems: 'center' },
  txSummaryDivider: { width: 1, height: 36, backgroundColor: '#E2E8F0' },
  txSummaryLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  txSummaryValue: { fontSize: 14, fontWeight: '800' },

  // Transaction Card
  txCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  txHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconIncome: { backgroundColor: '#F0FDF4' },
  txIconRefund: { backgroundColor: '#FEF2F2' },
  txTitle: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  txSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  txAmount: { fontSize: 15, fontWeight: '800', color: '#16A34A' },
  txDate: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  txMeta: { paddingHorizontal: 14, paddingBottom: 10, paddingTop: 0 },
  txMetaText: { fontSize: 11, color: '#94A3B8' },
});
