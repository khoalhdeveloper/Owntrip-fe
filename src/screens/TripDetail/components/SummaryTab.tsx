import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Linking,
  Modal,
  FlatList,
  Animated,
  TextInput,
  Alert,
} from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip, TripDay, Destination, tripService } from '@/services/tripService';
import { accommodationService, Accommodation, IRoomType } from '@/services/accommodationService';
import StayDatePickerModal from './StayDatePickerModal';
import AccommodationDetailModal from './AccommodationDetailModal';
import WriteReviewModal from './WriteReviewModal';
import { decodeJWT } from '@/utils/jwtUtils';
import { useConfirm } from '@/components/ConfirmProvider';
import { bookingService } from '@/services/bookingService';
import { paymentService } from '@/services/paymentService';
import PayOSWebViewModal from '@/components/PayOSWebViewModal';
import NotesModal from './NotesModal';
import BudgetModal from './BudgetModal';
import { userService, UserProfile } from '@/services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { aiService, AIItineraryScoreResult } from '@/services/aiService';
import AiScoreModal from './AiScoreModal';

const BRAND = '#4A7CFF';
const BRAND_LIGHT = '#EBF5FF';

// ===== HELPERS =====
function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const months = [
    'Th1',
    'Th2',
    'Th3',
    'Th4',
    'Th5',
    'Th6',
    'Th7',
    'Th8',
    'Th9',
    'Th10',
    'Th11',
    'Th12',
  ];
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${
      months[e.getMonth()]
    }, ${e.getFullYear()}`;
  }
  return `${s.getDate()} ${months[s.getMonth()]}, ${e.getFullYear()} – ${e.getDate()} ${
    months[e.getMonth()]
  }, ${e.getFullYear()}`;
}

function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    'Th1',
    'Th2',
    'Th3',
    'Th4',
    'Th5',
    'Th6',
    'Th7',
    'Th8',
    'Th9',
    'Th10',
    'Th11',
    'Th12',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getTripStatus(startDate: string, endDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now > end) return 'Đã hoàn thành';
  if (now >= start) return 'Đang diễn ra';
  const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return `Còn ${daysUntil} ngày`;
}

// ===== SECTION HEADER (matches reference) =====
function SectionHeader({
  icon,
  title,
  right,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIconBox}>
          <Feather name={icon} size={14} color={BRAND} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

// ===== MAIN COMPONENT =====
export default function SummaryTab({ trip, days, reviews, onRefresh }: { trip: Trip; days: TripDay[]; reviews?: any[]; onRefresh?: () => Promise<void> }) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDest, setLoadingDest] = useState(true);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Accommodation state
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [tripReviewVisible, setTripReviewVisible] = useState(false);
  const [tripReviewRating, setTripReviewRating] = useState(0);
  const [tripReviewComment, setTripReviewComment] = useState('');
  const [hasExistingTripReview, setHasExistingTripReview] = useState(false);
  const [submittingTripReview, setSubmittingTripReview] = useState(false);
  const [hotels, setHotels] = useState<Accommodation[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Accommodation | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<IRoomType | null>(null);
  const [bookedHotel, setBookedHotel] = useState<Accommodation | null>(null);
  const [bookedRoomTypeId, setBookedRoomTypeId] = useState<string | null>(null);
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);

  // PayOS states
  const [payosCheckoutUrl, setPayosCheckoutUrl] = useState<string | null>(null);
  const [payosBookingId, setPayosBookingId] = useState<string | null>(null);
  const [payosModalVisible, setPayosModalVisible] = useState(false);

  // AI score states
  const [aiScoreVisible, setAiScoreVisible] = useState(false);
  const [aiScoreLoading, setAiScoreLoading] = useState(false);
  const [aiScoreResult, setAiScoreResult] = useState<AIItineraryScoreResult | null>(null);
  const [aiScoreError, setAiScoreError] = useState('');

  // Notes and Budget states
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [tripNotes, setTripNotes] = useState<string[]>(trip.notes || []);
  const [tripBudget, setTripBudget] = useState(trip.budget || {
    accommodation: 0,
    food: 0,
    transport: 0,
    activities: 0
  });

  const hotelBookedCost = bookedHotel && checkInDate && checkOutDate ?
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24) || 1) * bookedHotel.pricePerNight : undefined;

  const handleSaveNotes = async (newNotes: string[]) => {
    setNotesModalVisible(false);
    try {
      await tripService.updateTrip(trip._id, { notes: newNotes });
      setTripNotes(newNotes);
      showToast('Đã lưu ghi chú thành công!');
    } catch (e) {
      showToast('Lỗi khi lưu ghi chú');
    }
  };

  const handleSaveBudget = async (newBudget: any) => {
    setBudgetModalVisible(false);
    try {
      await tripService.updateTrip(trip._id, { budget: newBudget });
      setTripBudget(newBudget);
      showToast('Đã lưu ngân sách thành công!');
    } catch (e) {
      showToast('Lỗi khi lưu ngân sách');
    }
  };
  const [pendingTripUpdate, setPendingTripUpdate] = useState<any>(null);

  // Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'priceAsc' | 'priceDesc' | 'nameAsc' | 'none'>('none');

  const [salesStats, setSalesStats] = useState<{ totalSales: number; totalRevenue: number } | null>(null);

  useEffect(() => {
    if (trip.isForSale) {
      tripService.getTripSalesStats(trip._id).then(res => {
        if (res && res.success) {
          setSalesStats({ totalSales: res.totalSales, totalRevenue: res.totalRevenue });
        }
      });
    }
  }, [trip.isForSale, trip._id]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await tripService.getDestinations(trip._id);
        setDestinations(data);
      } catch (e) {
        console.error('Error fetching destinations:', e);
      } finally {
        setLoadingDest(false);
      }
    };
    fetch();
  }, [trip._id]);

  // Initialize from trip prop if accommodation exists
  useEffect(() => {
    if (trip?.accommodation && !bookedHotel) {
      const acc = trip.accommodation;
      const checkIn = new Date(acc.checkIn);
      const checkOut = new Date(acc.checkOut);
      const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      
      setBookedHotel({
        id: acc.hotelId,
        hotelId: acc.hotelId,
        name: acc.hotelName,
        primaryImage: acc.hotelImage || '',
        pricePerNight: acc.totalPrice / nights, // Fix: divide by nights to get per-night price
        address: { fullAddress: '' },
        starRating: 4,
        rating: 0,
        reviewCount: 0,
        images: acc.hotelImage ? [acc.hotelImage] : [],
        rooms: [],
        latitude: '0',
        longitude: '0',
      } as any);
      setCheckInDate(checkIn);
      setCheckOutDate(checkOut);
      setBookedRoomTypeId(acc.roomTypeId || null);
    }
  }, [trip]);

  const loadUserProfile = async () => {
    const userId = await AsyncStorage.getItem('userId');
    if (userId) {
      const profile = await userService.getMyProfile(userId);
      setCurrentUser(profile);
    }
  };

  const fetchHotels = useCallback(async () => {
    setLoadingHotels(true);
    try {
      const data = await accommodationService.getAll(trip.destination || trip.province || '');
      setHotels(data);
    } catch (e) {
      console.error('Error fetching hotels:', e);
    } finally {
      setLoadingHotels(false);
    }
  }, [trip.destination, trip.province]);

  useEffect(() => {
    fetchHotels();
    loadUserProfile();
  }, [fetchHotels]);

  useEffect(() => {
    const loadCachedAiScore = async () => {
      try {
        const cached = await AsyncStorage.getItem(`ai_score_${trip._id}`);
        if (cached) {
          setAiScoreResult(JSON.parse(cached));
        }
      } catch (e) {
        console.error('Error loading cached AI score:', e);
      }
    };
    if (trip._id) {
      loadCachedAiScore();
    }
  }, [trip._id]);

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  // Accommodation handlers
  const openHotelModal = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHotelModalVisible(true);
  }, []);

  const handleSelectHotel = (hotel: Accommodation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedHotel(hotel);
    // Keep hotelModalVisible open — detail opens on top
    setDetailVisible(true);
  };

  const handleBookFromDetail = (hotel: Accommodation, room: IRoomType) => {
    setSelectedHotel(hotel);
    setSelectedRoom(room);
    setDetailVisible(false);
    // Calendar opens on top of hotel list modal
    setTimeout(() => setCalendarVisible(true), 300);
  };

  const showToast = (msg: string, isError = false) => {
    Toast.show({
      type: isError ? 'error' : 'success',
      text1: isError ? 'Lỗi' : 'Thành công',
      text2: msg,
    });
  };

  const handleWriteReview = (hotel: Accommodation) => {
    setSelectedHotel(hotel);
    setDetailVisible(false);
    setTimeout(() => setReviewVisible(true), 300);
  };

  const openAiScoreModal = async () => {
    setAiScoreVisible(true);
    if (!aiScoreResult) {
      await runAiScore();
    }
  };

  const runAiScore = async () => {
    try {
      setAiScoreLoading(true);
      setAiScoreError('');
      const result = await aiService.scoreItinerary(trip, days);
      if (!result) {
        setAiScoreError('AI chưa chấm điểm được lịch trình này. Bạn thử lại sau nhé.');
        return;
      }
      setAiScoreResult(result);
      await AsyncStorage.setItem(`ai_score_${trip._id}`, JSON.stringify(result));
    } catch {
      setAiScoreError('Không thể kết nối AI để chấm điểm lịch trình.');
    } finally {
      setAiScoreLoading(false);
    }
  };

  const openTripReviewModal = async () => {
    const myReview = await tripService.getMyItineraryReview(trip._id);
    if (myReview?.success && myReview.data) {
      setTripReviewRating(myReview.data.rating || 0);
      setTripReviewComment(myReview.data.comment || '');
      setHasExistingTripReview(true);
    } else {
      setTripReviewRating(0);
      setTripReviewComment('');
      setHasExistingTripReview(false);
    }
    setTripReviewVisible(true);
  };

  const handleDeleteTripReview = async () => {
    try {
      Alert.alert(
        'Xác nhận',
        'Bạn có chắc chắn muốn xóa đánh giá này?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              setSubmittingTripReview(true);
              const res = await tripService.deleteItineraryReview(trip._id);
              if (res?.success) {
                showToast('Đã xóa đánh giá');
                setTripReviewVisible(false);
                setTripReviewRating(0);
                setTripReviewComment('');
                setHasExistingTripReview(false);
                await onRefresh?.();
              } else {
                showToast(res?.message || 'Không thể xóa đánh giá', true);
              }
              setSubmittingTripReview(false);
            },
          },
        ]
      );
    } catch (error) {
      setSubmittingTripReview(false);
      showToast('Lỗi khi xóa đánh giá', true);
    }
  };

  const submitTripReview = async () => {
    if (tripReviewRating < 1 || tripReviewRating > 10) {
      showToast('Vui lòng chọn số sao đánh giá.', true);
      return;
    }

    if (!tripReviewComment.trim()) {
      showToast('Vui lòng nhập nội dung feedback.', true);
      return;
    }

    try {
      setSubmittingTripReview(true);
      const result = await tripService.submitItineraryReview(trip._id, {
        rating: tripReviewRating,
        comment: tripReviewComment.trim()
      });

      if (result?.success) {
        setTripReviewVisible(false);
        showToast('Đã gửi feedback cho lịch trình thành công!');
        await onRefresh?.();
        return;
      }

      showToast(result?.message || 'Không thể gửi feedback.', true);
    } catch {
      showToast('Không thể gửi feedback.', true);
    } finally {
      setSubmittingTripReview(false);
    }
  };

  const { confirm, alert, confirmDelete } = useConfirm();

  const handleDateConfirm = async (checkIn: Date, checkOut: Date) => {
    if (!selectedHotel) return;

    setCalendarVisible(false);
    setHotelModalVisible(false);

    // Xác định xem có phải đang edit booking hiện tại không
    const isEditing = !!(
      bookedHotel &&
      (bookedHotel.hotelId === selectedHotel.hotelId || bookedHotel.id === selectedHotel.id)
    );

    // Nếu không thay đổi ngày so với ban đầu thì không làm gì
    if (
      isEditing &&
      checkInDate &&
      checkOutDate &&
      checkIn.getTime() === checkInDate.getTime() &&
      checkOut.getTime() === checkOutDate.getTime()
    ) {
      return;
    }

    const originalNights =
      isEditing && checkInDate && checkOutDate
        ? Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const originalPrice = isEditing ? trip.accommodation?.totalPrice || 0 : 0;

    const currentRoomTypeId =
      selectedRoom?.roomTypeId || bookedRoomTypeId || trip.accommodation?.roomTypeId || 'default';

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const pricePerNight =
      selectedRoom?.basePrice ||
      selectedRoom?.price ||
      selectedHotel.pricePerNight ||
      (isEditing ? (originalNights > 0 ? originalPrice / originalNights : 0) : 0);
    const newTotalPrice = pricePerNight * (nights || 1);

    let priceDifference = newTotalPrice;
    if (isEditing) {
      priceDifference = newTotalPrice - originalPrice;
    }

    if (isEditing && priceDifference > 0) {
      const isConfirmed = await confirm(
        'Thanh toán phụ phí',
        `Bạn đã thêm ngày ở. Số tiền cần thanh toán thêm là ${formatCurrency(
          priceDifference,
        )}.\nBạn có muốn thanh toán để cập nhật?`,
        'Thanh toán ngay',
        'info',
      );
      if (!isConfirmed) return; // Hủy ngang, giữ nguyên thông tin ban đầu
    } else if (isEditing && priceDifference <= 0) {
      const isConfirmed = await confirm(
        'Xác nhận thay đổi',
        `Bạn đang thay đổi ngày ở (không phát sinh thêm phí). Tiếp tục?`,
        'Cập nhật',
        'info',
      );
      if (!isConfirmed) return;
    } else {
      // Đặt phòng mới (không phải edit)
      const isConfirmed = await confirm(
        'Xác nhận thanh toán',
        `Bạn đang đặt phòng với tổng số tiền là ${formatCurrency(
          newTotalPrice,
        )}.\nBạn có đồng ý thanh toán từ ví để hoàn tất đặt phòng?`,
        'Thanh toán ngay',
        'info',
      );
      if (!isConfirmed) return;
    }

    try {
      // Bật trạng thái chờ
      setIsUpdating(true);

      // 1. Thực hiện thanh toán (chỉ tạo booking mới nếu không phải edit, hoặc nếu có payment API thì gọi ở đây)
      // 1. Thực hiện thanh toán
      if (!isEditing) {
        // ĐẶT PHÒNG MỚI: Gọi API tạo booking + thanh toán toàn bộ
        const bookingResult = await bookingService.createBookingWithPayment({
          hotelId: selectedHotel.hotelId || selectedHotel.id || '',
          roomTypeId: currentRoomTypeId,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          roomCount: 1,
          guestInfo: {
            fullName: currentUser?.displayName || 'Khách hàng OwnTrip',
            phone: currentUser?.phone || '0900000000',
            email: currentUser?.email || 'guest@owntrip.vn',
          },
          paymentMethod: 'credit_card',
        });

        if (bookingResult.success) {
          if (bookingResult.data?.checkoutUrl) {
            setPendingTripUpdate({
              isEditing: false,
              priceDifference: 0,
              newTotalPrice: bookingResult.data.totalPrice || newTotalPrice,
              checkIn,
              checkOut,
              currentRoomTypeId,
              selectedHotel
            });
            setPayosCheckoutUrl(bookingResult.data.checkoutUrl);
            setPayosBookingId(bookingResult.data.bookingId);
            setPayosModalVisible(true);
            setIsUpdating(false);
            return;
          } else {
            // Thanh toán bằng số dư thành công
            const actualTotalPrice = bookingResult.data?.totalPrice || newTotalPrice;
            await executeTripUpdate(checkIn, checkOut, actualTotalPrice, currentRoomTypeId, selectedHotel, false, 0, bookingResult.message);
            return;
          }
        } else {
          await alert('Lỗi thanh toán', bookingResult.message || 'Không thể tạo đơn đặt phòng', 'error');
          setIsUpdating(false);
          return;
        }
      } else if (priceDifference > 0) {
        // GIA HẠN PHÒNG (EDIT): Chỉ thanh toán số tiền chênh lệch (priceDifference)
        const tempId = `temp_${Date.now()}`;
        const paymentResult = await paymentService.createPaymentLink({
          bookingId: tempId,
          amount: priceDifference,
          description: `Phu phi gia han phong`.slice(0, 25),
          hotelId: selectedHotel.hotelId || selectedHotel.id || '',
        });

        if (paymentResult.success && paymentResult.data?.checkoutUrl) {
          setPendingTripUpdate({
            isEditing: true,
            priceDifference,
            newTotalPrice,
            checkIn,
            checkOut,
            currentRoomTypeId,
            selectedHotel,
          });
          setPayosCheckoutUrl(paymentResult.data.checkoutUrl);
          setPayosBookingId(tempId); // Dùng tempId để polling status
          setPayosModalVisible(true);
          setIsUpdating(false);
          return;
        } else {
          showToast(paymentResult.message || 'Không thể tạo link thanh toán phụ phí');
          setIsUpdating(false);
          return;
        }
      }

      await executeTripUpdate(
        checkIn,
        checkOut,
        newTotalPrice,
        currentRoomTypeId,
        selectedHotel,
        isEditing,
        priceDifference,
      );
    } catch (error) {
      console.error('Error during booking:', error);
      showToast('Đã xảy ra lỗi hệ thống.');
      setIsUpdating(false);
    }
  };

  const executeTripUpdate = async (checkIn: Date, checkOut: Date, newTotalPrice: number, currentRoomTypeId: string, sHotel: Accommodation, isEditing: boolean, priceDifference: number, customMessage?: string) => {
    try {
      setIsUpdating(true);
      // 2. Lưu vào lịch trình chuyến đi (Update Trip)
      const updatedTrip = await tripService.updateTrip(trip._id, {
        accommodation: {
          hotelId: sHotel.id || sHotel.hotelId,
          hotelName: sHotel.name,
          hotelImage: sHotel.primaryImage || (sHotel.images ? sHotel.images[0] : ''),
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          totalPrice: newTotalPrice,
          roomTypeId: currentRoomTypeId,
        },
      });

      if (updatedTrip) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Hiện Toast thông báo
        if (customMessage) {
          showToast(customMessage);
        } else if (isEditing && priceDifference > 0) {
          showToast(`Thanh toán thành công ${formatCurrency(priceDifference)}!`);
        } else if (isEditing) {
          showToast('Cập nhật ngày ở thành công!');
        } else {
          showToast(`Thanh toán thành công ${formatCurrency(newTotalPrice)}!`);
        }

        // Cập nhật state ngay lập tức từ dữ liệu Server trả về
        const actualNights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        setBookedHotel({ ...sHotel, pricePerNight: newTotalPrice / actualNights });
        setCheckInDate(checkIn);
        setCheckOutDate(checkOut);
        if (currentRoomTypeId && currentRoomTypeId !== 'default') {
          setBookedRoomTypeId(currentRoomTypeId);
        }
        setSelectedHotel(null);
        setSelectedRoom(null);
        
        // Cập nhật lại ngân sách chỗ ở nếu có
        const updatedBudget = { ...tripBudget, accommodation: newTotalPrice };
        setTripBudget(updatedBudget);
        tripService.updateTrip(trip._id, { budget: updatedBudget }).catch(() => {});
      }
    } catch (error) {
      console.error('Error saving accommodation:', error);
      showToast('Không thể hoàn tất đặt phòng. Vui lòng thử lại.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePayOSSuccess = async (bookingId: string) => {
    setPayosModalVisible(false);
    if (pendingTripUpdate) {
      await executeTripUpdate(
        pendingTripUpdate.checkIn,
        pendingTripUpdate.checkOut,
        pendingTripUpdate.newTotalPrice,
        pendingTripUpdate.currentRoomTypeId,
        pendingTripUpdate.selectedHotel,
        pendingTripUpdate.isEditing,
        pendingTripUpdate.priceDifference,
      );
      setPendingTripUpdate(null);
    }
  };

  const handlePayOSCancel = async () => {
    setPayosModalVisible(false);
    setPendingTripUpdate(null);
    showToast('Bạn đã hủy thanh toán.');
  };

  const [viewingBooked, setViewingBooked] = useState(false);

  const handleRemoveAccommodation = async () => {
    const confirmed = await confirmDelete(
      'Xóa Chỗ ở',
      `Xóa "${bookedHotel?.name}" khỏi chuyến đi này?`,
      'Xóa',
    );
    if (confirmed) {
      try {
        // Clear from Backend
        await tripService.updateTrip(trip._id, {
          accommodation: null as any,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBookedHotel(null);
        setCheckInDate(null);
        setCheckOutDate(null);
        setBookedRoomTypeId(null);
      } catch (error) {
        console.error('Error removing accommodation:', error);
      }
    }
  };

  // Open booked hotel detail for viewing
  const handleViewBookedHotel = async () => {
    if (!bookedHotel) return;
    
    const hotelIdToFetch = bookedHotel.id || (bookedHotel as any).hotelId;
    if (!hotelIdToFetch) {
      alert('Lỗi dữ liệu: Không tìm thấy ID khách sạn đã đặt. Vui lòng thử xóa và đặt lại chỗ ở.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Tải dữ liệu thật từ Server, kèm theo ngày đã đặt
      const fullHotel = await accommodationService.getById(
        hotelIdToFetch,
        checkInDate?.toISOString(),
        checkOutDate?.toISOString(),
      );
      if (fullHotel) {
        setSelectedHotel(fullHotel);
      } else {
        setSelectedHotel(bookedHotel);
      }
    } catch (error) {
      console.error('Error fetching full hotel detail:', error);
      setSelectedHotel(bookedHotel);
    }

    setViewingBooked(true);
    setDetailVisible(true);
  };

  // Cancel booking from detail modal
  const handleCancelBookingFromDetail = async () => {
    const confirmed = await confirmDelete(
      'Hủy đặt phòng',
      `Bạn có chắc muốn hủy đặt phòng "${bookedHotel?.name}" không?`,
      'Hủy phòng',
    );
    if (confirmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDetailVisible(false);
      setBookedHotel(null);
      setCheckInDate(null);
      setCheckOutDate(null);
      setBookedRoomTypeId(null);
      setSelectedHotel(null);
      setViewingBooked(false);
    }
  };

  const formatCurrency = (amount: number) => amount.toLocaleString('vi-VN') + '₫';
  const formatShortDate = (d: Date) => {
    const months = [
      'Th1',
      'Th2',
      'Th3',
      'Th4',
      'Th5',
      'Th6',
      'Th7',
      'Th8',
      'Th9',
      'Th10',
      'Th11',
      'Th12',
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const nights =
    checkInDate && checkOutDate
      ? Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  // Group by day for display
  const groupedByDay = destinations.reduce<Record<number, Destination[]>>((acc, dest) => {
    if (!acc[dest.day]) acc[dest.day] = [];
    acc[dest.day].push(dest);
    return acc;
  }, {});

  // Running index across all days
  let placeIndex = 0;

  // Filtered and sorted hotels
  const filteredHotels = hotels
    .filter((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'priceAsc') return a.pricePerNight - b.pricePerNight;
      if (sortOrder === 'priceDesc') return b.pricePerNight - a.pricePerNight;
      if (sortOrder === 'nameAsc') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <View style={styles.container}>
      {/* ===== SALES STATS (OWNER ONLY) ===== */}
      {trip.isForSale && salesStats && (
        <View style={styles.card}>
          <SectionHeader
            icon="trending-up"
            title="Thống kê doanh thu"
          />
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Lượt bán</Text>
              <Text style={styles.statValue}>{salesStats.totalSales}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Doanh thu thực nhận</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{formatCurrency(salesStats.totalRevenue)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== AI SCORE ROW ===== */}
      {!aiScoreResult ? (
        <View style={styles.aiCompactRow}>
          <View style={styles.aiRowLeft}>
            <View style={styles.aiZapIconBg}>
              <Feather name="zap" size={14} color="#7C3AED" />
            </View>
            <Text style={styles.aiRowLabel}>Độ hợp lý lịch trình (AI)</Text>
          </View>
          <TouchableOpacity
            style={styles.aiMiniBtn}
            activeOpacity={0.8}
            onPress={openAiScoreModal}
            disabled={aiScoreLoading}
          >
            {aiScoreLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.aiMiniBtnText}>Chấm điểm</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (() => {
        let scoreBgColor = '#FEF2F2';
        let scoreTextColor = '#EF4444';
        let levelShortText = 'Cần sửa';

        if (aiScoreResult.level === 'good') {
          scoreBgColor = '#ECFDF5';
          scoreTextColor = '#10B981';
          levelShortText = 'Tốt';
        } else if (aiScoreResult.level === 'too_busy') {
          scoreBgColor = '#FFFBEB';
          scoreTextColor = '#F59E0B';
          levelShortText = 'Dày';
        } else if (aiScoreResult.score >= 70) {
          scoreBgColor = '#EFF6FF';
          scoreTextColor = '#3B82F6';
          levelShortText = 'Ổn';
        }

        return (
          <TouchableOpacity
            style={styles.aiCompactRow}
            activeOpacity={0.7}
            onPress={openAiScoreModal}
          >
            <View style={styles.aiRowLeft}>
              <View style={styles.aiZapIconBg}>
                <Feather name="zap" size={14} color="#7C3AED" />
              </View>
              <Text style={styles.aiRowLabel}>Điểm lịch trình AI</Text>
            </View>
            <View style={[styles.aiScoreBadge, { backgroundColor: scoreBgColor }]}>
              <Text style={[styles.aiScoreBadgeText, { color: scoreTextColor }]}>
                {Math.round(aiScoreResult.score)}/100 • {levelShortText}
              </Text>
              <Feather name="chevron-right" size={12} color={scoreTextColor} style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>
        );
      })()}

      {trip.isPurchasedClone && (
        <View style={styles.card}>
          <SectionHeader icon="message-square" title="Feedback lịch trình đã mua" />
          <Text style={styles.feedbackHint}>
            Chia sẻ cảm nhận của bạn để giúp Creator cải thiện chất lượng lịch trình.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { marginTop: 10 }]}
            activeOpacity={0.8}
            onPress={openTripReviewModal}
          >
            <Feather name="edit-3" size={14} color="#FFF" />
            <Text style={styles.actionBtnText}>Đánh giá lịch trình này</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ===== 1. ACCOMMODATION ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="home"
          title="Chỗ ở"
          right={
            bookedHotel ? (
              <TouchableOpacity
                onPress={() => {
                  setSelectedHotel(bookedHotel as any);
                  setCalendarVisible(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="edit-3" size={16} color={BRAND} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        {bookedHotel && checkInDate && checkOutDate ? (
          <>
            <TouchableOpacity
              style={styles.bookedCard}
              activeOpacity={0.7}
              onPress={handleViewBookedHotel}
            >
            {bookedHotel.primaryImage && !imgErrors[`hotel-${bookedHotel.hotelId}`] ? (
              <Image
                source={{ uri: bookedHotel.primaryImage }}
                style={styles.bookedImage}
                onError={() => handleImageError(`hotel-${bookedHotel.hotelId}`)}
              />
            ) : (
              <View style={[styles.bookedImage, styles.bookedImagePlaceholder]}>
                <Feather name="home" size={24} color="#D1D5DB" />
              </View>
            )}
            <View style={styles.bookedInfo}>
              <Text style={styles.bookedName} numberOfLines={1}>
                {bookedHotel.name}
              </Text>
              <View style={styles.bookedDates}>
                <Feather name="calendar" size={12} color="#9CA3AF" />
                <Text style={styles.bookedDateText}>
                  {formatShortDate(checkInDate)} → {formatShortDate(checkOutDate)}
                </Text>
              </View>
              <View style={styles.bookedBottom}>
                <Text style={styles.bookedNights}>{nights} đêm</Text>
                <Text style={styles.bookedTotal}>
                  {formatCurrency(nights * bookedHotel.pricePerNight)}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#D1D5DB" />
          </TouchableOpacity>

          {getTripStatus(trip.startDate, trip.endDate) === 'Đã hoàn thành' && (
            <TouchableOpacity
              style={[styles.actionBtn, { marginTop: 12, backgroundColor: BRAND_LIGHT }]}
              activeOpacity={0.7}
              onPress={() => handleWriteReview(bookedHotel)}
            >
              <Feather name="edit-3" size={14} color={BRAND} />
              <Text style={[styles.actionBtnText, { color: BRAND }]}>Đánh giá chỗ ở này</Text>
            </TouchableOpacity>
          )}
        </>
        ) : (
          /* Empty state */
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="home" size={24} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa chọn chỗ ở</Text>
            <Text style={styles.emptyHint}>Thêm khách sạn, resort hoặc homestay</Text>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={openHotelModal}>
              <Feather name="plus" size={14} color="#FFF" />
              <Text style={styles.actionBtnText}>Thêm chỗ ở</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ===== 2. PLACES TO VISIT ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="map-pin"
          title="Địa điểm tham quan"
          right={
            <Text style={styles.countText}>
              {loadingDest ? '...' : `${destinations.length} điểm`}
            </Text>
          }
        />

        {loadingDest ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={BRAND} />
          </View>
        ) : destinations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="compass" size={24} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có địa điểm</Text>
            <Text style={styles.emptyHint}>Khám phá và thêm những điểm đến tuyệt vời</Text>
          </View>
        ) : (
          <View>
            {Object.keys(groupedByDay)
              .sort((a, b) => Number(a) - Number(b))
              .map((dayNum, groupIdx) => {
                const dayDests = groupedByDay[Number(dayNum)];
                const dayDate = dayDests[0]?.date;

                return (
                  <View key={dayNum}>
                    {/* Day header divider */}
                    {Object.keys(groupedByDay).length > 1 && (
                      <View style={[styles.dayDivider, groupIdx === 0 && { marginTop: 0 }]}>
                        <Text style={styles.dayLabel}>Ngày {dayNum}</Text>
                        {dayDate && <Text style={styles.dayDate}>{formatDayShort(dayDate)}</Text>}
                      </View>
                    )}

                    {dayDests
                      .sort((a, b) => a.place.order - b.place.order)
                      .map((dest, idx) => {
                        placeIndex++;
                        const hasPhoto = dest.place.photo && !imgErrors[dest.place._id];

                        return (
                          <TouchableOpacity
                            key={dest.place._id}
                            style={styles.placeRow}
                            activeOpacity={0.7}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              if (dest.place.mapUrl) Linking.openURL(dest.place.mapUrl);
                            }}
                          >
                            {/* Blue numbered circle (like reference) */}
                            <View style={styles.placeNum}>
                              <Text style={styles.placeNumText}>{placeIndex}</Text>
                            </View>

                            {/* Place info */}
                            <View style={styles.placeContent}>
                              <Text style={styles.placeName} numberOfLines={1}>
                                {dest.place.name}
                              </Text>
                              {dest.place.address ? (
                                <Text style={styles.placeAddr} numberOfLines={1}>
                                  {dest.place.address}
                                </Text>
                              ) : null}
                            </View>

                            {/* Right side: rating or photo thumbnail */}
                            {hasPhoto ? (
                              <Image
                                source={{ uri: dest.place.photo }}
                                style={styles.placeThumb}
                                onError={() => handleImageError(dest.place._id)}
                              />
                            ) : dest.place.rating ? (
                              <View style={styles.ratingPill}>
                                <Feather name="star" size={10} color="#F59E0B" />
                                <Text style={styles.ratingText}>{dest.place.rating}</Text>
                              </View>
                            ) : (
                              <Feather name="chevron-right" size={16} color="#D1D5DB" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                );
              })}
          </View>
        )}
      </View>

      {/* ===== 3. NOTES ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="file-text"
          title="Ghi chú"
          right={
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotesModalVisible(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="plus" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          }
        />

        <View style={styles.notesList}>
          {tripNotes.length > 0 ? (
            tripNotes.map((line, i) => (
              <View key={i} style={styles.noteItem}>
                <Text style={styles.noteText}>{line}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="file-text" size={24} color="#D1D5DB" />
              <Text style={styles.emptyHint}>Chưa có ghi chú nào</Text>
            </View>
          )}
        </View>
      </View>

      {/* ===== 4. BUDGET ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="credit-card"
          title="Ngân sách"
          right={
            ((tripBudget.accommodation || 0) + (tripBudget.food || 0) + (tripBudget.transport || 0) + (tripBudget.activities || 0)) > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBudgetModalVisible(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={styles.budgetTotal}>{formatCurrency((tripBudget.accommodation || 0) + (tripBudget.food || 0) + (tripBudget.transport || 0) + (tripBudget.activities || 0))}</Text>
                <Feather name="edit-3" size={14} color={BRAND} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        {((tripBudget.accommodation || 0) + (tripBudget.food || 0) + (tripBudget.transport || 0) + (tripBudget.activities || 0)) > 0 ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => setBudgetModalVisible(true)}>
            <View style={styles.budgetRows}>
              <BudgetRow
                label="Chỗ ở"
                amount={tripBudget.accommodation || 0}
                total={(tripBudget.accommodation || 0) + (tripBudget.food || 0) + (tripBudget.transport || 0) + (tripBudget.activities || 0)}
              />
              <BudgetRow
                label="Ăn uống"
                amount={tripBudget.food || 0}
                total={(tripBudget.accommodation || 0) + (tripBudget.food || 0) + (tripBudget.transport || 0) + (tripBudget.activities || 0)}
              />
              <BudgetRow
                label="Di chuyển"
                amount={tripBudget.transport || 0}
                total={(tripBudget.accommodation || 0) + (tripBudget.food || 0) + (tripBudget.transport || 0) + (tripBudget.activities || 0)}
              />
              <BudgetRow
                label="Hoạt động"
                amount={tripBudget.activities || 0}
                total={(tripBudget.accommodation || 0) + (tripBudget.food || 0) + (tripBudget.transport || 0) + (tripBudget.activities || 0)}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="credit-card" size={24} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa lập ngân sách</Text>
            <Text style={styles.emptyHint}>Lên kế hoạch chi phí cho chuyến đi</Text>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setBudgetModalVisible(true);
              }}
            >
              <Feather name="plus" size={14} color="#FFF" />
              <Text style={styles.actionBtnText}>Lập ngân sách</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ===== 5. REVIEWS ===== */}
      <View style={[styles.card, { marginTop: 16, marginBottom: 24 }]}>
        <SectionHeader
          icon="star"
          title="Đánh giá từ cộng đồng"
        />
        <View style={{ marginTop: 12 }}>
          {reviews && reviews.length > 0 ? (
            reviews.map((r: any) => {
              const id = r._id || r.reviewId;
              const userName = r.userId?.displayName || 'Thành viên OwnTrip';
              const rating = r.rating ? (r.rating / 2) : 5;
              const content = r.comment || '';
              const date = new Date(r.createdAt).toLocaleDateString('vi-VN');
              const userAvatar = r.userId?.image || 'https://i.pravatar.cc/150?u=' + id;

              return (
                <View key={id} style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Image source={{ uri: userAvatar }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#E5E7EB' }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>{userName}</Text>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{date}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Feather name="star" size={10} color="#FFF" fill="#FFF" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF', marginLeft: 4 }}>{rating}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20 }}>{content}</Text>
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Feather name="message-square" size={32} color="#D1D5DB" />
              <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>Chưa có đánh giá nào</Text>
            </View>
          )}
        </View>
      </View>

      {/* ===== HOTEL LIST MODAL ===== */}
      <Modal visible={hotelModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHandleBar}>
            <View style={styles.modalHandle} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn chỗ ở</Text>
            <TouchableOpacity onPress={() => setHotelModalVisible(false)}>
              <Feather name="x" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View style={styles.filterContainer}>
            <View style={styles.searchBar}>
              <Feather name="search" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo tên..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={[styles.sortBtn, sortOrder === 'priceAsc' && styles.sortBtnActive]}
                onPress={() => setSortOrder(sortOrder === 'priceAsc' ? 'none' : 'priceAsc')}
              >
                <Feather
                  name="trending-up"
                  size={14}
                  color={sortOrder === 'priceAsc' ? BRAND : '#6B7280'}
                />
                <Text
                  style={[styles.sortBtnText, sortOrder === 'priceAsc' && styles.sortBtnTextActive]}
                >
                  Giá thấp
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortBtn, sortOrder === 'priceDesc' && styles.sortBtnActive]}
                onPress={() => setSortOrder(sortOrder === 'priceDesc' ? 'none' : 'priceDesc')}
              >
                <Feather
                  name="trending-down"
                  size={14}
                  color={sortOrder === 'priceDesc' ? BRAND : '#6B7280'}
                />
                <Text
                  style={[
                    styles.sortBtnText,
                    sortOrder === 'priceDesc' && styles.sortBtnTextActive,
                  ]}
                >
                  Giá cao
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortBtn, sortOrder === 'nameAsc' && styles.sortBtnActive]}
                onPress={() => setSortOrder(sortOrder === 'nameAsc' ? 'none' : 'nameAsc')}
              >
                <Feather
                  name="type"
                  size={14}
                  color={sortOrder === 'nameAsc' ? BRAND : '#6B7280'}
                />
                <Text
                  style={[styles.sortBtnText, sortOrder === 'nameAsc' && styles.sortBtnTextActive]}
                >
                  Tên A-Z
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {loadingHotels ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={BRAND} />
              <Text style={styles.modalLoadingText}>Đang tìm khách sạn...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredHotels}
              keyExtractor={(item) => item.hotelId}
              contentContainerStyle={styles.hotelList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const hasImg = item.primaryImage && !imgErrors[`modal-${item.hotelId}`];
                const chips = item.amenities?.slice(0, 3) ?? [];
                const extra = (item.amenities?.length ?? 0) - 3;
                return (
                  <TouchableOpacity
                    style={styles.hotelCard}
                    activeOpacity={0.85}
                    onPress={() => handleSelectHotel(item)}
                  >
                    <View style={styles.hotelImageWrap}>
                      {hasImg ? (
                        <Image
                          source={{ uri: item.primaryImage }}
                          style={styles.hotelImage}
                          onError={() => handleImageError(`modal-${item.hotelId}`)}
                        />
                      ) : (
                        <View style={[styles.hotelImage, styles.hotelImagePlaceholder]}>
                          <Feather name="image" size={28} color="#D1D5DB" />
                        </View>
                      )}
                      {item.rating > 0 && (
                        <View style={styles.hotelRatingBadge}>
                          <Feather name="star" size={11} color="#FFF" />
                          <Text style={styles.hotelRatingVal}>{item.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.hotelInfo}>
                      <Text style={styles.hotelName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.hotelAddrRow}>
                        <Feather name="map-pin" size={11} color="#9CA3AF" />
                        <Text style={styles.hotelAddr} numberOfLines={1}>
                          {item.address?.fullAddress || ''}
                        </Text>
                      </View>
                      {chips.length > 0 && (
                        <View style={styles.hotelChips}>
                          {chips.map((a, i) => (
                            <View key={i} style={styles.hotelChip}>
                              <Text style={styles.hotelChipText}>{a}</Text>
                            </View>
                          ))}
                          {extra > 0 && <Text style={styles.hotelChipMore}>+{extra}</Text>}
                        </View>
                      )}
                      <Text style={styles.hotelPrice}>
                        {formatCurrency(item.pricePerNight)}
                        <Text style={styles.hotelPriceUnit}>/đêm</Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.modalLoading}>
                  <Feather name="home" size={44} color="#D1D5DB" />
                  <Text style={styles.modalLoadingText}>Không tìm thấy chỗ ở nào</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* ===== DETAIL MODAL ===== */}
      <AccommodationDetailModal
        visible={detailVisible}
        hotel={selectedHotel}
        trip={trip}
        days={days}
        onClose={() => {
          setDetailVisible(false);
          setSelectedHotel(null);
          setViewingBooked(false);
        }}
        onBook={handleBookFromDetail}
        onWriteReview={handleWriteReview}
        isBooked={viewingBooked}
        onCancelBooking={handleCancelBookingFromDetail}
      />

      {/* ===== WRITE REVIEW MODAL ===== */}
      <WriteReviewModal
        visible={reviewVisible}
        hotel={selectedHotel}
        onClose={() => setReviewVisible(false)}
        onReviewSubmitted={() => {
          if (selectedHotel) setDetailVisible(true);
        }}
      />

      <Modal
        visible={tripReviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTripReviewVisible(false)}
      >
        <View style={styles.tripReviewOverlay}>
          <View style={styles.tripReviewCard}>
            <Text style={styles.tripReviewTitle}>Feedback lịch trình</Text>
            <Text style={styles.tripReviewSubtitle}>Đánh giá của bạn</Text>

            <View style={styles.tripScoreRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  style={{ padding: 4, marginHorizontal: 4 }}
                  onPress={() => setTripReviewRating(star * 2)}
                  activeOpacity={0.7}
                >
                  <FontAwesome
                    name={
                      tripReviewRating >= star * 2
                        ? 'star'
                        : tripReviewRating >= star * 2 - 1
                        ? 'star-half-o'
                        : 'star-o'
                    }
                    size={40}
                    color={tripReviewRating >= star * 2 - 1 ? '#F59E0B' : '#E5E7EB'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.tripReviewInput}
              value={tripReviewComment}
              onChangeText={setTripReviewComment}
              multiline
              numberOfLines={4}
              maxLength={400}
              placeholder="Viết cảm nhận của bạn về lịch trình..."
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.tripReviewActions}>
              {hasExistingTripReview && (
                <TouchableOpacity
                  style={[styles.tripReviewCancelBtn, { backgroundColor: '#FEE2E2', borderColor: '#FEE2E2', marginRight: 8 }]}
                  onPress={handleDeleteTripReview}
                  disabled={submittingTripReview}
                >
                  <Text style={[styles.tripReviewCancelText, { color: '#EF4444' }]}>Xóa</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.tripReviewCancelBtn}
                onPress={() => setTripReviewVisible(false)}
                disabled={submittingTripReview}
              >
                <Text style={styles.tripReviewCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tripReviewSubmitBtn}
                onPress={submitTripReview}
                disabled={submittingTripReview}
              >
                {submittingTripReview ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.tripReviewSubmitText}>{hasExistingTripReview ? 'Lưu cập nhật' : 'Gửi feedback'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== CALENDAR MODAL ===== */}
      {selectedHotel && (
        <StayDatePickerModal
          visible={calendarVisible}
          onClose={() => {
            setCalendarVisible(false);
            setSelectedHotel(null);
            setSelectedRoom(null);
          }}
          hotelName={selectedHotel.name}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          onConfirm={handleDateConfirm}
          initialCheckIn={checkInDate}
          initialCheckOut={checkOutDate}
        />
      )}

      {/* ===== CALENDAR MODAL ===== */}

      {/* ===== NOTES & BUDGET MODALS ===== */}
      <NotesModal
        visible={notesModalVisible}
        initialNotes={tripNotes}
        onClose={() => setNotesModalVisible(false)}
        onSave={handleSaveNotes}
      />
      <BudgetModal
        visible={budgetModalVisible}
        initialBudget={tripBudget}
        hotelBookedCost={hotelBookedCost}
        onClose={() => setBudgetModalVisible(false)}
        onSave={handleSaveBudget}
      />

      {/* ===== LOADING OVERLAY ===== */}
      {isUpdating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={styles.loadingText}>Đang xử lý giao dịch...</Text>
          </View>
        </View>
      )}

      {/* ===== PAYOS WEBVIEW MODAL ===== */}
      <PayOSWebViewModal
        visible={payosModalVisible}
        checkoutUrl={payosCheckoutUrl}
        bookingId={payosBookingId}
        title="Thanh toán"
        onPaymentSuccess={handlePayOSSuccess}
        onPaymentCancel={handlePayOSCancel}
      />

      <AiScoreModal
        visible={aiScoreVisible}
        onClose={() => setAiScoreVisible(false)}
        aiScoreResult={aiScoreResult}
        onReScore={runAiScore}
        aiScoreLoading={aiScoreLoading}
      />
    </View>
  );
}

// ===== BUDGET ROW =====
function BudgetRow({ label, amount, total }: { label: string; amount: number; total: number }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetRowHeader}>
        <Text style={styles.budgetLabel}>{label}</Text>
        <Text style={styles.budgetValue}>{amount.toLocaleString('vi-VN')}₫</Text>
      </View>
      <View style={styles.budgetBarBg}>
        <View style={[styles.budgetBarFill, { width: `${Math.max(pct, 2)}%` }]} />
      </View>
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 40, padding: 16, gap: 12 },

  // Card — clean white card like reference
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },

  // Section Header with icon box
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  countText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },

  // Loading
  loadingBox: { paddingVertical: 20, alignItems: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  emptyHint: { fontSize: 13, color: '#9CA3AF', marginBottom: 16, textAlign: 'center' },

  // Stats Card
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // Action button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  // Places list — like reference: numbered circles + name
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  placeNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeNumText: { fontSize: 14, fontWeight: '700', color: BRAND },
  placeContent: { flex: 1, gap: 1 },
  placeName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },

  // Modal Filters
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortBtnActive: {
    backgroundColor: BRAND_LIGHT,
    borderColor: BRAND,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  sortBtnTextActive: {
    color: BRAND,
    fontWeight: '600',
  },
  placeAddr: { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },
  placeThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },

  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#D97706' },

  // Day dividers
  dayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  dayLabel: { fontSize: 12, fontWeight: '700', color: BRAND },
  dayDate: { fontSize: 11, color: '#9CA3AF' },

  // Notes — individual cards like reference
  notesList: { gap: 8 },
  noteItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noteText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  noteHintText: { fontSize: 14, color: '#9CA3AF' },

  // Budget
  budgetTotal: { fontSize: 17, fontWeight: '800', color: BRAND },
  budgetRows: { gap: 14 },
  budgetRow: { gap: 6 },
  budgetRowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  budgetValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  budgetBarBg: { height: 5, borderRadius: 3, backgroundColor: '#F3F4F6' },
  budgetBarFill: { height: 5, borderRadius: 3, backgroundColor: BRAND },

  // Booked accommodation card
  bookedCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookedImage: {
    width: 80,
    height: 80,
  },
  bookedImagePlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookedInfo: {
    flex: 1,
    padding: 10,
    gap: 4,
    justifyContent: 'center',
  },
  bookedName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  bookedDates: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookedDateText: { fontSize: 12, color: '#6B7280' },
  bookedBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  bookedNights: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },
  bookedTotal: { fontSize: 14, fontWeight: '800', color: BRAND },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHandleBar: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 80,
  },
  modalLoadingText: { fontSize: 14, color: '#9CA3AF' },

  // Hotel cards in modal
  hotelList: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  hotelCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  hotelImageWrap: { position: 'relative' },
  hotelImage: { width: '100%', height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  hotelImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotelRatingBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hotelRatingVal: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  hotelInfo: { padding: 14, paddingTop: 10, gap: 5 },
  hotelName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  hotelAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hotelAddr: { fontSize: 12, color: '#6B7280', flex: 1 },
  hotelChips: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hotelChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hotelChipText: { fontSize: 11, fontWeight: '500', color: '#6B7280' },
  hotelChipMore: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  hotelPrice: { fontSize: 17, fontWeight: '800', color: BRAND },
  hotelPriceUnit: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },

  // Toast & Loading Overlay
  toastContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // ===== TRIP REVIEW MODAL STYLES =====
  tripReviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tripReviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  tripReviewTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 6,
  },
  tripReviewSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  tripScoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  tripScoreChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tripScoreChipActive: {
    backgroundColor: BRAND_LIGHT,
    borderColor: BRAND,
  },
  tripScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  tripScoreTextActive: {
    color: BRAND,
  },
  tripReviewInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
    lineHeight: 20,
  },
  tripReviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  tripReviewCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripReviewCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  tripReviewSubmitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  tripReviewSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  feedbackHint: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  aiCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  aiRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiZapIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  aiMiniBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiMiniBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  aiScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiScoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
