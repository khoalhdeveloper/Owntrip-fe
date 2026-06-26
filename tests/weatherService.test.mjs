import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const weatherServiceSource = readFileSync(
  new URL('../src/services/weatherService.ts', import.meta.url),
  'utf8',
);

test('weather forecast uses axiosClient base URL instead of a hard-coded absolute URL', () => {
  assert.doesNotMatch(weatherServiceSource, /https?:\/\/[^'"]+\/api\/weather\/forecast/);
  assert.match(weatherServiceSource, /['"]\/api\/weather\/forecast['"]/);
});
