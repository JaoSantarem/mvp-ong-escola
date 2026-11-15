const apiOrigin = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
export function apiFetch(path, options = {}) {
  if (typeof path !== "string" || !path.startsWith("/api/")) throw new Error("Caminho de API inválido");
  return fetch(apiOrigin + path, { ...options, credentials: "omit" });
}