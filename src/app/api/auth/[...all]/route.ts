import { auth } from "@/lib/auth";
import { hasAccounts } from "@/lib/env";

/* Better Auth's endpoints: /api/auth/sign-in/social, /api/auth/callback/<provider>, /api/auth/sign-out, ... */
export const dynamic = "force-dynamic";

const off = () => Response.json({ error: { type: "not_configured", message: "Accounts are not configured." } }, { status: 503 });
const handle = (req: Request) => (hasAccounts() ? auth().handler(req) : off());

export { handle as GET, handle as POST };
