import React, { useCallback, useEffect, useState } from "react";
import AuthScreen from "./pages/AuthPage.jsx";
import { ActionErrorContext } from "./components/ui/FormModal.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { AppRoutes } from "./navigation/AppRoutes.jsx";
import { canAccessPage, firstPage } from "./navigation/catalog.js";
import { useSession } from "./hooks/useSession.js";
import { useAuthForm } from "./hooks/useAuthForm.js";
import { emptyOrganization, loadOrganization } from "./services/loadOrganization.js";

// Conecta a sessão, os dados compartilhados e a tela selecionada.
export default function App() {
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(emptyOrganization);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const session = useSession(setError);
  const authForm = useAuthForm(session, error, setError);
  const { auth, api, demoChecking, demoMode } = session;

  const refresh = useCallback(async () => {
    const organization = await loadOrganization(api);
    setProfile(organization.profile);
    setData(organization.data);
    setSummary(organization.summary);
    setPage((current) =>
      canAccessPage(current, organization.profile) ? current : firstPage(organization.profile),
    );
  }, [api]);

  useEffect(() => {
    if (auth) refresh().catch((error) => setError(error.message));
    else {
      setProfile(null);
      setData(emptyOrganization);
      setSummary(null);
    }
  }, [auth, refresh]);

  function navigate(nextPage) {
    setPage(canAccessPage(nextPage, profile) ? nextPage : firstPage(profile));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // Retorna false para manter o formulário aberto quando uma ação falhar.
  async function doAction(action) {
    setError("");
    try {
      await action();
      await refresh();
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  }

  if (demoChecking || (!auth && demoMode) || (auth && !profile)) {
    return (
      <main className="main">
        <p>{error || "Carregando sessão…"}</p>
      </main>
    );
  }
  if (!auth) return <AuthScreen {...authForm} />;

  const context = { api, data, summary, profile, refresh, doAction, setPage: navigate, auth };
  return (
    <ActionErrorContext.Provider value={error}>
      <AppLayout
        profile={profile}
        page={page}
        expenses={data.expenses}
        demoMode={demoMode}
        signOut={session.signOut}
        error={error}
        setError={setError}
        onNavigate={navigate}
      >
        <AppRoutes page={page} context={context} />
      </AppLayout>
    </ActionErrorContext.Provider>
  );
}
