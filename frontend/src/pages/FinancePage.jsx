import { filterSummaryRows } from "../features/finance/summary.js";
import { FormModal } from "../components/ui/FormModal.jsx";
import { SectionNav } from "../components/ui/SectionNav.jsx";
import React, { useEffect, useRef, useState } from "react";
import { fields, initial, statuses, types } from "../features/finance/constants.js";
import { day, downloadBlob, mask, money, numeric, value } from "../features/finance/utils.js";
import { apiFetch } from "../services/api.js";
import { ExportModal } from "../features/finance/components/ExportModal.jsx";
import { Detail } from "../features/finance/components/TransactionDetailsModal.jsx";

export function FinanceView({ data, api, refresh, section = "summary", setPage, initialProject }) {
  const [summaryProject, setSummaryProject] = useState(
    initialProject ? String(initialProject) : "",
  );
  useEffect(() => {
    if (initialProject) setSummaryProject(String(initialProject));
  }, [initialProject]);
  const returnSection = useRef(section === "register" ? "summary" : section);
  useEffect(() => {
    if (section !== "register") returnSection.current = section;
  }, [section]);
  const viewSection = section === "register" ? returnSection.current : section;
  const [summaryFrom, setSummaryFrom] = useState("");
  const [summaryUntil, setSummaryUntil] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [form, setForm] = useState(initial);
  const [files, setFiles] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [selectedTypes, setSelectedTypes] = useState({ EXPENSE: true, DONATION: true });
  const [fileError, setFileError] = useState("");
  const [detail, setDetail] = useState(null);
  const formRef = useRef(null);
  const [relatedPeople, setRelatedPeople] = useState({
    participants: [],
    instructors: [],
    members: [],
  });
  function togglePerson(field, id, checked) {
    setForm((previous) => ({
      ...previous,
      [field]: checked ? [...previous[field], id] : previous[field].filter((value) => value !== id),
    }));
  }
  function addFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const next = [...files];
    for (const f of picked) {
      if (
        !next.some(
          (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified,
        )
      )
        next.push(f);
    }
    if (
      next.some((f) => !/[.](pdf|png|jpe?g)$/i.test(f.name) || !f.size || f.size > 15 * 1024 * 1024)
    ) {
      setFileError("Use PDF, PNG ou JPG, não vazio e de até 15 MB.");
      return;
    }
    if (next.length > 5 || next.reduce((n, f) => n + f.size, 0) > 30 * 1024 * 1024) {
      setFileError(
        "O limite é de 5 arquivos e 30 MB no total. Remova um anexo antes de adicionar outros.",
      );
      return;
    }
    setFiles(next);
    setFileError("");
  }
  function toggleType(k) {
    setSelectedTypes((previous) => {
      const next = { ...previous, [k]: !previous[k] };
      return next.EXPENSE || next.DONATION ? next : previous;
    });
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function load() {
    const [ledger, people] = await Promise.all([api("ledger"), api("ledger/people")]);
    setRows(ledger);
    setRelatedPeople(people);
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    let created = false;
    try {
      if (numeric(form.amount) <= 0) throw Error("Informe um valor maior que zero.");
      if (
        files.length > 5 ||
        files.some((f) => f.size === 0 || f.size > 15 * 1024 * 1024) ||
        files.reduce((n, f) => n + f.size, 0) > 30 * 1024 * 1024
      )
        throw Error("Envie até 5 arquivos, de até 15 MB cada e 30 MB no total.");
      const body = new FormData();
      body.append(
        "data",
        JSON.stringify({
          ...form,
          staffExpense: form.type === "EXPENSE" && form.staffExpense,
          participantIds: form.type === "EXPENSE" ? form.participantIds : [],
          instructorIds: form.type === "EXPENSE" ? form.instructorIds : [],
          memberIds: form.type === "EXPENSE" ? form.memberIds : [],
          amount: numeric(form.amount),
          projectId: form.projectId ? Number(form.projectId) : null,
          workshopId: form.type === "EXPENSE" && form.workshopId ? Number(form.workshopId) : null,
        }),
      );
      files.forEach((f) => body.append("files", f));
      const res = await apiFetch("/api/ledger", {
        method: "POST",
        headers: { Authorization: "Bearer " + sessionStorage.getItem("ong-auth") },
        body,
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw Error(
          result.message ||
            result.detail ||
            "Não foi possível registrar. Confira os campos e os anexos.",
        );
      }
      created = true;
      setForm(initial);
      setFiles([]);
      setFileError("");
      formRef.current.reset();
      setNotice("Lançamento registrado com sucesso.");
      await load();
      await refresh();
      setPage("finance:ledger");
    } catch (e) {
      setError(
        created
          ? "O lançamento foi registrado, mas a lista não atualizou. Atualize a página."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  const normalize = (v) =>
    String(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const invalidRange = from && until && from > until;
  const filtered = rows
    .filter(
      (r) =>
        !invalidRange &&
        selectedTypes[r.type === "EXPENSE" ? "EXPENSE" : "DONATION"] &&
        (!from || r.date >= from) &&
        (!until || r.date <= until) &&
        Object.entries(filters).every(
          ([k, v]) =>
            !v ||
            (k === "amount"
              ? Math.round(Number(r.amount) * 100) === Math.round(numeric(v) * 100)
              : k === "status"
                ? r.status === v
                : normalize(value(r, k)).includes(normalize(v))),
        ),
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);
  const summaryInvalid = !!(summaryFrom && summaryUntil && summaryFrom > summaryUntil);
  const summaryRows = filterSummaryRows(rows, {
    from: summaryFrom,
    until: summaryUntil,
    project: summaryProject,
  });
  const receivedCents = summaryRows
    .filter((r) => r.type !== "EXPENSE")
    .reduce((n, r) => n + Math.round(Number(r.amount) * 100), 0);
  const expenseCents = summaryRows
    .filter((r) => r.type === "EXPENSE" && r.status === "APPROVED")
    .reduce((n, r) => n + Math.round(Number(r.amount) * 100), 0);
  const cash = (receivedCents - expenseCents) / 100;
  const summaryValue = (n) => (loading || summaryInvalid ? "—" : money(n));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    setPageNumber(1);
  }, [filters, from, until, selectedTypes, pageSize]);
  useEffect(() => {
    setPageNumber((p) => Math.min(p, totalPages));
  }, [totalPages]);
  function exportCsv(scope) {
    const exportRows = scope === "page" ? pageRows : filtered;
    const safe = (v) =>
      '"' + String(/^[=+@\-\t\r]/.test(String(v)) ? "'" + v : v).replace(/"/g, '""') + '"';
    const csv = [
      Object.values(fields),
      ...exportRows.map((r) => Object.keys(fields).map((k) => value(r, k))),
    ]
      .map((r) => r.map(safe).join(";"))
      .join("\r\n");
    downloadBlob(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
      scope === "page" ? "lancamentos-pagina-" + currentPage + ".csv" : "lancamentos-filtrados.csv",
    );
    setExportOpen(false);
  }
  return (
    <>
      <div className="heading">
        <div>
          <h1>Financeiro</h1>
          <p>Acompanhe o caixa, confira os registros e mantenha as contas em dia.</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => setPage("finance:register")}
        >
          + Novo lançamento
        </button>
      </div>
      <SectionNav
        label="Seções do financeiro"
        value={viewSection}
        onChange={(next) => setPage("finance:" + next)}
        items={[
          ["summary", "Resumo"],
          ["ledger", "Lançamentos"],
        ]}
      />
      <section
        className="summary-period"
        aria-label="Período dos indicadores"
        hidden={viewSection !== "summary"}
      >
        <div>
          <strong>Resumo financeiro</strong>
          <p>
            O projeto e as datas atualizam os quatro indicadores. Sem filtros, considera todo o
            histórico.
          </p>
        </div>
        <div className="ledger-actions">
          <label>
            Projeto do resumo
            <select value={summaryProject} onChange={(e) => setSummaryProject(e.target.value)}>
              <option value="">Todos os projetos</option>
              <option value="none">Sem projeto</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data inicial do resumo
            <input
              type="date"
              value={summaryFrom}
              max={summaryUntil || undefined}
              onChange={(e) => setSummaryFrom(e.target.value)}
            />
          </label>
          <label>
            Data final do resumo
            <input
              type="date"
              value={summaryUntil}
              min={summaryFrom || undefined}
              onChange={(e) => setSummaryUntil(e.target.value)}
            />
          </label>
          <button
            className="secondary"
            onClick={() => {
              setSummaryFrom("");
              setSummaryUntil("");
              setSummaryProject("");
            }}
          >
            Limpar filtros do resumo
          </button>
        </div>
        {summaryInvalid && (
          <p className="error" role="alert">
            A data final deve ser igual ou posterior à data inicial.
          </p>
        )}
        <div className="stats summary-cards" aria-live="polite">
          <article>
            <small>Total recebido</small>
            <b>{summaryValue(receivedCents / 100)}</b>
          </article>
          <article>
            <small>Despesas aprovadas</small>
            <b>{summaryValue(expenseCents / 100)}</b>
          </article>
          <article>
            <small>Lançamentos</small>
            <b>{loading || summaryInvalid ? "—" : summaryRows.length}</b>
          </article>
          <article className={cash < 0 ? "cash-card cash-negative" : "cash-card"}>
            <small>Caixa atual</small>
            <b>{summaryValue(cash)}</b>
            <span className="cash-caption">Recebido menos despesas aprovadas no período</span>
          </article>
        </div>
      </section>
      {error && section !== "register" && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && section !== "register" && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}
      <FormModal
        title="Novo lançamento"
        open={section === "register"}
        busy={busy}
        onClose={() => setPage("finance:" + returnSection.current)}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <form ref={formRef} className="form" onSubmit={save}>
          <label>
            Tipo
            <select value={form.type} disabled={busy} onChange={(e) => set("type", e.target.value)}>
              <option value="DONATION">Doação</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </label>
          {form.type === "DONATION" && (
            <label>
              Doador / origem
              <input
                maxLength={255}
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              />
            </label>
          )}
          <label>
            Vincular a projeto{form.type === "DONATION" ? " (opcional)" : ""}
            <select
              required={form.type === "EXPENSE"}
              disabled={busy}
              value={form.projectId}
              onChange={(e) => set("projectId", e.target.value)}
            >
              <option value="">
                {form.type === "EXPENSE"
                  ? "Selecione um projeto"
                  : "Selecione um projeto (opcional)"}
              </option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {form.type === "EXPENSE" && (
            <fieldset className="expense-people full-field">
              <legend>Responsabilidade da despesa</legend>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.staffExpense}
                  disabled={busy}
                  onChange={(e) => set("staffExpense", e.target.checked)}
                />
                Despesa da equipe (staff)
              </label>
              <p className="section-description">
                Marque quando o gasto foi por conta da equipe. Os vínculos abaixo são opcionais.
              </p>
              <details>
                <summary>Vincular equipe e participantes</summary>
                {[
                  ["members", "memberIds", "Membros da equipe"],
                  ["instructors", "instructorIds", "Instrutores"],
                  ["participants", "participantIds", "Participantes"],
                ].map(([source, field, title]) => (
                  <fieldset className="linked-people-list" key={field}>
                    <legend>{title}</legend>
                    {!relatedPeople[source].length ? (
                      <p>Nenhum cadastro disponível.</p>
                    ) : (
                      relatedPeople[source].map((person) => (
                        <label className="check" key={person.id}>
                          <input
                            type="checkbox"
                            disabled={busy}
                            checked={form[field].includes(person.id)}
                            onChange={(e) => togglePerson(field, person.id, e.target.checked)}
                          />
                          {person.name}
                        </label>
                      ))
                    )}
                  </fieldset>
                ))}
              </details>
            </fieldset>
          )}
          <label>
            Descrição
            <input
              required
              maxLength={255}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          {form.type === "EXPENSE" && (
            <>
              <label>
                Oficina (opcional)
                <select value={form.workshopId} onChange={(e) => set("workshopId", e.target.value)}>
                  <option value="">Sem vínculo</option>
                  {data.workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Categoria
                <input
                  required
                  maxLength={255}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                />
              </label>
              <label>
                Referência do documento
                <input
                  maxLength={255}
                  value={form.reference}
                  onChange={(e) => set("reference", e.target.value)}
                />
              </label>
            </>
          )}
          <label>
            Valor (R$)
            <input
              required
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={form.amount}
              onChange={(e) => set("amount", mask(e.target.value))}
            />
          </label>
          <label>
            Data
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </label>
          <label>
            Anexos (PDF, PNG ou JPG)
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              disabled={busy}
              onChange={addFiles}
            />
            <small>
              Adicione arquivos juntos ou um de cada vez. Até 5 arquivos, 15 MB por arquivo e 30 MB
              no total.
            </small>
            <span aria-live="polite">{files.length} de 5 anexos selecionados</span>
            {fileError && (
              <span role="alert" className="error">
                {fileError}
              </span>
            )}
          </label>
          <ul className="ledger-selected-files">
            {files.map((f, i) => (
              <li key={f.name + f.size + f.lastModified}>
                <span>
                  {f.name}
                  <small>{(f.size / 1024).toFixed(1)} KB</small>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={"Remover anexo " + f.name}
                  onClick={() => {
                    setFiles(files.filter((_, n) => n !== i));
                    setFileError("");
                  }}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
          <label>
            Observação
            <textarea
              maxLength={5000}
              value={form.observation}
              onChange={(e) => set("observation", e.target.value)}
            />
          </label>
          <button disabled={busy}>{busy ? "Registrando…" : "Registrar"}</button>
        </form>
      </FormModal>
      <section className="panel" hidden={viewSection !== "ledger"}>
        <h2>Lançamentos</h2>
        <div className="ledger-actions">
          <label>
            Data inicial
            <input
              type="date"
              value={from}
              max={until || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Data final
            <input
              type="date"
              value={until}
              min={from || undefined}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <fieldset className="ledger-type-filter">
            <legend>Tipo de lançamento</legend>
            {[
              ["EXPENSE", "Despesa"],
              ["DONATION", "Doação"],
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={selectedTypes[key]}
                  disabled={
                    selectedTypes[key] && Object.values(selectedTypes).filter(Boolean).length === 1
                  }
                  onChange={() => toggleType(key)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <button
            className="secondary"
            onClick={() => setExportOpen(true)}
            disabled={loading || !!invalidRange}
          >
            Exportar CSV
          </button>
          <button
            className="secondary"
            onClick={() => {
              setFilters({});
              setFrom("");
              setUntil("");
              setSelectedTypes({ EXPENSE: true, DONATION: true });
            }}
          >
            Limpar filtros
          </button>
        </div>
        {invalidRange && (
          <p role="alert" className="error">
            A data final deve ser igual ou posterior à data inicial.
          </p>
        )}
        <details className="ledger-filter-details">
          <summary>
            <span aria-hidden="true">☷</span> Filtros por campo{" "}
            <span className="filter-chevron" aria-hidden="true">
              ⌄
            </span>
          </summary>
          <div className="form ledger-filters">
            {Object.entries(fields)
              .filter(([k]) => !["date", "type"].includes(k))
              .map(([k, label]) => (
                <label key={k}>
                  {label}
                  {k === "status" ? (
                    <select
                      value={filters[k] || ""}
                      onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}
                    >
                      <option value="">Todas as situações</option>
                      {Object.entries(statuses).map(([id, text]) => (
                        <option key={id} value={id}>
                          {text}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      inputMode={k === "amount" ? "numeric" : undefined}
                      value={filters[k] || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          [k]: k === "amount" ? mask(e.target.value) : e.target.value,
                        })
                      }
                      placeholder={k === "amount" ? "R$ 0,00" : "Filtrar " + label.toLowerCase()}
                    />
                  )}
                </label>
              ))}
          </div>
        </details>
        <p aria-live="polite">{loading ? "Carregando…" : filtered.length + " lançamento(s)"}</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["Data", "Tipo", "Descrição", "Projeto", "Valor", "Situação"].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.type + r.id} className="ledger-clickable" onClick={() => setDetail(r)}>
                  <td data-label="Data">{day(r.date)}</td>
                  <td data-label="Tipo">{types[r.type]}</td>
                  <td data-label="Descrição">
                    <button
                      className="ledger-detail-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetail(r);
                      }}
                    >
                      {r.description}
                    </button>
                    {r.staffExpense && (
                      <small className="table-caption">
                        <span className="status-badge is-positive">Equipe (staff)</span>
                      </small>
                    )}
                  </td>
                  <td data-label="Projeto">{r.project || "—"}</td>
                  <td data-label="Valor">{money(r.amount)}</td>
                  <td data-label="Situação">{statuses[r.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !filtered.length && <p>Nenhum lançamento encontrado.</p>}
        <footer className="ledger-pagination-footer">
          <label>
            Registros por página
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[5, 10, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span aria-live="polite">
            {filtered.length
              ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length} registros`
              : "0 registros"}
          </span>
          <nav className="ledger-pagination" aria-label="Páginas dos lançamentos">
            <button
              type="button"
              disabled={currentPage === 1 || loading}
              onClick={() => setPageNumber(currentPage - 1)}
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
                    disabled={loading}
                    aria-label={"Página " + n}
                    aria-current={n === currentPage ? "page" : undefined}
                    onClick={() => setPageNumber(n)}
                  >
                    {n}
                  </button>
                </React.Fragment>
              ))}
            <button
              type="button"
              disabled={currentPage === totalPages || loading}
              onClick={() => setPageNumber(currentPage + 1)}
              aria-label="Próxima página"
            >
              ›
            </button>
          </nav>
        </footer>
      </section>
      {exportOpen && (
        <ExportModal
          pageCount={pageRows.length}
          totalCount={filtered.length}
          onClose={() => setExportOpen(false)}
          onExport={exportCsv}
        />
      )}
      {detail && (
        <Detail
          row={detail}
          close={() => setDetail(null)}
          decide={async (r, action) => {
            await api("expenses/" + r.id + "/" + action, "POST", {});
            await load();
            await refresh();
          }}
        />
      )}
    </>
  );
}
