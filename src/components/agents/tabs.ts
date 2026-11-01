/* The builder's tabs, in order; ?tab= on an agent's page opens one. A plain module, so the server page can read it. */
export type Tab = "agent" | "workflow" | "knowledge" | "checks" | "tests" | "deploy" | "conversations";
export const TABS: Tab[] = ["agent", "workflow", "knowledge", "checks", "tests", "deploy", "conversations"];
