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
const EDITOR_SIZE = width - 40; // Square size with padding
const INNER_SIZE = EDITOR_SIZE * 0.68; // Adjust based on typical frame border thickness
const INNER_OFFSET = (EDITOR_SIZE - INNER_SIZE) / 2;

// Vertical Film Strip Dimensions
const FILM_WIDTH = 160;
const FILM_HEIGHT = 450;

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
    return (
      <View style={styles.editorArea}>
        {/* Fake Frame (Rendered underneath) */}
        {selectedFrame && selectedFrame.image && (
          <Image
            source={selectedFrame.image}
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
    const slotTops = [14.8, 32.8, 50.8, 68.8]; // Percentage heights for the 4 slots
    const slotHeight = 16.5; // Percentage height of each slot

    return (
      <View style={styles.filmstripEditorArea}>
        {/* The Frame Background Image */}
        {selectedFrame && selectedFrame.image && (
          <Image
            source={selectedFrame.image}
            style={styles.filmstripFrameImage}
          />
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
                isActive && styles.activeFilmstripSlot,
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
  filmstripFrameImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FILM_WIDTH,
    height: FILM_HEIGHT,
    resizeMode: 'stretch',
    zIndex: 1, // Frame sits underneath, photos render on top of the white boxes
  },
  filmstripSlot: {
    position: 'absolute',
    left: '11%',
    width: '78%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: 'transparent',
    zIndex: 10, // Sits on top of the white area
  },
  activeFilmstripSlot: {
    borderColor: '#2F80ED',
    borderWidth: 2,
    elevation: 3,
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
