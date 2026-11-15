import { mergeHeaders } from './headers.js';

// Set only on the request itself, never inherited from defaults (same as axios).
const OWN_ONLY = new Set(['url', 'method', 'data']);

/** Merge two configs the way axios does: headers merge deeply, other keys are replaced. */
export function mergeConfig(config1 = {}, config2 = {}) {
  const out = {};
  for (const k of Object.keys(config1)) if (!OWN_ONLY.has(k)) out[k] = config1[k];
  for (const [k, v] of Object.entries(config2)) if (v !== undefined) out[k] = v;
  out.headers = mergeHeaders(config1.headers, config2.headers);
  return out;
}
