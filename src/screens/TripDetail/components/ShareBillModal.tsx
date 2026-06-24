import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { tripService } from '@/services/tripService';

const BRAND = '#4A7CFF';
const SUCCESS = '#10B981';
const DANGER = '#EF4444';

interface ShareBillModalProps {
  visible: boolean;
  tripId: string;
  initialMembers: string[];
  onClose: () => void;
  onUpdateMembers: (members: string[]) => void;
}

export default function ShareBillModal({
  visible,
  tripId,
  initialMembers,
  onClose,
  onUpdateMembers,
}: ShareBillModalProps) {
  const [membersStr, setMembersStr] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Expense Form
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [isShared, setIsShared] = useState(true);

  useEffect(() => {
    if (visible) {
      setMembers(initialMembers || []);
      setMembersStr((initialMembers || []).join(', '));
      fetchExpenses();
    }
  }, [visible, initialMembers]);

  const fetchExpenses = async () => {
    setLoading(true);
    const res = await tripService.getTripExpenses(tripId);
    if (res?.success) {
      setExpenses(res.expenses || []);
      setBalances(res.balances || []);
    }
    setLoading(false);
  };

  const handleSaveMembers = async () => {
    try {
      const newMembers = membersStr
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.length > 0);
      setMembers(newMembers);
      await tripService.updateTrip(tripId, { members: newMembers });
      onUpdateMembers(newMembers);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchExpenses(); // Re-calculate balances
    } catch (error) {
      Alert.alert('Lỗi', 'Lỗi khi lưu danh sách thành viên');
    }
  };

  const handleAddExpense = async () => {
    if (!title || !amount || !payer) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đủ thông tin và CHỌN người trả (chạm vào tên người trả)!');
      return;
    }

    const parsedMembers = membersStr
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    if (parsedMembers.length === 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên các thành viên!');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Auto-save members
    setMembers(parsedMembers);
    await tripService.updateTrip(tripId, { members: parsedMembers });
    onUpdateMembers(parsedMembers);

    const parsedAmount = parseInt(amount.replace(/\D/g, ''), 10);
    const res = await tripService.addTripExpense(tripId, {
      title,
      amount: parsedAmount,
      payer,
      isShared,
      category: 'other',
    });
    if (res?.success) {
      setTitle('');
      setAmount('');
      setPayer('');
      setIsShared(true);
      fetchExpenses();
    } else {
      Alert.alert('Lỗi', 'Không thể thêm khoản chi');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await tripService.deleteTripExpense(tripId, expenseId);
    if (res?.success) {
      fetchExpenses();
    }
  };

  const formatCurrency = (amt: number) => {
    return Math.abs(amt).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBg}>
              <Ionicons name="receipt-outline" size={20} color={BRAND} />
            </View>
            <Text style={styles.title}>Chia tiền</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* MEMBERS CONFIG */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.stepBadge, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.stepText, { color: BRAND }]}>1</Text>
              </View>
              <Text style={styles.sectionTitle}>Thành viên nhóm</Text>
            </View>
            <Text style={styles.hint}>Nhập tên cách nhau bằng dấu phẩy</Text>
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <Feather name="users" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  value={membersStr}
                  onChangeText={setMembersStr}
                  placeholder="VD: Nam, Lan, Hương"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity onPress={handleSaveMembers} style={styles.inlineSaveBtn}>
                  <Text style={styles.inlineSaveBtnText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ADD EXPENSE */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.stepBadge, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.stepText, { color: SUCCESS }]}>2</Text>
              </View>
              <Text style={styles.sectionTitle}>Thêm khoản chi</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Feather name="edit-3" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Tên khoản chi (VD: Ăn lẩu)"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>đ</Text>
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Số tiền (VD: 500000)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            <Text style={styles.label}>Ai là người trả?</Text>
            <View style={styles.chipsContainer}>
              {membersStr.trim().length === 0 && <Text style={styles.hint}>Nhập tên thành viên ở trên để chọn</Text>}
              {membersStr
                .split(',')
                .map(m => m.trim())
                .filter(m => m.length > 0)
                .map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, payer === m && styles.chipActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPayer(m);
                    }}
                  >
                    <Text style={[styles.chipText, payer === m && styles.chipTextActive]}>{m}</Text>
                    {payer === m && <Feather name="check" size={14} color="#FFF" style={{ marginLeft: 4 }} />}
                  </TouchableOpacity>
                ))}
            </View>

            <View style={styles.switchRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="pie-chart" size={18} color="#6B7280" />
                <Text style={styles.switchLabel}>Cưa đều cho cả nhóm?</Text>
              </View>
              <Switch value={isShared} onValueChange={setIsShared} trackColor={{ true: SUCCESS, false: '#E5E7EB' }} />
            </View>

            <TouchableOpacity style={styles.btnAdd} activeOpacity={0.8} onPress={handleAddExpense}>
              <Ionicons name="add-circle" size={20} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnAddText}>Thêm vào quỹ</Text>
            </TouchableOpacity>
          </View>

          {/* BALANCES */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.stepBadge, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.stepText, { color: DANGER }]}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>Tổng kết nợ nần</Text>
            </View>

            {loading ? (
              <ActivityIndicator color={BRAND} style={{ marginVertical: 20 }} />
            ) : balances.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="check-circle" size={32} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có khoản chi chung nào</Text>
              </View>
            ) : (
              <View style={styles.balancesWrapper}>
                {balances.map((b, idx) => (
                  <View key={idx} style={styles.balanceCard}>
                    <View style={styles.balanceAvatar}>
                      <Text style={styles.balanceAvatarText}>{b.member.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.balanceInfo}>
                      <Text style={styles.balanceName}>{b.member}</Text>
                      {b.balance < 0 ? (
                        <Text style={[styles.balanceSub, { color: DANGER }]}>Đóng thêm</Text>
                      ) : b.balance > 0 ? (
                        <Text style={[styles.balanceSub, { color: SUCCESS }]}>Nhận lại</Text>
                      ) : (
                        <Text style={styles.balanceSub}>Đã huề tiền</Text>
                      )}
                    </View>
                    <View style={styles.balanceRight}>
                      <Text style={[
                        styles.balanceAmount,
                        b.balance < 0 ? { color: DANGER } : b.balance > 0 ? { color: SUCCESS } : { color: '#9CA3AF' }
                      ]}>
                        {b.balance > 0 ? '+' : ''}{formatCurrency(b.balance)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* EXPENSES LIST */}
          {expenses.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Lịch sử chi tiêu</Text>
              <View style={styles.expensesWrapper}>
                {expenses.map((exp) => (
                  <View key={exp._id} style={styles.expenseItem}>
                    <View style={styles.expenseIconBg}>
                      <Feather name={exp.isShared ? 'users' : 'user'} size={16} color={BRAND} />
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expTitle} numberOfLines={1}>{exp.title}</Text>
                      <Text style={styles.expSub}>
                        <Text style={{ fontWeight: '600', color: '#4B5563' }}>{exp.payer}</Text> trả • {exp.isShared ? 'Cưa đều' : 'Cá nhân'}
                      </Text>
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={styles.expAmount}>{exp.amount.toLocaleString('vi-VN')}đ</Text>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteExpense(exp._id)}>
                        <Feather name="trash-2" size={16} color={DANGER} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' }, // Nền xám nhạt cho toàn Modal
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  hint: { fontSize: 13, color: '#6B7280', marginBottom: 12 },

  row: { flexDirection: 'row', alignItems: 'center' },
  inputGroup: { gap: 12, marginBottom: 16 },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: { marginRight: 10 },
  currencySymbol: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginRight: 10 },
  inputWithIcon: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  inlineSaveBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  inlineSaveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
    ...Platform.select({
      ios: { shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  chipText: { fontSize: 14, fontWeight: '500', color: '#4B5563' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 16
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },

  btnAdd: {
    flexDirection: 'row',
    backgroundColor: SUCCESS,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: SUCCESS, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  btnAddText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  balancesWrapper: { gap: 12 },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  balanceAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceAvatarText: { fontSize: 16, fontWeight: '700', color: '#4B5563' },
  balanceInfo: { flex: 1 },
  balanceName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  balanceSub: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  balanceRight: { alignItems: 'flex-end' },
  balanceAmount: { fontSize: 16, fontWeight: '800' },

  expensesWrapper: { gap: 12, marginTop: 12 },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expenseIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: { flex: 1, paddingRight: 12 },
  expTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  expSub: { fontSize: 13, color: '#6B7280' },
  expenseRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 12 },
  expAmount: { fontSize: 15, fontWeight: '800', color: '#111827' },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },

  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { marginTop: 8, fontSize: 14, color: '#9CA3AF', fontWeight: '500' }
});
