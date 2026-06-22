import React from 'react';
import { View, StyleSheet, Dimensions, Text, Image, TouchableOpacity } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { CheckinFrame } from '../../types/checkin.type';

const { width } = Dimensions.get('window');
const EDITOR_SIZE = Math.min(width - 40, 340); // Square size with padding
const INNER_SIZE = EDITOR_SIZE * 0.68; // Adjust based on typical frame border thickness
const INNER_OFFSET = (EDITOR_SIZE - INNER_SIZE) / 2;

// Vertical Film Strip Dimensions — tỷ lệ 1:3 theo chiều rộng màn hình
const FILM_HEIGHT = Math.min((width - 80) * 3, 460);
const FILM_WIDTH = FILM_HEIGHT / 3;

interface CheckinEditorProps {
  userImageUri?: string | null;
  userImageUris?: (string | null)[];
  selectedFrame: CheckinFrame | null;
  viewShotRef: React.RefObject<any>;
  activeSlotIndex?: number;
  onSelectSlot?: (index: number) => void;
}

export const CheckinEditor: React.FC<CheckinEditorProps> = ({
  userImageUri,
  userImageUris = [],
  selectedFrame,
  viewShotRef,
  activeSlotIndex = 0,
  onSelectSlot,
}) => {
  const isFilmstrip = selectedFrame?.layoutType === 'filmstrip-4';

  // Shared values for gestures (applied to single image or active slot in filmstrip)
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Pan Gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Pinch Gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const renderSingleLayout = () => {
    const frameSource = selectedFrame?.imageUrl ? { uri: selectedFrame.imageUrl } : null;
    return (
      <View style={styles.editorArea}>
        {/* Fake Frame (Rendered underneath) */}
        {frameSource && (
          <Image
            source={frameSource}
            style={styles.frameImage}
          />
        )}

        <View style={styles.innerImageContainer}>
          {userImageUri ? (
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={styles.gestureWrapper}>
                <Animated.Image
                  source={{ uri: userImageUri }}
                  style={[styles.userImage, animatedStyle]}
                  resizeMode="cover"
                />
              </Animated.View>
            </GestureDetector>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Chọn ảnh để bắt đầu</Text>
            </View>
          )}
        </View>

        {/* Watermark Overlay */}
        <View style={styles.watermarkContainer}>
          <Text style={styles.watermarkText}>OwnTrip</Text>
        </View>
      </View>
    );
  };

  const renderFilmstripLayout = () => {
    // Điều chỉnh tinh tế dựa theo frame thực tế Vũng Tàu:
    // - Phần decor trên (hello from VŨNG TÀU + hoa + sò) chiếm ~17% chiều cao
    // - Phần decor dưới (cọ + bãi biển + logo) chiếm ~22% chiều cao
    // - 4 slot nằm gọn trong khoảng 17% → 78%
    const slotTops = [14.2, 32.4, 50, 67]; 
    const slotHeight = 17.5; 

    const frameSource = selectedFrame?.imageUrl ? { uri: selectedFrame.imageUrl } : null;

    return (
      <View style={styles.filmstripEditorArea}>
        {/* The Frame overlay on top, pointerEvents="none" so user can still click slots underneath */}
        {frameSource && (
          <View pointerEvents="none" style={styles.filmstripFrameOverlay}>
            <Image
              source={frameSource}
              style={styles.filmstripFrameImage}
            />
          </View>
        )}

        {/* Render 4 absolute positioned photo slots */}
        {slotTops.map((topPercent, index) => {
          const imageUri = userImageUris[index];
          const isActive = index === activeSlotIndex;

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.9}
              style={[
                styles.filmstripSlot,
                {
                  top: `${topPercent}%`,
                  height: `${slotHeight}%`,
                },
              ]}
              onPress={() => onSelectSlot && onSelectSlot(index)}
            >
              {imageUri ? (
                isActive ? (
                  <GestureDetector gesture={composedGesture}>
                    <Animated.View style={styles.filmstripGestureWrapper}>
                      <Animated.Image
                        source={{ uri: imageUri }}
                        style={[styles.filmstripUserImage, animatedStyle]}
                        resizeMode="cover"
                      />
                    </Animated.View>
                  </GestureDetector>
                ) : (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.filmstripUserImageStatic}
                    resizeMode="cover"
                  />
                )
              ) : (
                <View style={styles.filmstripPlaceholder}>
                  <Feather name="plus" size={16} color="#aaa" />
                  <Text style={styles.filmstripPlaceholderText}>Ô {index + 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 0.9 }}
        style={styles.viewShot}
      >
        {isFilmstrip ? renderFilmstripLayout() : renderSingleLayout()}
      </ViewShot>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  viewShot: {
    backgroundColor: '#fff',
  },
  editorArea: {
    width: EDITOR_SIZE,
    height: EDITOR_SIZE,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmstripEditorArea: {
    width: FILM_WIDTH,
    height: FILM_HEIGHT,
    backgroundColor: '#F7FAFC',
    overflow: 'hidden',
    position: 'relative',
  },
  innerImageContainer: {
    position: 'absolute',
    top: INNER_OFFSET,
    left: INNER_OFFSET,
    width: INNER_SIZE,
    height: INNER_SIZE,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  gestureWrapper: {
    width: INNER_SIZE,
    height: INNER_SIZE,
  },
  userImage: {
    width: INNER_SIZE,
    height: INNER_SIZE,
  },
  frameImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: EDITOR_SIZE,
    height: EDITOR_SIZE,
    resizeMode: 'stretch',
  },
  filmstripFrameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FILM_WIDTH,
    height: FILM_HEIGHT,
    zIndex: 20, // Frame sits on top to create transparent overlay effect
  },
  filmstripFrameImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
  },
  filmstripSlot: {
    position: 'absolute',
    left: '9.8%',
    width: '80.4%',
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#EDF2F7',
    borderWidth: 0,
    borderColor: 'transparent',
    zIndex: 10, // Sits underneath the transparent holes of the frame
  },
  filmstripGestureWrapper: {
    width: '100%',
    height: '100%',
  },
  filmstripUserImage: {
    width: '100%',
    height: '100%',
  },
  filmstripUserImageStatic: {
    width: '100%',
    height: '100%',
  },
  filmstripPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  filmstripPlaceholderText: {
    fontSize: 9,
    color: '#718096',
    marginTop: 2,
    fontWeight: 'bold',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
  },
  watermarkContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 20,
  },
  watermarkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
