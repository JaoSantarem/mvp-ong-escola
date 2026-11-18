import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api.js";
import { createApiClient } from "../services/client.js";

export function useSession(setError) {
  const [setupToken, setSetupToken] = useState(
    () =>
      new URLSearchParams(window.location.search).get("invite") ||
      sessionStorage.getItem("ong-setup-invite") ||
      "",
  );
  const [auth, setAuth] = useState(() =>
    setupToken ? "" : sessionStorage.getItem("ong-auth") || "",
  );
  const [demoChecking, setDemoChecking] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const api = useMemo(
    () =>
      createApiClient(auth, () => {
        sessionStorage.removeItem("ong-auth");
        setAuth("");
      }),
    [auth],
  );
  useEffect(() => {
    if (auth) {
      setDemoChecking(false);
      return;
    }
    if (setupToken || sessionStorage.getItem("ong-manual-login") === "true") {
      setDemoMode(false);
      setDemoChecking(false);
      return;
    }
    let active = true;
    apiFetch("/api/auth/demo", { method: "POST" })
      .then(async (r) => {
        if (!r.ok) throw Error("Não foi possível iniciar o acesso de teste.");
        return r.json();
      })
      .then((result) => {
        if (!active) return;
        if (result.enabled) {
          sessionStorage.setItem("ong-auth", result.accessToken);
          setDemoMode(true);
          setAuth(result.accessToken);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setDemoChecking(false);
      });
    return () => {
      active = false;
    };
  }, [auth, setupToken, setError]);
  useEffect(() => {
    const invite =
      new URLSearchParams(window.location.search).get("invite") ||
      sessionStorage.getItem("ong-setup-invite");
    if (invite) {
      sessionStorage.setItem("ong-manual-login", "true");
      sessionStorage.setItem("ong-setup-invite", invite);
      sessionStorage.removeItem("ong-auth");
      setAuth("");
      setSetupToken(invite);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  async function signOut() {
    try {
      await api("auth/logout", "POST", {});
    } catch {}
    sessionStorage.setItem("ong-manual-login", "true");
    sessionStorage.removeItem("ong-auth");
    setDemoMode(false);
    setDemoChecking(false);
    setAuth("");
  }

  return { auth, setAuth, api, demoChecking, demoMode, signOut, setupToken, setSetupToken };
}
