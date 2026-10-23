/* The API's limits, as the gateway enforces them (platform/modal/namu_gateway.py: MAX_UPLOAD_BYTES, MAX_AUDIO_SECONDS,
   MAX_TEXT_CHARS, SERVICE_PER_MIN, KEY_CACHE_TTL; api_keys.rate_limit_per_min defaults to 60). Change both together.
   Browser-safe.
   playgroundUploadMb is the website's own limit, not the gateway's: the console Playground's audio goes through
   /api/playground, a Vercel Function, and Vercel refuses request bodies over 4.5 MB before the route runs. 4 MB (MiB)
   leaves headroom under that for either reading of "MB". */
export const LIMITS = {
  uploadMb: 25,
  audioMinutes: 5,
  textChars: 2000,
  keyPerMin: 60,
  playgroundPerMin: 20,
  playgroundUploadMb: 4,
  revokeSeconds: 30,
} as const;
