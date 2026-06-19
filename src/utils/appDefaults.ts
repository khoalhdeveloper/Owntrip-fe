import { Text, TextInput } from 'react-native';

import { configureFixedFontScaling } from './mobileLayout';

let didApplyTextDefaults = false;

export function applyAppTextDefaults() {
  if (didApplyTextDefaults) return;

  configureFixedFontScaling(Text as unknown as object, TextInput as unknown as object);
  didApplyTextDefaults = true;
}
