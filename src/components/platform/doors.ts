/* The platform's three areas, after ElevenLabs' ElevenCreative, ElevenAgents and ElevenAPI: Namu Create (/create),
   Namu Agents (/agents) and Namu API (/account, the developer console). The top bar (PlatformBar) leads to them, where
   everyone sees it rather than at the foot of a sidebar. Create and Agents each have a short side menu, listed here: a
   new page is one item. The console keeps its own list (components/console/ConsoleShell). */
import type { IconName } from "@/lib/icons";
import type { DoorId, PlatformCopy } from "@/content/platform";

export type { DoorId };
type NavKey = keyof PlatformCopy["nav"];

export type NavItem = { id: string; href: string; icon: IconName; label: NavKey & keyof PlatformCopy["short"] };

export const AREAS: { id: DoorId; home: string }[] = [
  { id: "create", home: "/create" },
  { id: "agents", home: "/agents" },
  { id: "api", home: "/account" },
];

export const MENUS: Record<Exclude<DoorId, "api">, NavItem[]> = {
  create: [
    { id: "home", href: "/create", icon: "home", label: "home" },
    { id: "speak", href: "/create/speak", icon: "waveform", label: "speak" },
    { id: "read", href: "/create/read", icon: "transcript", label: "read" },
    { id: "translate", href: "/create/translate", icon: "translate", label: "translate" },
    { id: "voices", href: "/create/voices", icon: "microphone", label: "voices" },
  ],
  agents: [
    { id: "agents", href: "/agents", icon: "phone-voice", label: "agents" },
    { id: "templates", href: "/agents/templates", icon: "grid", label: "templates" },
    { id: "conversations", href: "/agents/conversations", icon: "turns", label: "conversations" },
  ],
};
