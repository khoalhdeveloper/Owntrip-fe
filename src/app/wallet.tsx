import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { userService } from "@/services/userService";
import { withdrawalService, WithdrawalRequestItem } from "@/services/withdrawalService";

const formatCurrency = (value: number) => `${Math.max(0, value || 0).toLocaleString()}đ`;

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Đang xử lý", color: "#9A6700", bg: "#FFF3CD" },
  approved: { label: "Đã duyệt", color: "#0A7D32", bg: "#DFF7E8" },
  rejected: { label: "Từ chối", color: "#B42318", bg: "#FEE4E2" }
};

export default function WalletScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [requests, setRequests] = useState<WithdrawalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const profile = await userService.getMyProfile();
      setBalance(profile?.balance || 0);

      const history = await withdrawalService.getMyRequests();
      setRequests(history.data || []);
    } catch {
      Alert.alert("Lỗi", "Không thể tải dữ liệu ví");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const submitWithdrawal = async () => {
    const parsedAmount = Number(amount.replace(/\D/g, ""));

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập số tiền rút hợp lệ");
      return;
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng");
      return;
    }

    if (parsedAmount > balance) {
      Alert.alert("Số dư không đủ", "Số tiền rút không được vượt quá số dư hiện tại");
      return;
    }

    try {
      setSubmitting(true);
      const result = await withdrawalService.create({
        amount: parsedAmount,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim()
      });

      if (!result.success) {
        Alert.alert("Thất bại", result.message || "Không thể tạo yêu cầu rút tiền");
        return;
      }

      setAmount("");
      Alert.alert("Thành công", "Yêu cầu rút tiền đã được gửi và đang chờ duyệt");
      loadData();
    } catch {
      Alert.alert("Lỗi", "Không thể gửi yêu cầu rút tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: WithdrawalRequestItem }) => {
    const statusMeta = statusMap[item.status] || statusMap.pending;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}> 
            <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        <Text style={styles.itemSubText}>Ngân hàng: {item.bankName}</Text>
        <Text style={styles.itemSubText}>STK: {item.accountNumber}</Text>
        <Text style={styles.itemSubText}>Chủ tài khoản: {item.accountName}</Text>
        <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleString("vi-VN")}</Text>
        {!!item.adminNote && <Text style={styles.adminNote}>Ghi chú Admin: {item.adminNote}</Text>}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#005CB8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#0F172A" />
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Feather name="credit-card" size={20} color="#005CB8" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Ví Creator</Text>
            <Text style={styles.headerBalance}>{formatCurrency(balance)}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Tạo yêu cầu rút tiền</Text>

          <TextInput
            style={styles.input}
            placeholder="Số tiền cần rút"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={styles.input}
            placeholder="Tên ngân hàng"
            value={bankName}
            onChangeText={setBankName}
          />
          <TextInput
            style={styles.input}
            placeholder="Số tài khoản"
            value={accountNumber}
            onChangeText={setAccountNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="Tên chủ thẻ"
            value={accountName}
            onChangeText={setAccountName}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submitWithdrawal}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Rút tiền</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.historyTitle}>Lịch sử yêu cầu rút tiền</Text>

        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có yêu cầu rút tiền nào</Text>}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  topBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  backBtnText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 13
  },
  header: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#1A2B4A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 92, 184, 0.1)"
  },
  headerTitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600"
  },
  headerBalance: {
    fontSize: 22,
    color: "#0F172A",
    fontWeight: "900"
  },
  formCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF"
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 12
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#FFF"
  },
  submitBtn: {
    marginTop: 4,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#005CB8",
    justifyContent: "center",
    alignItems: "center"
  },
  submitBtnDisabled: {
    opacity: 0.75
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800"
  },
  historyTitle: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B"
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10
  },
  itemCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEF2F7"
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A"
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700"
  },
  itemSubText: {
    color: "#475569",
    fontSize: 12,
    marginBottom: 2
  },
  itemDate: {
    marginTop: 6,
    color: "#94A3B8",
    fontSize: 11
  },
  adminNote: {
    marginTop: 6,
    color: "#B42318",
    fontSize: 12,
    fontWeight: "600"
  },
  emptyText: {
    textAlign: "center",
    marginTop: 12,
    color: "#94A3B8"
  }
});
