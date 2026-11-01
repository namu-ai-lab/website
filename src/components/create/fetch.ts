/* What a failed platform request says, in the API's own words when it has them. Client-side. */
export async function apiError(res: Response, fallback: string): Promise<string> {
  const j = await res.json().catch(() => null) as { error?: { message?: string } } | null;
  return j?.error?.message ?? fallback;
}
