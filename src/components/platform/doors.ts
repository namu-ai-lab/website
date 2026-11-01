/* The platform's three doors and each one's sidebar, as ElevenLabs has ElevenCreative, ElevenAgents and ElevenAPI:
   Namu Create (/create), Namu Agents (/agents) and Namu API (/account, the developer console). A page names its door
   and its item id; the shell draws the rest. A new page is one item here. */
import type { MODELS } from "@/lib/catalog";
import type { IconName } from "@/lib/icons";
import type { DoorId, PlatformCopy } from "@/content/platform";

export type { DoorId };
type NavKey = keyof PlatformCopy["nav"];

export type NavItem = { id: string; href: string; icon: IconName; label: NavKey | { task: (typeof MODELS)[number]["task"] }; admin?: boolean };
export type NavGroup = { label?: NavKey; items: NavItem[] };

export type Door = {
  id: DoorId;
  home: string;
  groups: NavGroup[];
  /** the door's sphere in the switch, lit from the top left like the models' */
  orb: string;
  /** the links at the foot of the sidebar */
  foot?: { label: NavKey; href: string }[];
};

const orb = (light: string, mid: string, dark: string) => `radial-gradient(circle at 34% 30%, ${light} 0, ${mid} 48%, ${dark} 100%)`;

export const DOORS: Door[] = [
  {
    id: "create", home: "/create", orb: orb("#ffd8b8", "#f29a5f", "#b4552a"),
    groups: [
      { items: [
        { id: "home", href: "/create", icon: "home", label: "home" },
        { id: "voices", href: "/create/voices", icon: "microphone", label: "voices" },
        { id: "projects", href: "/create/projects", icon: "version", label: "projects" },
        { id: "kit", href: "/create/kit", icon: "note", label: "kit" },
      ] },
      { label: "tools", items: [
        { id: "speak", href: "/create/speak", icon: "waveform", label: "speak" },
        { id: "transcribe", href: "/create/transcribe", icon: "transcript", label: "transcribe" },
        { id: "video", href: "/create/video", icon: "demo", label: "video" },
      ] },
    ],
  },
  {
    id: "agents", home: "/agents", orb: orb("#f4ece2", "#8fa6d6", "#3d4a78"),
    groups: [
      { items: [
        { id: "agents", href: "/agents", icon: "phone-voice", label: "agents" },
        { id: "templates", href: "/agents/templates", icon: "grid", label: "templates" },
        { id: "conversations", href: "/agents/conversations", icon: "turns", label: "conversations" },
        { id: "knowledge", href: "/agents/knowledge", icon: "paper", label: "knowledge" },
      ] },
    ],
  },
  // Namu API is the developer console (components/console/ConsoleShell, its own flat sidebar); here it is only a door
  // the switch leads to.
  { id: "api", home: "/account", orb: orb("#c9b8a6", "#5e5148", "#15120f"), groups: [] },
];

export const door = (id: DoorId): Door => DOORS.find(d => d.id === id)!;
