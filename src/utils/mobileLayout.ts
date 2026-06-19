type ComponentWithDefaults = {
  defaultProps?: Record<string, unknown>;
};

type FloatingButtonOptions = {
  screenWidth: number;
  screenHeight: number;
  buttonSize: number;
  safeAreaTop: number;
  safeAreaBottom: number;
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
const TAB_SCREEN_BASE_BOTTOM_PADDING = 112;
const TAB_SCREEN_SAFE_AREA_GAP = 104;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getFloatingButtonBounds({
  screenWidth,
  screenHeight,
  buttonSize,
  safeAreaTop,
  safeAreaBottom,
}: FloatingButtonOptions): FloatingButtonBounds {
  return {
    minX: SIDE_GAP,
    maxX: Math.max(SIDE_GAP, screenWidth - buttonSize - SIDE_GAP),
    minY: Math.max(TOP_GAP, safeAreaTop + TOP_GAP),
    maxY: Math.max(TOP_GAP, screenHeight - buttonSize - safeAreaBottom - BOTTOM_GAP),
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

export function getTabScreenBottomPadding(safeAreaBottom: number) {
  return Math.max(TAB_SCREEN_BASE_BOTTOM_PADDING, safeAreaBottom + TAB_SCREEN_SAFE_AREA_GAP);
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
