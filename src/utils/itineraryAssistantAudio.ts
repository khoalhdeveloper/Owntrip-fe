const ITINERARY_AI_AUDIO_FEEDBACK_ENABLED = false;

export function shouldSpeakItineraryAiFeedback(): boolean {
  return ITINERARY_AI_AUDIO_FEEDBACK_ENABLED;
}

export function speakItineraryAiFeedback(_message: string): boolean {
  return false;
}
