import React, { useCallback } from 'react';
import { View, Text, Image, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TimelineEntry } from './types';
import { formatShortDate } from './helpers';
import { styles } from './styles';

export interface DraggableTimelineItemProps {
  entry: TimelineEntry;
  idx: number;
  isHighlighted: boolean;
  isLast: boolean;
  dist: { distance: string; time: string } | null;
  onTap: (idx: number) => void;
  onDragStart: (idx: number) => void;
  onDragEnd: (fromIdx: number, dy: number) => void;
  itemHeight: number;
}

const SPRING_CONFIG = { damping: 20, stiffness: 200 };

export function DraggableTimelineItem({
  entry,
  idx,
  isHighlighted,
  isLast,
  dist,
  onTap,
  onDragStart,
  onDragEnd,
}: DraggableTimelineItemProps) {
  const hasPhoto = !!entry.photo;

  // ── Reanimated shared values ──
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  // ── JS thread callbacks (must use runOnJS from worklet) ──
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const triggerDragStart = useCallback(() => {
    onDragStart(idx);
  }, [onDragStart, idx]);

  const triggerDragEnd = useCallback(
    (dy: number) => {
      onDragEnd(idx, dy);
    },
    [onDragEnd, idx],
  );

  const triggerTap = useCallback(() => {
    onTap(idx);
  }, [onTap, idx]);

  // ── Gesture: Long press on drag handle to activate, then pan ──
  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      scale.value = withSpring(1.04, SPRING_CONFIG);
      runOnJS(triggerHaptic)();
      runOnJS(triggerDragStart)();
    });

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onUpdate((event) => {
      'worklet';
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      'worklet';
      isDragging.value = false;
      translateY.value = withSpring(0, SPRING_CONFIG);
      scale.value = withSpring(1, SPRING_CONFIG);
      runOnJS(triggerDragEnd)(event.translationY);
    })
    .onFinalize(() => {
      'worklet';
      // Fallback reset if gesture cancelled
      if (isDragging.value) {
        isDragging.value = false;
        translateY.value = withSpring(0, SPRING_CONFIG);
        scale.value = withSpring(1, SPRING_CONFIG);
      }
    });

  // Combine: long press activates drag context, pan moves item
  const dragGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  // ── Gesture: Simple tap on the whole item ──
  const tapGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(triggerTap)();
  });

  // ── Animated styles ──
  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex: isDragging.value ? 100 : 0,
      ...(Platform.OS === 'ios'
        ? {
            shadowOpacity: isDragging.value ? 0.18 : 0.04,
            shadowRadius: isDragging.value ? 16 : 6,
          }
        : {
            elevation: isDragging.value ? 8 : 1,
          }),
    };
  });

  return (
    <>
      <Animated.View
        style={[
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
          },
          animatedCardStyle,
        ]}
      >
        {/* Tap gesture on the whole card */}
        <GestureDetector gesture={tapGesture}>
          <Animated.View
            style={[
              styles.timelineItem,
              isHighlighted && styles.timelineItemHighlighted,
            ]}
          >
            {/* Drag Handle — long press + pan gesture */}
            <GestureDetector gesture={dragGesture}>
              <Animated.View style={styles.dragHandle}>
                <Feather name="menu" size={16} color="#C5C8CE" />
              </Animated.View>
            </GestureDetector>

            {/* Step Number */}
            <View style={styles.timelineStepCol}>
              <View
                style={[
                  styles.timelineStepDot,
                  isHighlighted && styles.timelineStepDotActive,
                ]}
              >
                <Text
                  style={[
                    styles.timelineStepNum,
                    isHighlighted && styles.timelineStepNumActive,
                  ]}
                >
                  {idx + 1}
                </Text>
              </View>
              {!isLast && <View style={styles.timelineConnector} />}
            </View>

            {/* Photo */}
            <View style={styles.timelineAvatar}>
              {hasPhoto ? (
                <Image
                  source={{ uri: entry.photo }}
                  style={styles.timelineAvatarImg}
                />
              ) : (
                <View
                  style={[
                    styles.timelineAvatarImg,
                    styles.timelineAvatarPlaceholder,
                  ]}
                >
                  <Feather name="map-pin" size={16} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.timelineInfo}>
              <Text style={styles.timelinePlaceName} numberOfLines={1}>
                {entry.name}
              </Text>
              <View style={styles.timelineMetaRow}>
                <Feather name="clock" size={11} color="#9CA3AF" />
                <Text style={styles.timelineMetaText}>
                  {entry.mockTime} · {formatShortDate(entry.dayDate)}
                </Text>
              </View>
              <Text style={styles.timelineMemory} numberOfLines={2}>
                {entry.mockMemory}
              </Text>
            </View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>

      {/* Distance badge */}
      {dist && (
        <View style={styles.distanceBadge}>
          <View style={styles.distanceLine} />
          <View style={styles.distancePill}>
            <Feather name="navigation" size={10} color="#6B7280" />
            <Text style={styles.distanceText}>
              {dist.distance} · {dist.time}
            </Text>
          </View>
          <View style={styles.distanceLine} />
        </View>
      )}
    </>
  );
}
