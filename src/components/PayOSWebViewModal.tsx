import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { paymentService } from '@/services/paymentService';

interface PayOSWebViewModalProps {
  visible: boolean;
  checkoutUrl: string | null;
  bookingId: string | null;
  /** Được gọi khi thanh toán thành công (status = 'paid') */
  onPaymentSuccess: (bookingId: string) => void;
  /** Được gọi khi người dùng hủy hoặc đóng modal */
  onPaymentCancel: () => void;
  /** Label hiển thị trên modal header */
  title?: string;
}

const POLL_INTERVAL_MS = 3000; // 3 giây poll 1 lần
const MAX_POLL_COUNT = 60; // Tối đa 3 phút

export default function PayOSWebViewModal({
  visible,
  checkoutUrl,
  bookingId,
  onPaymentSuccess,
  onPaymentCancel,
  title = 'Thanh toán PayOS',
}: PayOSWebViewModalProps) {
  const [loading, setLoading] = useState(true);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'success' | 'timeout'>(
    'idle',
  );
  const pollCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSucceededRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (!bookingId || hasSucceededRef.current) return;

    pollCountRef.current = 0;
    setPollingStatus('polling');

    intervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      // Hết timeout
      if (pollCountRef.current >= MAX_POLL_COUNT) {
        stopPolling();
        setPollingStatus('timeout');
        Alert.alert(
          'Hết thời gian',
          'Không nhận được xác nhận thanh toán. Nếu đã thanh toán thành công, vui lòng kiểm tra lại trong lịch sử đặt phòng.',
          [{ text: 'Đóng', onPress: onPaymentCancel }],
        );
        return;
      }

      try {
        const result = await paymentService.checkPaymentStatus(bookingId!);
        console.log('====== KẾT QUẢ TỪ BACKEND (Thanh toán) ======');
        console.log(JSON.stringify(result, null, 2));
        console.log('==============================================');

        if (result?.data?.paymentStatus === 'paid') {
          hasSucceededRef.current = true;
          stopPolling();
          setPollingStatus('success');
        }
      } catch {
        // Bỏ qua lỗi polling, tiếp tục thử
      }
    }, POLL_INTERVAL_MS);
  }, [bookingId, stopPolling, onPaymentSuccess, onPaymentCancel]);

  // Reset state mỗi lần modal mở
  useEffect(() => {
    if (visible && checkoutUrl && bookingId) {
      hasSucceededRef.current = false;
      setLoading(true);
      setPollingStatus('idle');
      startPolling();
    }
    return () => {
      stopPolling();
    };
  }, [visible, checkoutUrl, bookingId]);

  // Detect nếu PayOS redirect về returnUrl/cancelUrl (bắt URL thay đổi)
  const handleNavigationChange = useCallback(
    (navState: WebViewNavigation) => {
      const url = navState.url || '';

      // Nếu redirect về trang success (returnUrl) hoặc có dấu hiệu thanh toán thành công từ PayOS
      if (
        url.includes('/payment/success') ||
        url.includes('success=true') ||
        (url.includes('cancel=false') && url.includes('code=00'))
      ) {
        stopPolling();
        setPollingStatus('success');
        return;
      }

      // Nếu redirect về trang cancel
      if (url.includes('/payment/cancel') || url.includes('cancel=true')) {
        stopPolling();
        onPaymentCancel();
      }
    },
    [stopPolling, onPaymentCancel],
  );

  const handleClose = () => {
    stopPolling();
    Alert.alert(
      'Hủy thanh toán?',
      'Bạn có chắc muốn hủy? Đơn đặt phòng sẽ ở trạng thái chờ thanh toán.',
      [
        { text: 'Tiếp tục thanh toán', style: 'cancel' },
        {
          text: 'Hủy',
          style: 'destructive',
          onPress: onPaymentCancel,
        },
      ],
    );
  };

  if (!checkoutUrl || !bookingId) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerRight}>
            {pollingStatus === 'polling' && (
              <View style={styles.pollingBadge}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.pollingText}>Đang chờ...</Text>
              </View>
            )}
          </View>
        </View>

        {/* WebView Container */}
        <View style={styles.webviewContainer}>
          {pollingStatus === 'success' ? (
            <View style={styles.successView}>
              <Feather name="check-circle" size={80} color="#38A169" />
              <Text style={styles.successTitle}>Giao dịch thành công!</Text>
              <Text style={styles.successDesc}>
                Thanh toán của bạn đã được ghi nhận vào hệ thống.
              </Text>
              <TouchableOpacity
                style={styles.successBtn}
                onPress={() => onPaymentSuccess(bookingId!)}
              >
                <Text style={styles.successBtnText}>Hoàn tất</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Đang tải trang thanh toán...</Text>
                </View>
              )}
              <WebView
                source={{ uri: checkoutUrl }}
                style={styles.webview}
                onLoadEnd={() => setLoading(false)}
                onLoadStart={() => setLoading(true)}
                onNavigationStateChange={handleNavigationChange}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
                allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
              />
            </>
          )}
        </View>

        {/* Polling Info Banner */}
        <View style={styles.infoBanner}>
          <Feather name="shield" size={14} color="#38A169" />
          <Text style={styles.infoText}>
            Thanh toán an toàn qua PayOS · Tự động xác nhận sau khi thanh toán
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  pollingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pollingText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#718096',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0FFF4',
    borderTopWidth: 1,
    borderTopColor: '#C6F6D5',
  },
  infoText: {
    fontSize: 12,
    color: '#276749',
    flex: 1,
  },
  successView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 15,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  successBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  successBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
