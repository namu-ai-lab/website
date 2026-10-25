import type { IconName } from "@/lib/icons";

export const site = {
  name: "Namu AI Lab",
  url: "https://www.namuai-lab.com",
  parent: { name: "Namu", url: "https://www.namu-ai.org" },
  description: "Namu AI Lab is the research unit of Namu. We study how machines hear, understand and answer in the languages of the Sahel.",
};

/* Icons come from the Lab set (src/lib/icons.ts). */
export const programmeIcon: Record<string, IconName> = { hira: "turns", rumbu: "consent", zarma: "language", tankade: "filter", maauni: "check" };

export type ModelStatus = "In research" | "In development" | "Early preview" | "Available";
export const models: { slug: string; name: string; line: string; task: string; languages: string; status: ModelStatus; icon: IconName; href: string; isNew?: boolean }[] = [
  { slug: "air", name: "Aïr", line: "A voice agent that holds a conversation in the languages of the Sahel", task: "Voice agent", languages: "Languages of the Sahel", status: "In research", icon: "phone-voice", href: "/models/air", isNew: true },
  { slug: "kora", name: "Kora", line: "Speech translation between the languages of the Sahel and French", task: "Speech translation", languages: "Languages of the Sahel, French", status: "In development", icon: "translate", href: "https://www.namu-ai.org/models/kora" },
  { slug: "tatsuniya", name: "Tatsuniya", line: "Speech recognition built for the languages of the Sahel", task: "Speech recognition", languages: "Languages of the Sahel", status: "In development", icon: "transcript", href: "https://www.namu-ai.org/models/tatsuniya" },
  { slug: "tafiya", name: "Tafiya", line: "Natural, expressive speech synthesis for the languages of the Sahel", task: "Speech synthesis", languages: "Languages of the Sahel", status: "In development", icon: "volume", href: "https://www.namu-ai.org/models/tafiya" },
];

