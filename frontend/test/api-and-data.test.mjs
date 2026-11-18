import test from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "../src/services/client.js";
import { postAuth, registrationError } from "../src/services/auth.js";
import { loadOrganization } from "../src/services/loadOrganization.js";
import { apiFetch } from "../src/services/api.js";

test("cliente envia Bearer e JSON e aceita resposta vazia da exclusão", async () => {
  const calls = [];
  const api = createApiClient(
    "token-de-teste",
    () => assert.fail("sessão válida"),
    async (path, options) => {
      calls.push({ path, options });
      return new Response(null, { status: 204 });
    },
  );
  assert.equal(
    await api("meetings/7", "DELETE", { confirmed: true, password: "senha-ficticia" }),
    null,
  );
  assert.equal(calls[0].path, "/api/meetings/7");
  assert.equal(calls[0].options.method, "DELETE");
  assert.equal(calls[0].options.headers.Authorization, "Bearer token-de-teste");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    confirmed: true,
    password: "senha-ficticia",
  });
});

test("erro 401 expira a sessão; senha incorreta 403 mantém a sessão", async () => {
  let expired = 0;
  const unauthorized = createApiClient(
    "token",
    () => expired++,
    async () => new Response("", { status: 401 }),
  );
  await assert.rejects(unauthorized("me"), /Sessão expirada/);
  assert.equal(expired, 1);
  const forbidden = createApiClient(
    "token",
    () => expired++,
    async () => Response.json({ error: "Senha incorreta" }, { status: 403 }),
  );
  await assert.rejects(forbidden("meetings/7", "DELETE", {}), /Senha incorreta/);
  assert.equal(expired, 1);
});

test("cliente não envia corpo ou Content-Type em consultas GET", async () => {
  const api = createApiClient(
    "",
    () => {},
    async (path, options) => {
      assert.equal(options.method, "GET");
      assert.equal(options.body, undefined);
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.headers["Content-Type"], undefined);
      return Response.json([{ id: 1 }]);
    },
  );
  assert.deepEqual(await api("students"), [{ id: 1 }]);
});

test("login e convites são enviados sem token de outra sessão", async () => {
  const result = await postAuth(
    "auth/login",
    { identifier: "pessoa", password: "ficticia" },
    "Falha",
    async (path, options) => {
      assert.equal(path, "/api/auth/login");
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { identifier: "pessoa", password: "ficticia" });
      return Response.json({ accessToken: "novo-token" });
    },
  );
  assert.equal(result.accessToken, "novo-token");
});

test("cadastro exibe mensagem da API ou mensagem útil para resposta HTML", async () => {
  await assert.rejects(
    postAuth("setup", {}, registrationError, async () =>
      Response.json({ error: "Login em uso" }, { status: 409 }),
    ),
    /Login em uso/,
  );
  await assert.rejects(
    postAuth(
      "setup",
      {},
      registrationError,
      async () => new Response("<html>erro</html>", { status: 409 }),
    ),
    /já está cadastrado/,
  );
});

for (const [name, profile, expected] of [
  [
    "Dia a Dia",
    { role: "INSTRUCTOR", dayToDayAccess: true, managementAccess: false },
    ["me", "workshops", "students", "instructors"],
  ],
  [
    "Gestão",
    { role: "INSTRUCTOR", dayToDayAccess: false, managementAccess: true },
    ["me", "projects", "ledger", "instructors"],
  ],
  ["nenhuma área", { role: "INSTRUCTOR", dayToDayAccess: false, managementAccess: false }, ["me"]],
  [
    "administrador",
    { role: "ADMIN", dayToDayAccess: false, managementAccess: false },
    ["me", "workshops", "students", "projects", "ledger", "reports/summary", "instructors"],
  ],
]) {
  test(`carregamento respeita acesso de ${name}`, async () => {
    const calls = [];
    const result = await loadOrganization(async (path) => {
      calls.push(path);
      if (path === "me") return profile;
      if (path === "ledger")
        return [
          { id: 1, type: "EXPENSE" },
          { id: 2, type: "DONATION" },
        ];
      if (path === "reports/summary") return { students: 2 };
      return [];
    });
    assert.deepEqual(calls, expected);
    assert.deepEqual(result.profile, profile);
    assert.deepEqual(
      result.data.expenses.map((row) => row.id),
      expected.includes("ledger") ? [1] : [],
    );
    assert.equal(result.summary?.students ?? null, expected.includes("reports/summary") ? 2 : null);
  });
}

test("transporte não envia cookies e recusa destinos fora da API", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    assert.equal(path, "/api/me");
    assert.equal(options.credentials, "omit");
    return Response.json({ id: 1 });
  };
  try {
    await apiFetch("/api/me", { credentials: "include" });
    assert.throws(() => apiFetch("https://outro-site.example"), /inválido/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
