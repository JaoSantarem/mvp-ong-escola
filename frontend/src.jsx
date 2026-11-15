import { apiFetch } from "./api.js";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AuthScreen from "./AuthScreen.jsx";
import { Dashboard, WorkshopList, People, Team, Projects, Finance, Classroom } from "./views.jsx";
import "./style.css";
function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoChecking, setDemoChecking] = useState(true),
    [demoMode, setDemoMode] = useState(false);
  const [auth, setAuth] = useState(sessionStorage.getItem("ong-auth") || ""),
    [profile, setProfile] = useState(null),
    [page, setPage] = useState("dashboard"),
    [data, setData] = useState({ workshops: [], students: [], projects: [], expenses: [] }),
    [summary, setSummary] = useState(null),
    [error, setError] = useState(""),
    [setup, S] = useState(false),
    [registered, Reg] = useState(false),
    [busy, B] = useState(false),
    [org, O] = useState(""),
    [kind, K] = useState("ONG"),
    [loginName, LN] = useState(""),
    [loginId, LI] = useState(""),
    [email, E] = useState(""),
    [password, P] = useState(""),
    [passwordConfirmation, PC] = useState(""),
    [firstPasswordSetup, FPS] = useState(false),
    [passwordNotice, PN] = useState(false),
    [setupToken, ST] = useState(
      () =>
        new URLSearchParams(window.location.search).get("invite") ||
        sessionStorage.getItem("ong-setup-invite") ||
        "",
    );
  useEffect(() => {
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
  }, [auth === ""]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement;
    const sidebar = document.getElementById("app-navigation");
    const focusable = () =>
      Array.from(sidebar.querySelectorAll('button,a[href],input,select,[tabindex="0"]'));
    focusable()[0]?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keydown(e) {
      if (e.key === "Escape") setMenuOpen(false);
      if (e.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [menuOpen]);
  function navigate(next) {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function api(path, method = "GET", body) {
    const headers = { ...(auth ? { Authorization: "Bearer " + auth } : {}) };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const r = await apiFetch("/api/" + path, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (r.status === 401) {
      sessionStorage.removeItem("ong-auth");
      setAuth("");
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
  }
  async function refresh() {
    const [me, workshops, students, projects, expenses, s, instructors] = await Promise.all(
      ["me", "workshops", "students", "projects", "expenses", "reports/summary", "instructors"].map(
        (x) => api(x),
      ),
    );
    setProfile(me);
    setData({ workshops, students, projects, expenses, instructors });
    setSummary(s);
  }
  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get("invite");
    if (invite) {
      sessionStorage.setItem("ong-setup-invite", invite);
      sessionStorage.removeItem("ong-auth");
      setAuth("");
      ST(invite);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  useEffect(() => {
    if (auth) refresh().catch((e) => setError(e.message));
  }, [auth]);
  async function sign(e) {
    e.preventDefault();
    B(true);
    setError("");
    try {
      if (setup) {
        const r = await apiFetch("/api/setup", {
          method: "POST",
          credentials: "omit",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization: org,
            organizationType: kind,
            login: loginName,
            email,
            password,
          }),
        });
        if (!r.ok) {
          const raw = await r.text();
          let message = "";
          try {
            const body = JSON.parse(raw);
            message = body.error || body.message || body.detail || body.title || "";
          } catch {
            if (raw && !raw.includes("<html")) message = raw.trim();
          }
          if (!message && r.status === 409)
            message =
              "Este e-mail ou login já está cadastrado. Volte ao login e acesse a conta existente.";
          if (!message && r.status === 401)
            message =
              "A API recusou o cadastro por autenticação. Reinicie o backend atualizado e tente de novo.";
          if (!message && r.status >= 500)
            message =
              "A API encontrou um erro interno ao salvar. Confira a saída da janela Run do backend para ver o motivo.";
          if (!message) message = "Cadastro recusado pela API (HTTP " + r.status + ").";
          throw Error(message);
        }
        LI(loginName);
        Reg(true);
        P("");
        return;
      }
      if (firstPasswordSetup) {
        if (password !== passwordConfirmation) throw Error("As senhas não coincidem.");
        const r = await apiFetch("/api/auth/password-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: loginId.trim(),
            setupToken,
            password,
            confirmation: passwordConfirmation,
          }),
        });
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw Error(body.error || "Não foi possível definir a senha.");
        }
        sessionStorage.removeItem("ong-setup-invite");
        ST("");
        FPS(false);
        P("");
        PC("");
        PN(true);
        return;
      }
      if (!password.trim()) {
        if (!setupToken)
          throw Error(
            "Para definir a primeira senha, abra o link de primeiro acesso fornecido pelo administrador e informe seu login.",
          );
        const r = await apiFetch("/api/auth/password-setup/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: loginId.trim(), setupToken }),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw Error(body.error || "Convite inválido ou expirado.");
        if (body.passwordSetupRequired) {
          FPS(true);
          PN(false);
          P("");
          PC("");
          return;
        }
      }
      const r = await apiFetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginId.trim(), password }),
      });
      const raw = await r.text();
      let result = {};
      try {
        result = raw ? JSON.parse(raw) : {};
      } catch {}
      if (!r.ok)
        throw Error(
          result.error || result.message || "Não foi possível entrar (HTTP " + r.status + ").",
        );
      sessionStorage.setItem("ong-auth", result.accessToken);
      setAuth(result.accessToken);
    } catch (x) {
      setError(x.message);
    } finally {
      B(false);
    }
  }
  async function doAction(fn) {
    setError("");
    try {
      await fn();
      await refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }
  if (demoChecking || (!auth && demoMode))
    return (
      <main className="main">
        <p>{error || "Entrando como usuário de teste…"}</p>
      </main>
    );
  if (!auth)
    return (
      <AuthScreen
        setup={setup}
        setSetup={S}
        registered={registered}
        setRegistered={Reg}
        sign={sign}
        busy={busy}
        error={error}
        org={org}
        setOrg={O}
        kind={kind}
        setKind={K}
        loginName={loginName}
        setLoginName={LN}
        loginId={loginId}
        setLoginId={LI}
        email={email}
        setEmail={E}
        password={password}
        setPassword={P}
        firstPasswordSetup={firstPasswordSetup}
        setFirstPasswordSetup={FPS}
        passwordConfirmation={passwordConfirmation}
        setPasswordConfirmation={PC}
        passwordNotice={passwordNotice}
      />
    );
  const ctx = { api, data, summary, profile, refresh, doAction, setPage: navigate, auth };
  const pages = {
    dashboard: <Dashboard {...ctx} />,
    workshops: <WorkshopList {...ctx} />,
    people: <People {...ctx} />,
    team: <Team {...ctx} />,
    projects: <Projects {...ctx} />,
    finance: <Finance {...ctx} />,
    classroom: <Classroom {...ctx} />,
  };
  const links = [
    ["dashboard", "Visão geral"],
    ["workshops", "Oficinas"],
    ["people", "Participantes"],
    ["team", "Equipe"],
    ["projects", "Projetos"],
    ["finance", "Financeiro"],
  ];
  return (
    <div className={"shell" + (menuOpen ? " menu-open" : "")}>
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <div className="mobile-bar">
        <div className="brand">
          <i>GS</i>
          <span>
            <b>Gestão Social</b>
            <small>{profile?.organization || "ONGs e escolas"}</small>
          </span>
        </div>
        <button
          id="menu-toggle"
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="app-navigation"
          onClick={() => setMenuOpen(true)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
      </div>
      {menuOpen && (
        <button
          className="nav-backdrop"
          aria-label="Fechar menu de navegação"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside id="app-navigation" aria-label="Menu principal">
        <button
          type="button"
          className="nav-close"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        >
          ×
        </button>
        <div className="brand">
          <i>GS</i>
          <span>
            <b>Gestão Social</b>
            <small>ONGs e escolas</small>
          </span>
        </div>
        <div className="org">
          {profile?.organization}
          <small>{profile?.role}</small>
        </div>
        <nav aria-label="Navegação principal">
          {links.map(([k, v]) => (
            <button
              className={page === k ? "active" : ""}
              key={k}
              aria-current={page === k ? "page" : undefined}
              onClick={() => navigate(k)}
            >
              {v}
              {k === "finance" && data.expenses.some((x) => x.status === "PENDING") && <em>!</em>}
            </button>
          ))}
        </nav>
        {demoMode ? (
          <div className="org">
            Usuário de teste<small>Modo demonstração</small>
          </div>
        ) : (
          <button
            className="logout"
            onClick={async () => {
              try {
                await api("auth/logout", "POST", {});
              } catch {}
              sessionStorage.removeItem("ong-auth");
              setAuth("");
            }}
          >
            Sair
          </button>
        )}
      </aside>
      <main id="main-content" tabIndex={-1} className="main">
        <header>
          <span>{links.find((x) => x[0] === page)?.[1] || "Gestão de turma"}</span>
          <small>{profile?.email}</small>
        </header>
        {error && (
          <div className="error banner" role="alert">
            {error}
            <button aria-label="Fechar mensagem de erro" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {page.startsWith("classroom:") ? (
          <Classroom {...ctx} workshopId={Number(page.split(":")[1])} />
        ) : (
          pages[page] || pages.workshops
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
