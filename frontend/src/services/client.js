import { apiFetch } from "./api.js";

// As telas usam api("students", "POST", dados), sem repetir os detalhes HTTP.
export function createApiClient(auth, onSessionExpired, request = apiFetch) {
  return async function api(path, method = "GET", body) {
    const headers = { ...(auth ? { Authorization: "Bearer " + auth } : {}) };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const r = await request("/api/" + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (r.status === 401) {
      onSessionExpired();
      throw Error("Sessão expirada ou token inválido. Entre novamente.");
    }
    if (!r.ok) {
      const t = await r.text();
      let message = t;
      try {
        const parsed = JSON.parse(t);
        message = parsed.error || parsed.message || parsed.detail || t;
      } catch {}
      throw Error(message || r.statusText);
    }
    return r.status === 204 ? null : r.json();
  };
}
