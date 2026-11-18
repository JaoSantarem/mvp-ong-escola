import { cashSummary } from "../features/finance/summary.js";
import { FormModal } from "../components/ui/FormModal.jsx";
import { SectionNav } from "../components/ui/SectionNav.jsx";
import React, { useEffect, useRef, useState } from "react";
import { fields, initial, statuses, types } from "../features/finance/constants.js";
import { day, downloadBlob, mask, money, numeric, value } from "../features/finance/utils.js";
import { ExportModal } from "../features/finance/components/ExportModal.jsx";
import { Detail, MovementFields } from "../features/finance/components/TransactionDetailsModal.jsx";

export function FinanceView({
  data,
  api,
  refresh,
  profile,
  section = "summary",
  setPage,
  initialProject,
}) {
  const canManage = ["ADMIN", "COORDINATOR"].includes(profile?.role);
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
  const [onlyOverdue, setOnlyOverdue] = useState(false);
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
          expected: form.type !== "EXPENSE" && form.expected,
          dueDate: form.type === "EXPENSE" || form.expected ? form.dueDate || null : null,
          schedule: form.type === "EXPENSE" || form.expected ? form.schedule : "ONCE",
          occurrences: Number(form.occurrences),
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
      const result = await api("ledger", "POST", body);
      created = true;
      setForm(initial);
      setFiles([]);
      setFileError("");
      formRef.current.reset();
      setNotice(
        result.ids?.length > 1
          ? result.ids.length + " lançamentos mensais registrados."
          : "Lançamento registrado com sucesso.",
      );
      setPage(
        "finance:" + (returnSection.current === "summary" ? "ledger" : returnSection.current),
      );
      await load();
      await refresh();
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
  const queue = viewSection === "payables" || viewSection === "receivables";
  const listDate = (row) => (queue ? row.dueDate : row.date);
  const filtered = rows
    .filter(
      (r) =>
        !invalidRange &&
        (!queue ||
          (Number(r.openAmount) > 0 && (viewSection === "payables") === (r.type === "EXPENSE"))) &&
        (!queue || !onlyOverdue || r.overdue) &&
        (queue || selectedTypes[r.type === "EXPENSE" ? "EXPENSE" : "DONATION"]) &&
        (!from || listDate(r) >= from) &&
        (!until || (listDate(r) && listDate(r) <= until)) &&
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
    .sort((a, b) =>
      queue
        ? (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || a.id - b.id
        : (b.date || "").localeCompare(a.date || "") || b.id - a.id,
    );
  const summaryInvalid = !!(summaryFrom && summaryUntil && summaryFrom > summaryUntil);
  const totals = cashSummary(rows, {
    from: summaryFrom,
    until: summaryUntil,
    project: summaryProject,
  });
  const summaryValue = (cents) => (loading || summaryInvalid ? "—" : money(cents / 100));
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
        {canManage && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setForm({
                ...initial,
                type: viewSection === "payables" ? "EXPENSE" : "DONATION",
                projectId: summaryProject === "none" ? "" : summaryProject,
              });
              setFiles([]);
              setFileError("");
              setError("");
              setNotice("");
              setPage("finance:register");
            }}
          >
            + Novo lançamento
          </button>
        )}
      </div>
      <SectionNav
        label="Seções do financeiro"
        value={viewSection}
        onChange={(next) => {
          setFilters({});
          setFrom("");
          setUntil("");
          setOnlyOverdue(false);
          setPageNumber(1);
          setPage("finance:" + next);
        }}
        items={[
          ["summary", "Resumo"],
          ["payables", "Contas a pagar"],
          ["receivables", "Contas a receber"],
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
            Pagamentos e recebimentos usam a data da baixa. Valores em aberto usam o vencimento e
            incluem despesas em aprovação.
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
          {[
            ["received", "Recebido"],
            ["paid", "Pago"],
            ["cash", "Saldo realizado no período"],
            ["toReceive", "A receber"],
            ["toPay", "A pagar"],
            ["forecast", "Saldo projetado no período"],
          ].map(([key, label]) => (
            <article
              key={key}
              className={key === "cash" || key === "forecast" ? "cash-card" : undefined}
            >
              <small>{label}</small>
              <b>{summaryValue(totals[key])}</b>
            </article>
          ))}
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
              <option value="CASH_IN">Outra entrada de caixa</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </label>
          {form.type !== "EXPENSE" && (
            <label>
              Doador / origem
              <input
                maxLength={255}
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              />
            </label>
          )}
          {form.type !== "EXPENSE" ? (
            <label>
              Situação da receita
              <select
                value={form.expected ? "expected" : "received"}
                onChange={(e) => set("expected", e.target.value === "expected")}
              >
                <option value="expected">A receber</option>
                <option value="received">Já recebida</option>
              </select>
            </label>
          ) : (
            <label>
              Fornecedor / favorecido
              <input
                required
                maxLength={255}
                value={form.beneficiary}
                onChange={(e) => set("beneficiary", e.target.value)}
              />
            </label>
          )}
          <label>
            Projeto (opcional)
            <select
              disabled={busy}
              value={form.projectId}
              onChange={(e) => set("projectId", e.target.value)}
            >
              <option value="">Sem projeto</option>
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
              {form.staffExpense && (
                <label>
                  Reembolsar a (se alguém adiantou o valor)
                  <input
                    maxLength={255}
                    value={form.reimbursementTo}
                    onChange={(e) => set("reimbursementTo", e.target.value)}
                  />
                </label>
              )}
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
            {form.type !== "EXPENSE" && !form.expected
              ? "Data do recebimento"
              : "Data do lançamento"}
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </label>
          {form.type === "EXPENSE" || form.expected ? (
            <>
              <label>
                Vencimento
                <input
                  required
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </label>
              <label>
                Frequência
                <select value={form.schedule} onChange={(e) => set("schedule", e.target.value)}>
                  <option value="ONCE">Lançamento único</option>
                  <option value="INSTALLMENTS">Dividir o valor em parcelas mensais</option>
                  <option value="REPEAT">Repetir o valor a cada mês</option>
                </select>
              </label>
              {form.schedule !== "ONCE" && (
                <label>
                  Quantidade de meses
                  <input
                    type="number"
                    required
                    min="2"
                    max="60"
                    value={form.occurrences}
                    onChange={(e) => set("occurrences", e.target.value)}
                  />
                  <small>
                    O vencimento acima será o primeiro. Os anexos ficam no primeiro lançamento.
                  </small>
                </label>
              )}
            </>
          ) : (
            <MovementFields account={form.accountName} method={form.method} set={set} />
          )}
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
      <section className="panel" hidden={viewSection !== "ledger" && !queue}>
        <h2>
          {queue
            ? viewSection === "payables"
              ? "Contas a pagar"
              : "Contas a receber"
            : "Lançamentos"}
        </h2>
        <div className="ledger-actions">
          <label>
            {queue ? "Vencimento inicial" : "Data inicial"}
            <input
              type="date"
              value={from}
              max={until || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            {queue ? "Vencimento final" : "Data final"}
            <input
              type="date"
              value={until}
              min={from || undefined}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          {queue ? (
            <label>
              <input
                type="checkbox"
                checked={onlyOverdue}
                onChange={(e) => setOnlyOverdue(e.target.checked)}
              />{" "}
              Somente vencidas
            </label>
          ) : (
            <fieldset className="ledger-type-filter">
              <legend>Tipo de lançamento</legend>
              {[
                ["EXPENSE", "Despesa"],
                ["DONATION", "Receitas"],
              ].map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={selectedTypes[key]}
                    disabled={
                      selectedTypes[key] &&
                      Object.values(selectedTypes).filter(Boolean).length === 1
                    }
                    onChange={() => toggleType(key)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          )}
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
              setOnlyOverdue(false);
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
                {[
                  queue ? "Vencimento" : "Data",
                  "Tipo",
                  "Descrição",
                  "Projeto",
                  queue ? "Em aberto" : "Valor",
                  "Situação",
                ].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.type + r.id} className="ledger-clickable" onClick={() => setDetail(r)}>
                  <td data-label={queue ? "Vencimento" : "Data"}>{day(listDate(r))}</td>
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
                  <td data-label={queue ? "Em aberto" : "Valor"}>
                    {money(queue ? r.openAmount : r.amount)}
                  </td>
                  <td data-label="Situação">
                    {statuses[r.status]}
                    {r.overdue && <small className="table-caption">Vencida</small>}
                  </td>
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
          canManage={canManage}
          api={api}
          onSaved={async () => {
            setDetail(null);
            setNotice("Lançamento atualizado.");
            try {
              await load();
              await refresh();
            } catch {
              setError("Alteração salva. Atualize a página para consultar o saldo.");
            }
          }}
        />
      )}
    </>
  );
}
