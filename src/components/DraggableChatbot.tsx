import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatbotModal from './ChatbotModal';
import { useChatbotSetting } from '../context/ChatbotSettingContext';
import {
  clampFloatingButtonPosition,
  getFloatingButtonBounds,
  getInitialFloatingButtonPosition,
} from '../utils/mobileLayout';

const BTN_SIZE = 56;

export default function DraggableChatbot() {
  const { aiButtonEnabled } = useChatbotSetting();
  const [modalVisible, setModalVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const layoutOptions = useMemo(
    () => ({
      screenWidth: width,
      screenHeight: height,
      buttonSize: BTN_SIZE,
      safeAreaTop: insets.top,
      safeAreaBottom: insets.bottom,
    }),
    [height, insets.bottom, insets.top, width],
  );

  const bounds = useMemo(() => getFloatingButtonBounds(layoutOptions), [layoutOptions]);
  const initialPosition = useMemo(
    () => getInitialFloatingButtonPosition(layoutOptions),
    [layoutOptions],
  );
  const pos = useRef(new Animated.ValueXY(initialPosition)).current;
  const currentPos = useRef(initialPosition);
  const hasDragged = useRef(false);

  useEffect(() => {
    const clampedPosition = clampFloatingButtonPosition(currentPos.current, bounds);
    currentPos.current = clampedPosition;
    pos.setValue(clampedPosition);
  }, [bounds, pos]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: () => {
          hasDragged.current = false;
          pos.stopAnimation();
        },

        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) {
            hasDragged.current = true;
          }

          const nextPosition = clampFloatingButtonPosition(
            {
              x: currentPos.current.x + g.dx,
              y: currentPos.current.y + g.dy,
            },
            bounds,
          );
          pos.setValue(nextPosition);
        },

        onPanResponderRelease: (_, g) => {
          const finalPosition = clampFloatingButtonPosition(
            {
              x: currentPos.current.x + g.dx,
              y: currentPos.current.y + g.dy,
            },
            bounds,
          );
          currentPos.current = finalPosition;

          if (!hasDragged.current) {
            setModalVisible(true);
          }
        },
      }),
    [bounds, pos],
  );

  if (!aiButtonEnabled) return null;

  return (
    <>
      <Animated.View
        style={[styles.fab, { transform: pos.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <Feather name="message-square" size={24} color="#FFF" />
      </Animated.View>

      <ChatbotModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 99,
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: '#4A7CFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
});
