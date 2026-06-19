import assert from 'node:assert/strict';
import test from 'node:test';

const {
  configureFixedFontScaling,
  getBottomTabBarPadding,
  getTabScreenBottomPadding,
  getFloatingButtonBounds,
  getInitialFloatingButtonPosition,
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
