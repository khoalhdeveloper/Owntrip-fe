import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const verifyModalSource = readFileSync(
  new URL('../src/screens/checkin/components/CheckinVerifyModal.tsx', import.meta.url),
  'utf8',
);

test('check-in verification does not fetch the public frame list', () => {
  assert.doesNotMatch(verifyModalSource, /ENDPOINTS\.FRAMES\.LIST/);
});

test('photo booth navigation preserves place context for unlocked frame filtering', () => {
  assert.match(verifyModalSource, /destination:\s*place\.name/);
});
