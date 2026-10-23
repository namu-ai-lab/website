/* Settings the browser may see. Only NEXT_PUBLIC_ variables belong here: Next writes their values into the client
   bundle at build time. Secrets and other server settings are read in lib/env, which the browser cannot import. */

/** The public API base developers call: the gateway on Namu's own Modal workspace (namu-ai-lab), until
 *  api.namu-ai.org points at it. NEXT_PUBLIC_NAMU_API_BASE overrides it. */
export const apiBase = (process.env.NEXT_PUBLIC_NAMU_API_BASE || "https://namu-ai-lab--namu-gateway-api.modal.run").replace(/\/+$/, "");
