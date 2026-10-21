"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/* Neon Auth in the browser: every call goes to this site's /api/auth/*, which relays it to Neon. */
export const authClient = createAuthClient();
