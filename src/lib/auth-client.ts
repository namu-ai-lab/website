"use client";

import { createAuthClient } from "better-auth/client";

/* Better Auth in the browser: starts sign-in and signs out. Sessions live in an httpOnly cookie. */
export const authClient = createAuthClient();
