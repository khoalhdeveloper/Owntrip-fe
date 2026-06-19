import assert from 'node:assert/strict';
import test from 'node:test';

const {
  configureFixedFontScaling,
  getBottomTabBarPadding,
  getCameraControlsBottomPadding,
  getCameraHeaderTopPadding,
  getChatbotModalHeight,
  getCheckinActionBarBottomOffset,
  getCheckinGalleryFabBottomOffset,
  getCheckinGalleryListBottomPadding,
  getCheckinHeaderTopPadding,
  getCheckinScreenBottomPadding,
  getTabScreenBottomPadding,
  getFloatingButtonBounds,
  getInitialFloatingButtonPosition,
  shouldHideFloatingChatbot,
} = await import('../src/utils/mobileLayout.ts');

test('floating button bounds respect top and bottom safe areas', () => {
  const bounds = getFloatingButtonBounds({
    screenWidth: 360,
    screenHeight: 760,
    buttonSize: 56,
    safeAreaTop: 24,
    safeAreaBottom: 48,
  });

  assert.deepEqual(bounds, {
    minX: 12,
    maxX: 292,
    minY: 72,
    maxY: 624,
  });
});

test('initial floating button position starts inside safe bounds', () => {
  const position = getInitialFloatingButtonPosition({
    screenWidth: 360,
    screenHeight: 760,
    buttonSize: 56,
    safeAreaTop: 0,
    safeAreaBottom: 80,
  });

  assert.deepEqual(position, {
    x: 292,
    y: 592,
  });
});

test('floating button can avoid bottom overlays such as action bars', () => {
  const bounds = getFloatingButtonBounds({
    screenWidth: 360,
    screenHeight: 760,
    buttonSize: 56,
    safeAreaTop: 0,
    safeAreaBottom: 24,
    bottomAvoidance: 96,
  });

  assert.equal(bounds.maxY, 552);
});

test('configureFixedFontScaling preserves existing default props', () => {
  const textComponent = { defaultProps: { selectable: true } };
  const inputComponent = { defaultProps: { underlineColorAndroid: 'transparent' } };

  configureFixedFontScaling(textComponent, inputComponent);

  assert.deepEqual(textComponent.defaultProps, {
    selectable: true,
    allowFontScaling: false,
    maxFontSizeMultiplier: 1,
  });
  assert.deepEqual(inputComponent.defaultProps, {
    underlineColorAndroid: 'transparent',
    allowFontScaling: false,
    maxFontSizeMultiplier: 1,
  });
});

test('bottom tab bar padding keeps a visual cushion without safe area', () => {
  assert.equal(getBottomTabBarPadding(0), 10);
});

test('tab screen padding leaves room for tab bar and navigation controls', () => {
  assert.equal(getTabScreenBottomPadding(0), 112);
  assert.equal(getTabScreenBottomPadding(48), 152);
});

test('check-in editor spacing keeps toolbar above the tab bar', () => {
  assert.equal(getCheckinActionBarBottomOffset(0), 82);
  assert.equal(getCheckinScreenBottomPadding(0), 158);
  assert.equal(getCheckinActionBarBottomOffset(48), 120);
  assert.equal(getCheckinScreenBottomPadding(48), 196);
});

test('check-in gallery floating CTA clears the raised center tab', () => {
  assert.equal(getCheckinGalleryFabBottomOffset(0), 118);
  assert.equal(getCheckinGalleryListBottomPadding(0), 178);
  assert.equal(getCheckinGalleryFabBottomOffset(48), 156);
  assert.equal(getCheckinGalleryListBottomPadding(48), 216);
});

test('check-in headers sit below the Android status bar with a small cushion', () => {
  assert.equal(getCheckinHeaderTopPadding(0), 28);
  assert.equal(getCheckinHeaderTopPadding(24), 28);
  assert.equal(getCheckinHeaderTopPadding(48), 36);
});

test('camera header controls sit slightly lower than normal check-in headers', () => {
  assert.equal(getCameraHeaderTopPadding(0), 36);
  assert.equal(getCameraHeaderTopPadding(24), 36);
  assert.equal(getCameraHeaderTopPadding(48), 44);
});

test('chatbot modal shrinks while the keyboard is visible', () => {
  assert.equal(getChatbotModalHeight({ screenHeight: 800, keyboardHeight: 0 }), 656);
  assert.equal(getChatbotModalHeight({ screenHeight: 800, keyboardHeight: 320 }), 432);
  assert.equal(getChatbotModalHeight({ screenHeight: 520, keyboardHeight: 320 }), 240);
});

test('camera controls leave room above Android navigation controls', () => {
  assert.equal(getCameraControlsBottomPadding(0), 28);
  assert.equal(getCameraControlsBottomPadding(24), 44);
  assert.equal(getCameraControlsBottomPadding(48), 68);
});

test('floating chatbot is hidden on full-screen camera workflows', () => {
  assert.equal(shouldHideFloatingChatbot(['checkin', 'camera']), true);
  assert.equal(shouldHideFloatingChatbot(['checkin', 'select']), true);
  assert.equal(shouldHideFloatingChatbot(['checkin', 'result']), true);
  assert.equal(shouldHideFloatingChatbot(['checkin', 'frame']), false);
});
