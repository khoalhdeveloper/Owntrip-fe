import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getActiveCreatorPackages, CreatorPackage, subscribeToCreatorPackage } from '../services/creatorPackageService';
import PayOSWebViewModal from '../components/PayOSWebViewModal';
import { authService } from '../services/authService';

const BRAND = '#3B82F6';

export default function CreatorUpgradeScreen() {
  const [packages, setPackages] = useState<CreatorPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const data = await getActiveCreatorPackages();
      setPackages(data);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách gói Creator');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (pkg: CreatorPackage) => {
    setIsProcessing(true);
    try {
      const data = await subscribeToCreatorPackage(pkg._id);
      setCheckoutUrl(data.checkoutUrl);
      setBookingId(data.bookingId);
      setIsPaymentModalVisible(true);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tạo phiên thanh toán');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setIsPaymentModalVisible(false);
    Alert.alert('Thành công', 'Chúc mừng bạn đã trở thành Creator! Hãy làm mới ứng dụng để cập nhật quyền lợi.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
    // Optional: Call authService to refresh user profile
  };

  const handlePaymentCancel = () => {
    setIsPaymentModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="star" size={32} color="#F59E0B" />
          </View>
          <Text style={styles.title}>Nâng cấp Creator</Text>
          <Text style={styles.subtitle}>
            Mở khóa tính năng đăng bán lịch trình của bạn trên Marketplace và bắt đầu kiếm tiền từ đam mê du lịch.
          </Text>
        </View>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={20} color={BRAND} />
            <Text style={styles.featureText}>Đăng bán lịch trình không giới hạn</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={20} color={BRAND} />
            <Text style={styles.featureText}>Thu được 70% doanh thu từ mỗi đơn hàng</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={20} color={BRAND} />
            <Text style={styles.featureText}>Nhận huy hiệu Creator nổi bật</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={BRAND} style={{ marginTop: 40 }} />
        ) : !packages || packages.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#6B7280' }}>Hiện chưa có gói nào được mở bán.</Text>
        ) : (
          <View style={styles.packagesContainer}>
            {packages.map((pkg) => (
              <View key={pkg._id} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packageDuration}>{pkg.durationInMonths} tháng</Text>
                </View>
                <Text style={styles.packagePrice}>{pkg.price.toLocaleString()} đ</Text>
                {pkg.description ? <Text style={styles.packageDesc}>{pkg.description}</Text> : null}
                
                <TouchableOpacity
                  style={styles.subscribeBtn}
                  onPress={() => handleSubscribe(pkg)}
                  disabled={isProcessing}
                >
                  <Text style={styles.subscribeBtnText}>Đăng ký ngay</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <PayOSWebViewModal
        visible={isPaymentModalVisible}
        checkoutUrl={checkoutUrl || ''}
        bookingId={bookingId || ''}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentCancel={handlePaymentCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  iconContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  featuresList: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 30, borderWidth: 1, borderColor: '#F3F4F6' },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  featureText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  packagesContainer: { gap: 16 },
  packageCard: {
    backgroundColor: '#FFF', padding: 20, borderRadius: 16,
    borderWidth: 2, borderColor: '#E5E7EB',
  },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  packageName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  packageDuration: { fontSize: 13, fontWeight: '600', color: BRAND, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  packagePrice: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
  packageDesc: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  subscribeBtn: {
    backgroundColor: BRAND, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  subscribeBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
