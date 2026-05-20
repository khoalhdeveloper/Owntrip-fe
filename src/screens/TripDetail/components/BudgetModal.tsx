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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const BRAND = '#4A7CFF';

interface BudgetData {
  accommodation: number;
  food: number;
  transport: number;
  activities: number;
}

interface BudgetModalProps {
  visible: boolean;
  initialBudget?: BudgetData;
  hotelBookedCost?: number;
  onClose: () => void;
  onSave: (budget: BudgetData) => void;
}

export default function BudgetModal({ visible, initialBudget, hotelBookedCost, onClose, onSave }: BudgetModalProps) {
  const [budget, setBudget] = useState<BudgetData>({
    accommodation: 0,
    food: 0,
    transport: 0,
    activities: 0,
  });

  useEffect(() => {
    if (visible) {
      setBudget({
        accommodation: hotelBookedCost !== undefined ? hotelBookedCost : (initialBudget?.accommodation || 0),
        food: initialBudget?.food || 0,
        transport: initialBudget?.transport || 0,
        activities: initialBudget?.activities || 0,
      });
    }
  }, [visible, initialBudget, hotelBookedCost]);

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(budget);
  };

  const updateField = (field: keyof BudgetData, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    setBudget({ ...budget, [field]: isNaN(num) ? 0 : num });
  };

  const total = budget.accommodation + budget.food + budget.transport + budget.activities;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Lập ngân sách</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>Lên kế hoạch chi phí cho chuyến đi của bạn</Text>
          
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Tổng ngân sách dự kiến</Text>
            <Text style={styles.totalAmount}>{total.toLocaleString()} đ</Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Feather name="home" size={16} color="#6B7280" />
              <Text style={styles.inputLabel}>Chỗ ở</Text>
            </View>
            <TextInput
              style={styles.input}
              value={budget.accommodation > 0 ? budget.accommodation.toString() : ''}
              onChangeText={(text) => updateField('accommodation', text)}
              keyboardType="numeric"
              placeholder="0"
              editable={hotelBookedCost === undefined}
            />
            {hotelBookedCost !== undefined && (
              <Text style={styles.hintText}>Chi phí thực tế từ đặt phòng</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Feather name="coffee" size={16} color="#6B7280" />
              <Text style={styles.inputLabel}>Ăn uống</Text>
            </View>
            <TextInput
              style={styles.input}
              value={budget.food > 0 ? budget.food.toString() : ''}
              onChangeText={(text) => updateField('food', text)}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Feather name="navigation" size={16} color="#6B7280" />
              <Text style={styles.inputLabel}>Di chuyển</Text>
            </View>
            <TextInput
              style={styles.input}
              value={budget.transport > 0 ? budget.transport.toString() : ''}
              onChangeText={(text) => updateField('transport', text)}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Feather name="activity" size={16} color="#6B7280" />
              <Text style={styles.inputLabel}>Hoạt động & Vé</Text>
            </View>
            <TextInput
              style={styles.input}
              value={budget.activities > 0 ? budget.activities.toString() : ''}
              onChangeText={(text) => updateField('activities', text)}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Lưu ngân sách</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  content: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  
  totalCard: {
    backgroundColor: BRAND,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 14,
    color: '#EBF5FF',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },

  inputGroup: {
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  hintText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    fontWeight: '500',
  },
  
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
