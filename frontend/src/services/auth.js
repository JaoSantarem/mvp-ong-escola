import { apiFetch } from "./api.js";

// Cadastro, login e convites são públicos: nunca enviam o token da sessão anterior.
export async function postAuth(path, body, fallback, request = apiFetch) {
  const response = await request("/api/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let result = {};
  try {
    result = raw ? JSON.parse(raw) : {};
  } catch {}
  if (!response.ok) {
    const message = result.error || result.message || result.detail || result.title;
    const fallbackMessage = typeof fallback === "function" ? fallback(response.status) : fallback;
    throw Error(message || fallbackMessage || `Requisição recusada (HTTP ${response.status}).`);
  }
  return result;
}

export function registrationError(status) {
  if (status === 409)
    return "Este e-mail ou login já está cadastrado. Volte ao login e acesse a conta existente.";
  if (status === 401)
    return "A API recusou o cadastro por autenticação. Reinicie o backend atualizado e tente de novo.";
  if (status >= 500)
    return "A API encontrou um erro interno ao salvar. Confira os logs do backend para ver o motivo.";
  return `Cadastro recusado pela API (HTTP ${status}).`;
}
