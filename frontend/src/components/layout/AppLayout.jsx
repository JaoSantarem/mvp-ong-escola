import React from "react";
import { NavIcon } from "../ui/NavIcon.jsx";
import { useMobileMenu } from "../../hooks/useMobileMenu.js";
import { destination, visibleCategories } from "../../navigation/catalog.js";

export function AppLayout({
  profile,
  page,
  expenses,
  demoMode,
  signOut,
  error,
  setError,
  onNavigate,
  children,
}) {
  const { menuOpen, setMenuOpen } = useMobileMenu();
  const navigation = visibleCategories(profile);
  const current = destination(page);
  const pendingExpenses = expenses.filter((expense) => expense.status === "PENDING").length;

  function navigate(nextPage) {
    setMenuOpen(false);
    onNavigate(nextPage);
  }

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
          <small>{profile?.role === "ADMIN" ? "Administrador" : "Equipe da organização"}</small>
        </div>
        <nav aria-label="Navegação principal">
          {navigation.map((category) => (
            <section
              className="nav-category"
              key={category.id}
              aria-labelledby={"nav-" + category.id}
            >
              <h2 id={"nav-" + category.id}>{category.title}</h2>
              {category.items.map((item) => (
                <button
                  className={current.page === item.page ? "active" : ""}
                  key={item.page}
                  aria-current={current.page === item.page ? "page" : undefined}
                  onClick={() => navigate(item.page)}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.title}</span>
                  {item.page === "finance:summary" && pendingExpenses > 0 && (
                    <em aria-label="Despesas pendentes">{pendingExpenses}</em>
                  )}
                </button>
              ))}
            </section>
          ))}
        </nav>
        {demoMode ? (
          <div className="demo-note">
            <span /> Ambiente de demonstração
            <button type="button" className="demo-signin" onClick={signOut}>
              Entrar com minha conta
            </button>
          </div>
        ) : (
          <button className="logout" onClick={signOut}>
            Sair
          </button>
        )}
      </aside>
      <main id="main-content" tabIndex={-1} className="main">
        <header>
          <span>
            {current.category} / {current.title}
          </span>
          <div className="account-summary">
            <small>{profile?.email}</small>
          </div>
        </header>
        {error && (
          <div className="error banner" role="alert">
            {error}
            <button aria-label="Fechar mensagem de erro" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
