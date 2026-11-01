/* The models the platform calls: one entry each, as the gateway's MODELS list has them (platform/modal/
   namu_gateway.py). The console's model pages, the Playground, Create's tools and the agents read this list, so a
   model that learns a language is one code added here (and in the gateway); a new model is one entry, plus its
   scope in lib/key-shape.ts and the gateway. catalog.test.ts keeps the scopes in step.
   Browser-safe. */
import type { IconName } from "@/lib/icons";
import type { LangCode } from "./languages";

export type Task = "speech" | "transcribe" | "translate" | "converse";
export type ModelStatus = "preview" | "research";

export type Model = {
  id: string;
  name: string;
  task: Task;
  /** the gateway path; also the key scope's name, which equals the task */
  endpoint: `/v1/${string}`;
  /** speech and transcribe: the languages it reads or speaks; converse: the languages it answers in */
  languages: readonly LangCode[];
  /** translate only: the directions it knows, [from, to] */
  pairs?: readonly (readonly [LangCode, LangCode])[];
  status: ModelStatus;
  icon: IconName;
};

export const MODELS = [
  { id: "tafiya", name: "Tafiya", task: "speech", endpoint: "/v1/speech", languages: ["ha"], status: "preview", icon: "volume" },
  { id: "tatsuniya", name: "Tatsuniya", task: "transcribe", endpoint: "/v1/transcribe", languages: ["ha"], status: "preview", icon: "transcript" },
  { id: "kora", name: "Kora", task: "translate", endpoint: "/v1/translate", languages: ["ha", "fr"], pairs: [["ha", "fr"], ["fr", "ha"]], status: "preview", icon: "translate" },
  { id: "air", name: "Aïr", task: "converse", endpoint: "/v1/converse", languages: ["ha"], status: "research", icon: "phone-voice" },
] as const satisfies readonly Model[];

export type ModelId = (typeof MODELS)[number]["id"];
export const TASKS: readonly Task[] = ["speech", "transcribe", "translate", "converse"];

const BY_ID = new Map<string, Model>(MODELS.map(m => [m.id, m]));
export const isModelId = (x: unknown): x is ModelId => typeof x === "string" && BY_ID.has(x);
export const model = (id: ModelId): Model => BY_ID.get(id)!;
export const modelFor = (task: Task): Model => MODELS.find(m => m.task === task)!;
