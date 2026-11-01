import "server-only";
import { sql } from "@/lib/db";
import { GatewayError } from "@/lib/gateway";
import { LIMITS } from "@/lib/limits";

/* An agent's text step reaches the agent service directly, as the home page's conversation does, because the gateway
   has no metered chat endpoint yet (ARCHITECTURE.md, batch 38). Until it has, the site applies the gateway's rules
   here: the owner's account is active and inside its month's allowance, and makes at most LIMITS.playgroundPerMin
   text steps a minute, across the console, the tests and WhatsApp. Each step is recorded in usage_events (its
   characters, status and latency; never its text), so it shows in Usage and Logs. */
/** The usage row's endpoint for an agent's text step (the gateway's rows name theirs speech, transcribe...). */
export const CHAT_ENDPOINT = "agents";

export async function admitChat(userId: string): Promise<void> {
  const [r] = await sql<{ status: string; allowance: number; used: string; recent: number }>(`select p.beta_status as status, p.monthly_audio_seconds as allowance,
      (select coalesce(sum(e.audio_seconds), 0) from public.usage_events e where e.user_id = $1 and e.created_at >= date_trunc('month', now())) as used,
      (select count(*)::int from public.usage_events e where e.user_id = $1 and e.endpoint = $2 and e.created_at > now() - interval '1 minute') as recent
    from public.profiles p where p.user_id = $1`, [userId, CHAT_ENDPOINT]);
  if (!r || r.status !== "approved") throw new GatewayError(403, "account_paused", "This account is paused.");
  if (Number(r.used) >= r.allowance) throw new GatewayError(429, "allowance_exhausted", "This month's audio allowance is used up.");
  if (r.recent >= LIMITS.playgroundPerMin) throw new GatewayError(429, "rate_limited", "Too many requests. Wait a minute and try again.");
}

/** Records one text step; a failure to record never fails the conversation. */
export const recordChat = (userId: string, status: number, characters: number, latencyMs: number) =>
  sql(`insert into public.usage_events (user_id, endpoint, model, characters, status, latency_ms) values ($1, $2, 'air', $3, $4, $5)`,
    [userId, CHAT_ENDPOINT, characters, status, latencyMs]).then(() => undefined, () => undefined);
