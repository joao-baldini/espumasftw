export const usingRenderBackend = Boolean(process.env.ESPUMAS_API_KEY);
const dataOrigin = process.env.ESPUMAS_DATA_ORIGIN ?? "https://valorant-comps-fiap.jvbaldini2906.chatgpt.site";

export function backendFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (process.env.ESPUMAS_API_KEY) headers.set("Authorization", `Bearer ${process.env.ESPUMAS_API_KEY}`);
  return fetch(`${dataOrigin}${path}`, { ...init, headers, cache: "no-store" });
}
