import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import ChatbotModal from './ChatbotModal';
import { useChatbotSetting } from '../context/ChatbotSettingContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BTN_SIZE = 56;

export default function DraggableChatbot() {
  const { aiButtonEnabled } = useChatbotSetting();
  const [modalVisible, setModalVisible] = useState(false);

  const pos = useRef(new Animated.ValueXY({
    x: SCREEN_WIDTH - BTN_SIZE - 20,
    y: SCREEN_HEIGHT - BTN_SIZE - 100,
  })).current;

  const currentPos = useRef({
    x: SCREEN_WIDTH - BTN_SIZE - 20,
    y: SCREEN_HEIGHT - BTN_SIZE - 100,
  });

  const hasDragged = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        hasDragged.current = false;
        pos.stopAnimation();
      },

      onPanResponderMove: (_, g) => {
        // Nếu di chuyển > 5px tính là kéo
        if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) {
          hasDragged.current = true;
        }

        const newX = Math.max(0, Math.min(SCREEN_WIDTH - BTN_SIZE, currentPos.current.x + g.dx));
        const newY = Math.max(60, Math.min(SCREEN_HEIGHT - BTN_SIZE - 80, currentPos.current.y + g.dy));
        pos.setValue({ x: newX, y: newY });
      },

      onPanResponderRelease: (_, g) => {
        const finalX = Math.max(0, Math.min(SCREEN_WIDTH - BTN_SIZE, currentPos.current.x + g.dx));
        const finalY = Math.max(60, Math.min(SCREEN_HEIGHT - BTN_SIZE - 80, currentPos.current.y + g.dy));
        currentPos.current = { x: finalX, y: finalY };

        // Nếu không kéo → coi là tap → mở modal
        if (!hasDragged.current) {
          setModalVisible(true);
        }
      },
    })
  ).current;

  if (!aiButtonEnabled) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.fab,
          { transform: pos.getTranslateTransform() },
        ]}
        {...panResponder.panHandlers}
      >
        <Feather name="message-square" size={24} color="#FFF" />
      </Animated.View>

      <ChatbotModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
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
