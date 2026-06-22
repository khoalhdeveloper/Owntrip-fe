import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildItineraryPreviewChanges,
  normalizeAiPreviewChanges,
  normalizeOrderedPlaceIds,
  reorderDestinationsByIds,
} from '../src/utils/itineraryPreview.ts';

const destinations = [
  { dayId: 'day-1', day: 1, place: { _id: 'a', name: 'A', order: 1 } },
  { dayId: 'day-1', day: 1, place: { _id: 'b', name: 'B', order: 2 } },
  { dayId: 'day-1', day: 1, place: { _id: 'c', name: 'C', order: 3 } },
  { dayId: 'day-2', day: 2, place: { _id: 'd', name: 'D', order: 1 } },
];

test('normalizeOrderedPlaceIds keeps unknown ids out and appends missing current ids', () => {
  assert.deepEqual(normalizeOrderedPlaceIds(destinations.slice(0, 3), ['c', 'x', 'c']), [
    'c',
    'a',
    'b',
  ]);
});

test('buildItineraryPreviewChanges reports only moved places', () => {
  assert.deepEqual(buildItineraryPreviewChanges(destinations.slice(0, 3), ['b', 'a', 'c']), [
    { placeId: 'b', name: 'B', from: 2, to: 1 },
    { placeId: 'a', name: 'A', from: 1, to: 2 },
  ]);
});

test('normalizeAiPreviewChanges renders backend object changes as readable text data', () => {
  const changes = normalizeAiPreviewChanges(
    [
      { placeId: 'b', from: 2, to: 1 },
      { placeId: 'a', from: 1, to: 2 },
    ],
    destinations.slice(0, 3),
    ['b', 'a', 'c'],
  );

  assert.deepEqual(changes, [
    { placeId: 'b', name: 'B', from: 2, to: 1 },
    { placeId: 'a', name: 'A', from: 1, to: 2 },
  ]);
  assert.equal(changes.some((change) => change.name === '[object Object]'), false);
});

test('normalizeAiPreviewChanges falls back when backend object changes are unchanged', () => {
  assert.deepEqual(
    normalizeAiPreviewChanges([{ placeId: 'a', from: 1, to: 1 }], destinations.slice(0, 3), [
      'b',
      'a',
      'c',
    ]),
    [
      { placeId: 'b', name: 'B', from: 2, to: 1 },
      { placeId: 'a', name: 'A', from: 1, to: 2 },
    ],
  );
});

test('reorderDestinationsByIds only changes target day', () => {
  const reordered = reorderDestinationsByIds(destinations, 'day-1', ['c', 'a', 'b']);

  assert.deepEqual(
    reordered
      .filter((dest) => dest.dayId === 'day-1')
      .sort((a, b) => a.place.order - b.place.order)
      .map((dest) => dest.place._id),
    ['c', 'a', 'b'],
  );
  assert.equal(reordered.find((dest) => dest.dayId === 'day-2')?.place._id, 'd');
});
