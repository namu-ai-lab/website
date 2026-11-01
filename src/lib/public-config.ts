/* Settings the browser may see. Only NEXT_PUBLIC_ variables belong here: Next writes their values into the client
   bundle at build time. Secrets and other server settings are read in lib/env, which the browser cannot import. */

/** The public API base developers call: the gateway on AWS (platform/aws). The old Modal address,
 *  https://namu-ai-lab--namu-gateway-api.modal.run, still answers for existing integrations.
 *  NEXT_PUBLIC_NAMU_API_BASE overrides it. */
export const apiBase = (process.env.NEXT_PUBLIC_NAMU_API_BASE || "https://api.namuai-lab.com").replace(/\/+$/, "");
