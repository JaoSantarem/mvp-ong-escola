import { CardAction } from "../components/ui/CardAction.jsx";
import { hasArea } from "../navigation/catalog.js";
import { NavIcon } from "../components/ui/NavIcon.jsx";
import React, { useEffect, useState } from "react";
import { Heading } from "../components/ui/Heading.jsx";
import { brl } from "../utils/formatters.js";
import { Panel } from "../components/ui/Panel.jsx";
import { OverviewCalendar } from "../components/calendar/OverviewCalendar.jsx";

export function Dashboard({ summary: s, data, setPage, api, profile }) {
  const management = hasArea(profile, "management");
  const [workshopPage, WorkshopPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.workshops.length / 3));
  const currentPage = Math.min(workshopPage, totalPages);
  useEffect(() => {
    WorkshopPage((p) => Math.min(p, totalPages));
  }, [totalPages]);
  return (
    <>
      <Heading
        title="Visão geral"
        sub="O essencial para acompanhar o dia a dia da organização."
        action={
          management && (
            <button
              type="button"
              className="primary-button"
              onClick={() => setPage("finance:register")}
            >
              + Novo lançamento
            </button>
          )
        }
      />
      <div className="stats">
        {[
          ["Oficinas", data.workshops.length, "workshops", "workshops", "Atividades cadastradas"],
          ["Participantes", data.students.length, "people", "people", "Pessoas atendidas"],
          ["Projetos", s?.projects || 0, "projects", "projects", "Iniciativas da organização"],
          [
            "Despesas aprovadas",
            brl(s?.approvedExpenses),
            "finance:summary",
            "finance",
            "Total no histórico",
          ],
        ]
          .filter((x) => management || !["projects", "finance"].includes(x[3]))
          .map((x) => (
            <article key={x[0]} className="metric-card interactive-card">
              <div className="metric-label">
                <h2 className="metric-title">{x[0]}</h2>
                <NavIcon name={x[3]} />
              </div>
              <b>{x[1]}</b>
              <div className="metric-footer">
                <span>{x[4]}</span>
              </div>
              <CardAction label={"Ver " + x[0].toLowerCase()} onClick={() => setPage(x[2])} />
            </article>
          ))}
      </div>
      <div className={management ? "columns" : "columns single-column"}>
        {management && (
          <Panel
            title="Despesas aguardando aprovação"
            actionLabel="Ver despesas aguardando aprovação"
            onClick={() => setPage("finance:ledger")}
          >
            {data.expenses
              .filter((x) => x.status === "PENDING")
              .slice(0, 5)
              .map((x) => (
                <div className="row" key={x.id}>
                  <span>
                    {x.description}
                    <small>
                      {x.project || "Sem projeto"} · {x.category || "Sem categoria"}
                    </small>
                  </span>
                  <b>{brl(x.amount)}</b>
                </div>
              ))}
            {!data.expenses.some((x) => x.status === "PENDING") && (
              <div className="clear-state">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Tudo em dia</strong>
                  <p>Nenhuma despesa aguardando aprovação.</p>
                </div>
              </div>
            )}
          </Panel>
        )}
        <Panel title="Oficinas">
          {data.workshops.slice((currentPage - 1) * 3, currentPage * 3).map((x) => (
            <div className="row" key={x.id}>
              <span>
                {x.name}
                <small>{x.active ? "Ativa" : "Encerrada"}</small>
              </span>
              <button className="small" onClick={() => setPage("classroom:" + x.id)}>
                Abrir
              </button>
            </div>
          ))}
          {!data.workshops.length && <p>Cadastre sua primeira oficina.</p>}
          <footer className="workshop-footer">
            <div className="workshop-pagination-summary" aria-live="polite">
              {data.workshops.length
                ? `${(currentPage - 1) * 3 + 1}–${Math.min(currentPage * 3, data.workshops.length)} de ${data.workshops.length} oficinas`
                : "0 oficinas"}
            </div>
            <nav className="workshop-pagination" aria-label="Páginas de oficinas">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => WorkshopPage(currentPage - 1)}
                aria-label="Página anterior"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                .map((n, i, visible) => (
                  <React.Fragment key={n}>
                    {i > 0 && n - visible[i - 1] > 1 && <span>…</span>}
                    <button
                      type="button"
                      aria-label={"Página " + n}
                      aria-current={n === currentPage ? "page" : undefined}
                      onClick={() => WorkshopPage(n)}
                    >
                      {n}
                    </button>
                  </React.Fragment>
                ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => WorkshopPage(currentPage + 1)}
                aria-label="Próxima página"
              >
                ›
              </button>
            </nav>
            <button type="button" className="link" onClick={() => setPage("workshops")}>
              Ir para oficinas →
            </button>
          </footer>
        </Panel>
      </div>
      <OverviewCalendar api={api} workshops={data.workshops} />
    </>
  );
}
