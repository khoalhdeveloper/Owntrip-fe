type ComponentWithDefaults = {
  defaultProps?: Record<string, unknown>;
};

type FloatingButtonOptions = {
  screenWidth: number;
  screenHeight: number;
  buttonSize: number;
  safeAreaTop: number;
  safeAreaBottom: number;
  bottomAvoidance?: number;
};

type FloatingButtonBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type Point = {
  x: number;
  y: number;
};

const SIDE_GAP = 12;
const TOP_GAP = 48;
const BOTTOM_GAP = 32;
const TAB_BAR_MIN_BOTTOM_PADDING = 10;
const TAB_BAR_BASE_HEIGHT = 64;
const TAB_SCREEN_BASE_BOTTOM_PADDING = 112;
const TAB_SCREEN_SAFE_AREA_GAP = 104;
const CHECKIN_ACTION_BAR_HEIGHT = 60;
const CHECKIN_ACTION_BAR_GAP = 8;
const CHECKIN_SCROLL_EXTRA_GAP = 16;
const CHECKIN_GALLERY_FAB_EXTRA_GAP = 44;
const CHECKIN_GALLERY_FAB_SCROLL_GAP = 60;
const CHECKIN_HEADER_MIN_TOP_PADDING = 28;
const CHECKIN_HEADER_MAX_TOP_PADDING = 36;
const CAMERA_HEADER_EXTRA_TOP_GAP = 8;
const CAMERA_CONTROLS_MIN_BOTTOM_PADDING = 28;
const CAMERA_CONTROLS_SAFE_AREA_GAP = 20;
const CHATBOT_MODAL_HEIGHT_RATIO = 0.82;
const CHATBOT_KEYBOARD_TOP_GAP = 48;
const CHATBOT_MODAL_MIN_HEIGHT = 240;

type ChatbotModalHeightOptions = {
  screenHeight: number;
  keyboardHeight: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getFloatingButtonBounds({
  screenWidth,
  screenHeight,
  buttonSize,
  safeAreaTop,
  safeAreaBottom,
  bottomAvoidance = 0,
}: FloatingButtonOptions): FloatingButtonBounds {
  return {
    minX: SIDE_GAP,
    maxX: Math.max(SIDE_GAP, screenWidth - buttonSize - SIDE_GAP),
    minY: Math.max(TOP_GAP, safeAreaTop + TOP_GAP),
    maxY: Math.max(
      TOP_GAP,
      screenHeight - buttonSize - safeAreaBottom - BOTTOM_GAP - bottomAvoidance,
    ),
  };
}

export function clampFloatingButtonPosition(point: Point, bounds: FloatingButtonBounds): Point {
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}

export function getInitialFloatingButtonPosition(options: FloatingButtonOptions): Point {
  const bounds = getFloatingButtonBounds(options);

  return {
    x: bounds.maxX,
    y: bounds.maxY,
  };
}

export function getBottomTabBarPadding(safeAreaBottom: number) {
  return Math.max(safeAreaBottom, TAB_BAR_MIN_BOTTOM_PADDING);
}

export function getBottomTabBarHeight(safeAreaBottom: number) {
  return TAB_BAR_BASE_HEIGHT + getBottomTabBarPadding(safeAreaBottom);
}

export function getTabScreenBottomPadding(safeAreaBottom: number) {
  return Math.max(TAB_SCREEN_BASE_BOTTOM_PADDING, safeAreaBottom + TAB_SCREEN_SAFE_AREA_GAP);
}

export function getCheckinActionBarBottomOffset(safeAreaBottom: number) {
  return getBottomTabBarHeight(safeAreaBottom) + CHECKIN_ACTION_BAR_GAP;
}

export function getCheckinScreenBottomPadding(safeAreaBottom: number) {
  return (
    getCheckinActionBarBottomOffset(safeAreaBottom) +
    CHECKIN_ACTION_BAR_HEIGHT +
    CHECKIN_SCROLL_EXTRA_GAP
  );
}

export function getCheckinGalleryFabBottomOffset(safeAreaBottom: number) {
  return getBottomTabBarHeight(safeAreaBottom) + CHECKIN_GALLERY_FAB_EXTRA_GAP;
}

export function getCheckinGalleryListBottomPadding(safeAreaBottom: number) {
  return getCheckinGalleryFabBottomOffset(safeAreaBottom) + CHECKIN_GALLERY_FAB_SCROLL_GAP;
}

export function getCheckinHeaderTopPadding(safeAreaTop: number) {
  return clamp(safeAreaTop, CHECKIN_HEADER_MIN_TOP_PADDING, CHECKIN_HEADER_MAX_TOP_PADDING);
}

export function getCameraHeaderTopPadding(safeAreaTop: number) {
  return getCheckinHeaderTopPadding(safeAreaTop) + CAMERA_HEADER_EXTRA_TOP_GAP;
}

export function getCameraControlsBottomPadding(safeAreaBottom: number) {
  return Math.max(CAMERA_CONTROLS_MIN_BOTTOM_PADDING, safeAreaBottom + CAMERA_CONTROLS_SAFE_AREA_GAP);
}

export function shouldHideFloatingChatbot(segments: string[]) {
  return (
    segments.includes('checkin') &&
    (segments.includes('camera') || segments.includes('select') || segments.includes('result'))
  );
}

export function getChatbotModalHeight({
  screenHeight,
  keyboardHeight,
}: ChatbotModalHeightOptions) {
  if (keyboardHeight <= 0) {
    return Math.round(screenHeight * CHATBOT_MODAL_HEIGHT_RATIO);
  }

  return Math.max(CHATBOT_MODAL_MIN_HEIGHT, screenHeight - keyboardHeight - CHATBOT_KEYBOARD_TOP_GAP);
}

export function configureFixedFontScaling(
  textComponent: ComponentWithDefaults,
  inputComponent: ComponentWithDefaults,
) {
  textComponent.defaultProps = {
    ...textComponent.defaultProps,
    allowFontScaling: false,
    maxFontSizeMultiplier: 1,
  };
  inputComponent.defaultProps = {
    ...inputComponent.defaultProps,
    allowFontScaling: false,
    maxFontSizeMultiplier: 1,
  };
}
