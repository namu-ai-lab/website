/* An agent page's tabs, in order; ?tab= on an agent's page opens one. A plain module, so the server page can read it. */
export type Tab = "agent" | "knowledge" | "conversations" | "whatsapp";
export const TABS: Tab[] = ["agent", "knowledge", "conversations", "whatsapp"];
