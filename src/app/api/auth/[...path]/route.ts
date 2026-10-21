import { auth } from "@/lib/auth";
import { hasAccounts } from "@/lib/env";

/* Neon Auth's endpoints, relayed: /api/auth/sign-in/email, /api/auth/sign-up/email, /api/auth/email-otp/verify-email,
   /api/auth/sign-in/social, /api/auth/get-session, /api/auth/sign-out, ... */
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };
let relay: ReturnType<ReturnType<typeof auth>["handler"]> | null = null;

const off = () => Response.json({ error: { type: "not_configured", message: "Accounts are not configured." } }, { status: 503 });
const handle = (req: Request, ctx: Ctx) => (hasAccounts() ? (relay ??= auth().handler()).POST(req, ctx) : off());

export { handle as GET, handle as POST };
