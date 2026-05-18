import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const BRAND = '#4A7CFF';
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

interface StayDatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  hotelName: string;
  tripStartDate: string; // ISO string
  tripEndDate: string; // ISO string
  onConfirm: (checkIn: Date, checkOut: Date) => void;
  initialCheckIn?: Date | null;
  initialCheckOut?: Date | null;
}

// Helpers
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

export default function StayDatePickerModal({
  visible,
  onClose,
  hotelName,
  tripStartDate,
  tripEndDate,
  onConfirm,
  initialCheckIn,
  initialCheckOut,
}: StayDatePickerModalProps) {
  const tripStart = useMemo(() => stripTime(new Date(tripStartDate)), [tripStartDate]);
  const tripEnd = useMemo(() => stripTime(new Date(tripEndDate)), [tripEndDate]);

  const [currentMonth, setCurrentMonth] = useState(tripStart.getMonth());
  const [currentYear, setCurrentYear] = useState(tripStart.getFullYear());
  const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn || null);
  const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut || null);

  React.useEffect(() => {
    if (visible) {
      if (initialCheckIn) {
        setCheckIn(new Date(initialCheckIn));
        setCurrentMonth(initialCheckIn.getMonth());
        setCurrentYear(initialCheckIn.getFullYear());
      } else {
        setCheckIn(null);
        setCurrentMonth(tripStart.getMonth());
        setCurrentYear(tripStart.getFullYear());
      }
      setCheckOut(initialCheckOut ? new Date(initialCheckOut) : null);
    }
  }, [visible, initialCheckIn, initialCheckOut, tripStart]);

  const MONTHS = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const totalDays = getDaysInMonth(currentYear, currentMonth);
    const firstWeekday = getFirstWeekday(currentYear, currentMonth);
    const cells: (Date | null)[] = [];

    // Leading blanks
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(currentYear, currentMonth, d));
    }
    return cells;
  }, [currentYear, currentMonth]);

  // Navigate months
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Tap a day
  const handleDayTap = (date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!checkIn || (checkIn && checkOut)) {
      // Bắt đầu chọn ngày mới
      setCheckIn(date);
      setCheckOut(null);
    } else {
      // Đã có ngày nhận, đang chọn ngày trả
      if (sameDay(date, checkIn)) {
        // Nhấn lại ngày cũ -> Xóa chọn
        setCheckIn(null);
        setCheckOut(null);
      } else if (date < checkIn) {
        // Nhấn ngày trước ngày nhận -> Đổi ngày nhận mới
        setCheckIn(date);
      } else {
        // Nhấn ngày sau ngày nhận -> Chọn làm ngày trả
        setCheckOut(date);
      }
    }
  };

  const handleConfirm = () => {
    if (checkIn && checkOut) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onConfirm(checkIn, checkOut);
    }
  };

  const handleClose = () => {
    setCheckIn(null);
    setCheckOut(null);
    onClose();
  };

  // Mở rộng phạm vi chọn ngày: cho phép chọn trước 1 tháng và sau 6 tháng so với ngày hiện tại
  // thay vì chỉ bó buộc trong tripStart/tripEnd để người dùng linh hoạt hơn
  const isInRange = (d: Date) => {
    const now = stripTime(new Date());
    const limit = new Date(now);
    limit.setMonth(limit.getMonth() + 12); // Cho phép chọn trong vòng 1 năm tới
    return d >= now && d <= limit;
  };

  // Check if date is between checkIn and checkOut (for range highlight)
  const isBetween = (d: Date) => {
    if (!checkIn || !checkOut) return false;
    return d > checkIn && d < checkOut;
  };

  const isCheckIn = (d: Date) => (checkIn ? sameDay(d, checkIn) : false);
  const isCheckOut = (d: Date) => (checkOut ? sameDay(d, checkOut) : false);
  const isToday = (d: Date) => sameDay(d, stripTime(new Date()));

  const nights =
    checkIn && checkOut
      ? Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Handle */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          {checkIn || checkOut ? (
            <TouchableOpacity
              onPress={() => {
                setCheckIn(null);
                setCheckOut(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.clearBtn}>Xóa</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Bạn sẽ ở lại bao lâu? 📅</Text>
          <Text style={styles.subtitle}>
            Chọn ngày bạn sẽ ở lại tại <Text style={styles.hotelName}>{hotelName}</Text>
          </Text>
          <Text style={styles.tapHint}>
            {!checkIn
              ? 'Nhấn một ngày để chọn nhận phòng'
              : !checkOut
              ? 'Tiếp theo, hãy chọn ngày trả phòng'
              : 'Đã chọn xong! Nhấn Tiếp tục'}
          </Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          {/* Month Nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
              <Feather name="chevron-left" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTHS[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
              <Feather name="chevron-right" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((wd) => (
              <View key={wd} style={styles.weekCell}>
                <Text style={styles.weekText}>{wd}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <View key={`blank-${idx}`} style={styles.dayCell} />;
              }

              const inRange = isInRange(date);
              const isStart = isCheckIn(date);
              const isEnd = isCheckOut(date);
              const between = isBetween(date);
              const today = isToday(date);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    between && styles.dayCellBetween,
                    isStart && styles.dayCellStart,
                    isEnd && styles.dayCellEnd,
                  ]}
                  activeOpacity={inRange ? 0.6 : 1}
                  disabled={!inRange}
                  onPress={() => handleDayTap(date)}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      (isStart || isEnd) && styles.dayCircleSelected,
                      today && !isStart && !isEnd && styles.dayCircleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !inRange && styles.dayTextDisabled,
                        (isStart || isEnd) && styles.dayTextSelected,
                        today && !isStart && !isEnd && styles.dayTextToday,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selection Summary */}
        {checkIn && (
          <View style={styles.selectionSummary}>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>NHẬN PHÒNG</Text>
              <Text style={styles.dateValue}>
                {checkIn.getDate()} {MONTHS[checkIn.getMonth()].replace('Tháng ', 'Th')}
              </Text>
            </View>

            <View style={styles.dateSeparator}>
              <Feather name="arrow-right" size={16} color={BRAND} />
            </View>

            <View style={[styles.dateBox, { alignItems: 'flex-end' }]}>
              {checkOut ? (
                <>
                  <Text style={styles.dateLabel}>TRẢ PHÒNG</Text>
                  <Text style={styles.dateValue}>
                    {checkOut.getDate()} {MONTHS[checkOut.getMonth()].replace('Tháng ', 'Th')}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.dateLabel}>TRẢ PHÒNG</Text>
                  <Text style={styles.selectHint}>Chọn ngày</Text>
                </>
              )}
            </View>

            {nights > 0 && (
              <View style={styles.nightsBadge}>
                <Text style={styles.nightsText}>{nights} đêm</Text>
              </View>
            )}
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA */}
        <TouchableOpacity
          style={[styles.confirmBtn, !(checkIn && checkOut) && styles.confirmBtnDisabled]}
          activeOpacity={0.8}
          disabled={!(checkIn && checkOut)}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmBtnText}>Tiếp tục</Text>
          <Feather name="chevron-right" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingBottom: 34 },

  handleBar: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  clearBtn: { fontSize: 14, fontWeight: '600', color: '#EF4444' },

  titleSection: { paddingHorizontal: 24, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  hotelName: { fontWeight: '600', color: '#1A1A1A' },
  tapHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },

  // Calendar card
  calendarCard: {
    marginHorizontal: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
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

  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthArrow: { padding: 4 },
  monthTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },

  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellBetween: {
    backgroundColor: '#EBF5FF',
  },
  dayCellStart: {
    backgroundColor: '#EBF5FF',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  dayCellEnd: {
    backgroundColor: '#EBF5FF',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },

  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: BRAND,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: BRAND,
  },

  dayText: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  dayTextDisabled: { color: '#E0E0E0' },
  dayTextSelected: { color: '#FFF', fontWeight: '700' },
  dayTextToday: { color: BRAND, fontWeight: '600' },

  // Selection Summary
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  dateBox: { flex: 1, gap: 2 },
  dateSeparator: {
    width: 32,
    alignItems: 'center',
  },
  dateLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5 },
  dateValue: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  selectHint: { fontSize: 14, color: '#D1D5DB', fontWeight: '500' },
  nightsBadge: {
    position: 'absolute',
    right: 16,
    top: -10,
    backgroundColor: BRAND,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  nightsText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // Confirm
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    backgroundColor: BRAND,
    paddingVertical: 16,
    borderRadius: 14,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
