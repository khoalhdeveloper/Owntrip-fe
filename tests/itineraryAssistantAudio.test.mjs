import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  shouldSpeakItineraryAiFeedback,
  speakItineraryAiFeedback,
} from '../src/utils/itineraryAssistantAudio.ts';

describe('itinerary assistant audio feedback', () => {
  it('keeps itinerary AI voice feedback disabled', () => {
    assert.equal(shouldSpeakItineraryAiFeedback(), false);
  });

  it('does not speak feedback messages', () => {
    assert.equal(speakItineraryAiFeedback('Dang xu ly lich trinh'), false);
  });
});
