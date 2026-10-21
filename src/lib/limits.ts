/* The API's limits, as the gateway enforces them (platform/modal/namu_gateway.py: MAX_UPLOAD_BYTES, MAX_AUDIO_SECONDS,
   MAX_TEXT_CHARS, SERVICE_PER_MIN, KEY_CACHE_TTL; api_keys.rate_limit_per_min defaults to 60). Change both together.
   Browser-safe. */
export const LIMITS = {
  uploadMb: 25,
  audioMinutes: 5,
  textChars: 2000,
  keyPerMin: 60,
  playgroundPerMin: 20,
  revokeSeconds: 30,
} as const;
