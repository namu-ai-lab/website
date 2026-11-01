/* Where a recording will be heard, as Create offers it ("Made for"): each target fixes the sample rate, the channels,
   the loudness and the file a listener's channel accepts. The gateway answers WAV; lib/audio-out turns that into
   each target in the browser. A new channel is one entry here and, if it needs a new container, one encoder there.
   Browser-safe. */
export type OutputId = "whatsapp" | "radio" | "phone" | "file";

export type Output = {
  id: OutputId;
  /** Hz; null keeps the model's own rate */
  rate: number | null;
  /** integrated loudness to aim for, in LUFS (approximated by RMS); null leaves it as it is */
  lufs: number | null;
  container: "ogg" | "wav" | "mp3";
  /** what to fall back to when the browser cannot encode `container` */
  fallback?: "wav";
  ext: string;
};

export const OUTPUTS = [
  { id: "whatsapp", rate: 48000, lufs: -16, container: "ogg", fallback: "wav", ext: "ogg" },
  { id: "radio", rate: 48000, lufs: -23, container: "wav", ext: "wav" },
  { id: "phone", rate: 8000, lufs: -18, container: "wav", ext: "wav" },
  { id: "file", rate: null, lufs: null, container: "wav", ext: "wav" },
] as const satisfies readonly Output[];

export const output = (id: OutputId): Output => OUTPUTS.find(o => o.id === id)!;
export const isOutputId = (x: unknown): x is OutputId => OUTPUTS.some(o => o.id === x);
