import { apiFetch } from "./api.js";
import FinanceView from "./FinanceView.jsx";
import React, { useEffect, useState, useRef } from "react";
const brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—");
function maskCurrency(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 15);
  return digits ? brl(Number(digits) / 100) : "";
}
function currencyNumber(value) {
  return Number(String(value).replace(/\D/g, "")) / 100;
}
function Heading({ title, sub, action }) {
  return (
    <div className="heading">
      <div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Form({ children, onSubmit }) {
  return (
    <form className="form" onSubmit={onSubmit}>
      {children}
    </form>
  );
}
function Field({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}
function Input(props) {
  return <input {...props} />;
}
function maskPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
function Dashboard({ summary: s, data, setPage, api }) {
  const [workshopPage, WorkshopPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.workshops.length / 3));
  const currentPage = Math.min(workshopPage, totalPages);
  useEffect(() => {
    WorkshopPage((p) => Math.min(p, totalPages));
  }, [totalPages]);
  return (
    <>
      <Heading title="Visão geral" sub="Acompanhe as atividades e os recursos da organização." />
      <div className="stats">
        {[
          ["Oficinas", s?.workshops || 0],
          ["Participantes", s?.participants || 0],
          ["Projetos", s?.projects || 0],
          ["Despesas aprovadas", brl(s?.approvedExpenses)],
        ].map((x) => (
          <article>
            <small>{x[0]}</small>
            <b>{x[1]}</b>
          </article>
        ))}
      </div>
      <div className="columns">
        <Panel title="Despesas aguardando aprovação">
          {data.expenses
            .filter((x) => x.status === "PENDING")
            .slice(0, 5)
            .map((x) => (
              <div className="row">
                <span>
                  {x.description}
                  <small>
                    {x.project.name} · {x.category}
                  </small>
                </span>
                <b>{brl(x.amount)}</b>
              </div>
            ))}
          {!data.expenses.some((x) => x.status === "PENDING") && (
            <p>Nenhuma pendência financeira.</p>
          )}
          <button className="link" onClick={() => setPage("finance")}>
            Abrir financeiro →
          </button>
        </Panel>
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
function WorkshopList({ data, api, refresh, doAction, setPage }) {
  const [name, N] = useState(""),
    [description, D] = useState("");
  async function create(e) {
    e.preventDefault();
    await doAction(() => api("workshops", "POST", { name, description }));
    N("");
    D("");
  }
  return (
    <>
      <Heading
        title="Oficinas e turmas"
        sub="Crie oficinas, defina a equipe e acompanhe encontros."
      />
      <Panel title="Cadastrar oficina">
        <Form onSubmit={create}>
          <Field>
            Nome
            <input
              required
              value={name}
              onChange={(e) => N(e.target.value)}
              placeholder="Ex.: Teatro e expressão"
            />
          </Field>
          <Field>
            Conteúdo / descrição
            <textarea
              value={description}
              onChange={(e) => D(e.target.value)}
              placeholder="Objetivos e conteúdo programático"
            />
          </Field>
          <button>Criar oficina</button>
        </Form>
      </Panel>
      {!data.workshops.length && (
        <div className="empty-state">
          <b>Nenhuma oficina por aqui</b>Use o formulário acima para criar a primeira turma.
        </div>
      )}
      <div className="cards">
        {data.workshops.map((w) => (
          <article>
            <small className="tag">{w.active ? "ATIVA" : "ENCERRADA"}</small>
            <h3>{w.name}</h3>
            <p>{w.description || "Sem descrição"}</p>
            <button onClick={() => setPage("classroom:" + w.id)}>Abrir turma →</button>
          </article>
        ))}
      </div>
    </>
  );
}
function People({ data, api, doAction }) {
  const [n, N] = useState(""),
    [birth, B] = useState(""),
    [guardian, G] = useState(""),
    [consent, C] = useState(false);
  async function add(e) {
    e.preventDefault();
    await doAction(() =>
      api("students", "POST", {
        name: n,
        birthDate: birth || null,
        responsibleName: guardian,
        imageConsent: consent,
      }),
    );
    N("");
    B("");
    G("");
    C(false);
  }
  return (
    <>
      <Heading title="Participantes" sub="Cadastro, responsáveis e consentimento de imagem." />
      <Panel title="Novo participante">
        <Form onSubmit={add}>
          <Field>
            Nome completo
            <input required value={n} onChange={(e) => N(e.target.value)} />
          </Field>
          <Field>
            Nascimento
            <input type="date" value={birth} onChange={(e) => B(e.target.value)} />
          </Field>
          <Field>
            Responsável (obrigatório para menor)
            <input value={guardian} onChange={(e) => G(e.target.value)} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => C(e.target.checked)} />
            Consentimento de imagem confirmado
          </label>
          <button>Cadastrar participante</button>
        </Form>
      </Panel>
      <Panel title={"Participantes cadastrados · " + data.students.length}>
        {!data.students.length && (
          <div className="empty-state">
            <b>Nenhum participante cadastrado</b>Cadastre uma pessoa para começar as matrículas.
          </div>
        )}
        <div className="table-scroll">
          <table role="table">
            <thead>
              <tr role="row">
                <th scope="col">Nome</th>
                <th scope="col">Nascimento</th>
                <th scope="col">Responsável</th>
                <th scope="col">Imagem</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {data.students.map((s) => (
                <tr role="row">
                  <td role="cell" data-label="Nome">
                    {s.name}
                  </td>
                  <td role="cell" data-label="Nascimento">
                    {date(s.birthDate)}
                  </td>
                  <td role="cell" data-label="Responsável">
                    {s.responsibleName || "—"}
                  </td>
                  <td role="cell" data-label="Imagem">
                    {s.imageConsent ? "Autorizada" : "Não autorizada"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
function Team({ api, profile, doAction }) {
  const [instructors, I] = useState([]),
    [users, U] = useState([]),
    [positions, POS] = useState([]);
  const [name, N] = useState(""),
    [area, A] = useState(""),
    [contact, C] = useState("");
  const [memberName, MN] = useState(""),
    [login, L] = useState(""),
    [email, E] = useState("");
  const [positionName, PN] = useState(""),
    [positionDescription, PD] = useState(""),
    [setupLink, SL] = useState(""),
    [resetLink, RL] = useState(""),
    [resetMember, RM] = useState("");
  async function load() {
    I(await api("instructors"));
    if (profile?.role === "ADMIN") {
      const [u, p] = await Promise.all([api("users"), api("positions")]);
      U(u);
      POS(p);
    }
  }
  useEffect(() => {
    load().catch(() => {});
  }, [profile?.role]);
  async function addInstructor(e) {
    e.preventDefault();
    await doAction(async () => {
      await api("instructors", "POST", { name, area, contact });
      I(await api("instructors"));
    });
    N("");
    A("");
    C("");
  }
  async function addMember(e) {
    e.preventDefault();
    await doAction(async () => {
      const result = await api("users", "POST", { name: memberName, login, email });
      U(await api("users"));
      SL(window.location.origin + "/?invite=" + encodeURIComponent(result.setupToken));
    });
    MN("");
    L("");
    E("");
  }
  async function addPosition(e) {
    e.preventDefault();
    await doAction(async () => {
      await api("positions", "POST", { name: positionName, description: positionDescription });
      POS(await api("positions"));
    });
    PN("");
    PD("");
  }
  async function assign(userId, value) {
    await doAction(async () => {
      const updated = await api("users/" + userId + "/position", "PUT", {
        positionId: value ? Number(value) : null,
      });
      U(users.map((u) => (u.id === userId ? updated : u)));
    });
  }
  async function resetPassword(user) {
    if (
      !window.confirm(
        `Redefinir a senha de ${user.name || user.login}? A pessoa precisará usar um link de primeiro acesso para escolher uma nova senha.`,
      )
    )
      return;
    await doAction(async () => {
      const result = await api(`users/${user.id}/password-reset`, "POST", {});
      RM(user.id);
      RL(window.location.origin + "/?invite=" + encodeURIComponent(result.setupToken));
    });
  }
  return (
    <>
      <Heading
        title="Equipe e acessos"
        sub="Cadastre membros, instrutores e cargos da organização."
      />
      <div className="columns">
        <Panel title="Novo instrutor">
          <Form onSubmit={addInstructor}>
            <Field>
              Nome
              <input required value={name} onChange={(e) => N(e.target.value)} />
            </Field>
            <Field>
              Área de atuação
              <input value={area} onChange={(e) => A(e.target.value)} />
            </Field>
            <Field>
              Contato
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={contact}
                onChange={(e) => C(maskPhone(e.target.value))}
                placeholder="(11) 91234-5678"
                pattern="\(\d{2}\) (?:\d{4}|\d{5})-\d{4}"
                title="Informe um telefone com DDD: (11) 91234-5678"
                maxLength={15}
              />
            </Field>
            <button>Cadastrar instrutor</button>
          </Form>
        </Panel>
        <Panel title="Criar membro do sistema">
          {profile?.role === "ADMIN" ? (
            <>
              <p>
                O membro será vinculado a esta organização. Um link de primeiro acesso será gerado
                para compartilhar com ele.
              </p>
              <Form onSubmit={addMember}>
                <Field>
                  Nome completo
                  <input
                    required
                    value={memberName}
                    onChange={(e) => MN(e.target.value)}
                    autoComplete="name"
                  />
                </Field>
                <Field>
                  Login
                  <input
                    required
                    minLength="3"
                    value={login}
                    onChange={(e) => L(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  E-mail
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => E(e.target.value)}
                    autoComplete="email"
                  />
                </Field>
                <button>Criar membro</button>
              </Form>
              {setupLink && (
                <div className="credential-note">
                  <b>Membro criado. Envie este link de primeiro acesso para a pessoa:</b>
                  <code>{setupLink}</code>
                  <a href={setupLink} target="_blank" rel="noreferrer">
                    Abrir link de primeiro acesso
                  </a>
                  <button className="small" onClick={() => SL("")}>
                    Fechar
                  </button>
                </div>
              )}
            </>
          ) : (
            <p>Apenas administradores podem gerenciar membros.</p>
          )}
        </Panel>
      </div>
      <Panel title={"Instrutores · " + instructors.length}>
        {instructors.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col">Nome</th>
                  <th scope="col">Área de atuação</th>
                  <th scope="col">Contato</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {instructors.map((i) => (
                  <tr role="row" key={i.id}>
                    <td role="cell" data-label="Nome">
                      {i.name}
                    </td>
                    <td role="cell" data-label="Área de atuação">
                      {i.area || "—"}
                    </td>
                    <td role="cell" data-label="Contato">
                      {i.contact || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhum instrutor cadastrado ainda.</p>
        )}
      </Panel>
      {profile?.role === "ADMIN" && (
        <>
          <Panel title={"Membros da organização · " + users.length}>
            {users.length ? (
              <div className="table-scroll">
                <table role="table">
                  <thead>
                    <tr role="row">
                      <th scope="col">Nome</th>
                      <th scope="col">Login</th>
                      <th scope="col">E-mail</th>
                      <th scope="col">Cargo</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {users.map((u) => (
                      <tr role="row" key={u.id}>
                        <td role="cell" data-label="Nome">
                          {u.name || u.login}
                        </td>
                        <td role="cell" data-label="Login">
                          {u.login}
                        </td>
                        <td role="cell" data-label="E-mail">
                          {u.email}
                        </td>
                        <td role="cell" data-label="Cargo">
                          <select
                            aria-label={"Cargo de " + (u.name || u.login)}
                            value={u.positionId || ""}
                            onChange={(e) => assign(u.id, e.target.value)}
                          >
                            <option value="">Sem cargo</option>
                            {positions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td role="cell" data-label="Ações">
                          <button type="button" className="small" onClick={() => resetPassword(u)}>
                            Redefinir senha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Nenhum membro cadastrado ainda.</p>
            )}
            {resetLink && (
              <div className="credential-note">
                <b>Link de redefinição de senha</b>
                <span>
                  Envie este link para{" "}
                  {users.find((u) => u.id === resetMember)?.name ||
                    users.find((u) => u.id === resetMember)?.login}
                  . Ele expira em 7 dias e permite cadastrar uma nova senha.
                </span>
                <code>{resetLink}</code>
                <a href={resetLink} target="_blank" rel="noreferrer">
                  Abrir link de redefinição
                </a>
                <button
                  type="button"
                  className="small"
                  onClick={() => {
                    RL("");
                    RM("");
                  }}
                >
                  Fechar
                </button>
              </div>
            )}
          </Panel>
          <Panel title="Criar cargo">
            <p>
              Os cargos descrevem a função da pessoa na equipe e não alteram as permissões técnicas
              de acesso.
            </p>
            <Form onSubmit={addPosition}>
              <Field>
                Nome do cargo
                <input
                  required
                  value={positionName}
                  onChange={(e) => PN(e.target.value)}
                  placeholder="Ex.: Educador social"
                />
              </Field>
              <Field>
                Descrição (opcional)
                <input
                  value={positionDescription}
                  onChange={(e) => PD(e.target.value)}
                  placeholder="Responsabilidades do cargo"
                />
              </Field>
              <button>Criar cargo</button>
            </Form>
            <div className="position-list">
              {positions.map((p) => (
                <div className="row" key={p.id}>
                  <span>
                    {p.name}
                    <small>{p.description || "Sem descrição"}</small>
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
function Projects({ data, api, doAction }) {
  const [n, N] = useState(""),
    [funder, F] = useState(""),
    [budget, B] = useState("");
  async function add(e) {
    e.preventDefault();
    const saved = await doAction(() =>
      api("projects", "POST", {
        name: n.trim(),
        funder: funder.trim(),
        budget: currencyNumber(budget),
      }),
    );
    if (!saved) return;
    N("");
    F("");
    B("");
  }
  return (
    <>
      <Heading
        title="Projetos e fontes"
        sub="O módulo financeiro funciona mesmo sem oficinas cadastradas."
      />
      <Panel title="Novo projeto">
        <Form onSubmit={add}>
          <Field>
            Nome do projeto
            <input
              required
              value={n}
              onChange={(e) => N(e.target.value)}
              placeholder="Ex.: Oficinas de esporte 2026"
            />
          </Field>
          <Field>
            Fonte do recurso
            <input
              value={funder}
              onChange={(e) => F(e.target.value)}
              placeholder="Doação, edital, parceria…"
            />
          </Field>
          <Field>
            Orçamento (R$)
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              value={budget}
              onChange={(e) => B(maskCurrency(e.target.value))}
              placeholder="R$ 0,00"
              aria-label="Orçamento em reais"
            />
          </Field>
          <button>Cadastrar projeto</button>
        </Form>
      </Panel>
      <Panel title={`Projetos cadastrados · ${data.projects.length}`}>
        {data.projects.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col">Projeto</th>
                  <th scope="col">Fonte do recurso</th>
                  <th scope="col">Orçamento</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {data.projects.map((p) => (
                  <tr role="row" key={p.id}>
                    <td role="cell" data-label="Projeto">
                      <strong>{p.name}</strong>
                    </td>
                    <td role="cell" data-label="Fonte do recurso">
                      {p.funder || "Fonte não informada"}
                    </td>
                    <td role="cell" data-label="Orçamento">
                      {brl(p.budget)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhum projeto cadastrado ainda.</p>
        )}
      </Panel>
    </>
  );
}

function IncomePanel({ api, version }) {
  const [rows, Rows] = useState([]),
    [error, ErrorText] = useState("");
  useEffect(() => {
    api("incomes")
      .then(Rows)
      .catch((e) => ErrorText(e.message));
  }, [version]);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <p>
        <strong>Total recebido: {brl(rows.reduce((sum, r) => sum + Number(r.amount), 0))}</strong>
      </p>
      <Panel title={"Entradas registradas · " + rows.length}>
        {!rows.length ? (
          <p>Nenhuma entrada registrada.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {["Data", "Tipo", "Descrição", "Origem", "Projeto", "Valor"].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Data">{date(r.receivedDate)}</td>
                    <td data-label="Tipo">
                      {r.type === "DONATION" ? "Doação" : "Entrada de caixa"}
                    </td>
                    <td data-label="Descrição">{r.description}</td>
                    <td data-label="Origem">{r.source || "—"}</td>
                    <td data-label="Projeto">{r.projectName || "Sem vínculo"}</td>
                    <td data-label="Valor">{brl(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function LegacyFinance({ data, api, doAction }) {
  const [type, Type] = useState("DONATION"),
    [source, Source] = useState(""),
    [incomeVersion, IncomeVersion] = useState(0),
    [saving, Saving] = useState(false),
    [notice, Notice] = useState("");
  const [project, P] = useState(""),
    [workshop, W] = useState(""),
    [description, D] = useState(""),
    [category, C] = useState(""),
    [amount, A] = useState(""),
    [day, Day] = useState(""),
    [doc, Doc] = useState(""),
    [file, File] = useState(null);
  const total = data.expenses
    .filter((x) => x.status === "APPROVED")
    .reduce((a, x) => a + Number(x.amount), 0);
  async function add(e) {
    e.preventDefault();
    if (saving) return;
    Saving(true);
    Notice("");
    const saved = await doAction(async () => {
      if (currencyNumber(amount) <= 0) throw Error("Informe um valor maior que zero.");
      if (type === "DONATION") {
        await api("incomes", "POST", {
          type: "DONATION",
          description,
          source,
          amount: currencyNumber(amount),
          receivedDate: day,
          projectId: project ? Number(project) : null,
        });
        IncomeVersion((v) => v + 1);
        return;
      }
      const expense = await api("expenses", "POST", {
        projectId: Number(project),
        workshopId: workshop ? Number(workshop) : null,
        description,
        category,
        amount: currencyNumber(amount),
        expenseDate: day,
        documentName: file?.name || doc,
      });
      if (file) {
        const form = new FormData();
        form.append("file", file);
        const r = await apiFetch("/api/expenses/" + expense.id + "/document", {
          method: "POST",
          headers: { Authorization: "Bearer " + sessionStorage.getItem("ong-auth") },
          body: form,
        });
        if (!r.ok) throw Error(await r.text());
      }
    });
    Saving(false);
    if (!saved) return;
    e.target.reset();
    Source("");
    Notice(type === "DONATION" ? "Doação registrada com sucesso." : "Despesa salva como pendente.");
    D("");
    C("");
    A("");
    Day("");
    Doc("");
    File(null);
  }
  async function getDocument(id) {
    const r = await apiFetch("/api/expenses/" + id + "/document", {
      headers: { Authorization: "Bearer " + sessionStorage.getItem("ong-auth") },
    });
    if (!r.ok) throw Error("Falha ao baixar o comprovante");
    const u = URL.createObjectURL(await r.blob()),
      a = document.createElement("a");
    a.href = u;
    a.download = "comprovante";
    a.click();
    URL.revokeObjectURL(u);
  }
  async function csv() {
    const r = await apiFetch("/api/reports/expenses.csv", {
      headers: { Authorization: "Bearer " + sessionStorage.getItem("ong-auth") },
    });
    if (!r.ok) throw Error("Falha ao exportar");
    const u = URL.createObjectURL(await r.blob()),
      a = document.createElement("a");
    a.href = u;
    a.download = "despesas.csv";
    a.click();
    URL.revokeObjectURL(u);
  }
  return (
    <>
      <Heading
        title="Financeiro e prestação de contas"
        sub="Registre doações e despesas e acompanhe os recursos da organização."
        action={
          <button className="secondary" onClick={() => doAction(csv)}>
            Exportar CSV
          </button>
        }
      />
      <div className="stats">
        <article>
          <small>Total aprovado</small>
          <b>{brl(total)}</b>
        </article>
        <article>
          <small>Pendentes</small>
          <b>{data.expenses.filter((x) => x.status === "PENDING").length}</b>
        </article>
        <article>
          <small>Lançamentos</small>
          <b>{data.expenses.length}</b>
        </article>
      </div>
      <Panel title="Registrar lançamento">
        {notice && <p role="status">{notice}</p>}
        <Form onSubmit={add}>
          <Field>
            Tipo
            <select
              disabled={saving}
              value={type}
              onChange={(e) => {
                Type(e.target.value);
                File(null);
                Notice("");
              }}
            >
              <option value="DONATION">Doação</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </Field>
          {type === "DONATION" && (
            <Field>
              Doador / origem
              <input
                value={source}
                onChange={(e) => Source(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
          )}
          <Field>
            Projeto{type === "DONATION" ? " (opcional)" : ""}
            <select
              required={type === "EXPENSE"}
              value={project}
              onChange={(e) => P(e.target.value)}
            >
              <option value="">Selecione</option>
              {data.projects.map((p) => (
                <option value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          {type === "EXPENSE" && (
            <Field>
              Oficina (opcional)
              <select value={workshop} onChange={(e) => W(e.target.value)}>
                <option value="">Sem vínculo</option>
                {data.workshops.map((w) => (
                  <option value={w.id}>{w.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field>
            Descrição
            <input required value={description} onChange={(e) => D(e.target.value)} />
          </Field>
          {type === "EXPENSE" && (
            <Field>
              Categoria
              <input
                required
                value={category}
                onChange={(e) => C(e.target.value)}
                placeholder="Equipe, materiais, serviços…"
              />
            </Field>
          )}
          <Field>
            Valor (R$)
            <input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              required
              value={amount}
              onChange={(e) => A(maskCurrency(e.target.value))}
            />
          </Field>
          <Field>
            Data
            <input type="date" required value={day} onChange={(e) => Day(e.target.value)} />
          </Field>
          {type === "EXPENSE" && (
            <>
              <Field>
                Comprovante (PDF/PNG/JPG, até 15 MB)
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={(e) => File(e.target.files?.[0] || null)}
                />
              </Field>
              <Field>
                Referência do documento
                <input value={doc} onChange={(e) => Doc(e.target.value)} placeholder="Opcional" />
              </Field>
            </>
          )}
          <button disabled={saving}>
            {saving
              ? "Salvando…"
              : type === "DONATION"
                ? "Registrar doação"
                : "Salvar como pendente"}
          </button>
        </Form>
      </Panel>
      <IncomePanel api={api} version={incomeVersion} />
      <Panel title="Despesas registradas">
        {!data.expenses.length && (
          <div className="empty-state">
            <b>Nenhuma despesa registrada</b>Selecione um projeto no formulário para lançar a
            primeira despesa.
          </div>
        )}
        <div className="table-scroll">
          <table role="table">
            <thead>
              <tr role="row">
                <th scope="col">Data / descrição</th>
                <th scope="col">Projeto</th>
                <th scope="col">Categoria</th>
                <th scope="col">Valor</th>
                <th scope="col">Situação</th>
                <th scope="col">Ação</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {data.expenses.map((x) => (
                <tr role="row">
                  <td role="cell" data-label="Data / descrição">
                    {date(x.expenseDate)} · {x.description}
                    <small>
                      {x.documentKey ? (
                        <button className="link" onClick={() => doAction(() => getDocument(x.id))}>
                          Baixar {x.documentName || "comprovante"}
                        </button>
                      ) : (
                        x.documentName || "Sem comprovante"
                      )}
                    </small>
                  </td>
                  <td role="cell" data-label="Projeto">
                    {x.project?.name}
                  </td>
                  <td role="cell" data-label="Categoria">
                    {x.category}
                  </td>
                  <td role="cell" data-label="Valor">
                    {brl(x.amount)}
                  </td>
                  <td role="cell" data-label="Situação">
                    <span className={"status " + x.status.toLowerCase()}>
                      {{ PENDING: "Pendente", APPROVED: "Aprovada", REJECTED: "Recusada" }[
                        x.status
                      ] || x.status}
                    </span>
                  </td>
                  <td role="cell" data-label="Ação">
                    {x.status === "PENDING" ? (
                      <>
                        <button
                          className="small"
                          onClick={() =>
                            doAction(() => api("expenses/" + x.id + "/approve", "POST", {}))
                          }
                        >
                          Aprovar
                        </button>{" "}
                        <button
                          className="small danger"
                          onClick={() =>
                            doAction(() => api("expenses/" + x.id + "/reject", "POST", {}))
                          }
                        >
                          Recusar
                        </button>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function AttendanceModal({ children, onClose, title }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="attendance-modal"
      aria-labelledby="attendance-title"
      onCancel={onClose}
    >
      <header>
        <h2 id="attendance-title">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar chamada">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

function OverviewCalendar({ api, workshops }) {
  const [meetings, setMeetings] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [detail, setDetail] = useState(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all(
      workshops.map(async (w) => {
        const rows = await api("workshops/" + w.id + "/meetings");
        return rows.map((m) => ({ ...m, workshopName: w.name }));
      }),
    )
      .then((rows) => {
        if (active) setMeetings(rows.flat());
      })
      .catch(() => {
        if (active)
          setError(
            "Não foi possível carregar os encontros. Atualize a página para tentar novamente.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workshops]);
  async function open(m) {
    const attendance = await api("meetings/" + m.id + "/attendance");
    setDetail({ ...m, attendance });
  }
  return (
    <>
      {loading ? (
        <Panel title="Calendário de encontros">
          <p role="status">Carregando encontros de todas as oficinas…</p>
        </Panel>
      ) : error ? (
        <Panel title="Calendário de encontros">
          <p role="alert">{error}</p>
        </Panel>
      ) : (
        <MeetingCalendar meetings={meetings} onOpen={open} detailLabel="Ver detalhes" />
      )}
      {detail && (
        <AttendanceModal
          title={"Encontro · " + date(detail.meetingDate)}
          onClose={() => setDetail(null)}
        >
          <div className="meeting-details">
            <strong>{detail.workshopName}</strong>
            <p>{detail.topic || "Conteúdo não informado"}</p>
            <p>
              {detail.startTime
                ? detail.startTime.slice(0, 5) + " – " + detail.endTime?.slice(0, 5)
                : "Horário não informado"}
            </p>
          </div>
          <h3>Alunos e presença</h3>
          {detail.attendance.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">Presença</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.attendance.map((a) => (
                    <tr key={a.student.id}>
                      <td data-label="Aluno">{a.student.name}</td>
                      <td data-label="Presença">
                        {a.id == null ? "Não registrada" : a.present ? "Presente" : "Ausente"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Nenhum aluno na chamada deste encontro.</p>
          )}
        </AttendanceModal>
      )}
    </>
  );
}

function MeetingCalendar({ meetings, onOpen, detailLabel = "Abrir chamada" }) {
  const [selectedDay, selectDay] = useState(null);
  const [opening, setOpening] = useState(false),
    [openError, setOpenError] = useState("");
  async function openMeeting(m) {
    setOpening(true);
    setOpenError("");
    try {
      await onOpen(m);
      selectDay(null);
    } catch {
      setOpenError("Não foi possível abrir o encontro. Tente novamente.");
    } finally {
      setOpening(false);
    }
  }
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const year = month.getFullYear(),
    mo = month.getMonth(),
    offset = new Date(year, mo, 1).getDay(),
    count = new Date(year, mo + 1, 0).getDate();
  return (
    <Panel title="Calendário de encontros">
      <div className="calendar-nav">
        <button onClick={() => setMonth(new Date(year, mo - 1, 1))} aria-label="Mês anterior">
          ←
        </button>
        <strong aria-live="polite">
          {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </strong>
        <button onClick={() => setMonth(new Date(year, mo + 1, 1))} aria-label="Próximo mês">
          →
        </button>
      </div>
      <div className="meeting-calendar">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((x) => (
          <b key={x}>{x}</b>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={"empty" + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day =
            String(year) +
            "-" +
            String(mo + 1).padStart(2, "0") +
            "-" +
            String(i + 1).padStart(2, "0");
          const dayMeetings = meetings
            .filter((m) => m.meetingDate === day)
            .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
          return (
            <button
              type="button"
              className="calendar-day calendar-day-trigger"
              key={day}
              onClick={() => {
                selectDay(day);
                setOpenError("");
              }}
              aria-label={date(day) + ", " + dayMeetings.length + " encontros"}
            >
              <span>{i + 1}</span>
              {dayMeetings.length > 3 ? (
                <strong className="calendar-count">{dayMeetings.length} encontros</strong>
              ) : (
                dayMeetings.map((m) => (
                  <span className="calendar-preview" key={m.id}>
                    {m.startTime?.slice(0, 5) || "Sem horário"}{" "}
                    {m.workshopName && <b>{m.workshopName} · </b>}
                    {m.topic || "Encontro"}
                  </span>
                ))
              )}
            </button>
          );
        })}
      </div>
      {selectedDay && (
        <AttendanceModal title={"Encontros · " + date(selectedDay)} onClose={() => selectDay(null)}>
          {openError && <p role="alert">{openError}</p>}
          <div className="day-meeting-list">
            {meetings
              .filter((m) => m.meetingDate === selectedDay)
              .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
              .map((m) => (
                <button type="button" key={m.id} disabled={opening} onClick={() => openMeeting(m)}>
                  <span>
                    {m.workshopName && <small>{m.workshopName}</small>}
                    <strong>{m.topic || "Encontro"}</strong>
                    <small>
                      {m.startTime
                        ? m.startTime.slice(0, 5) + " – " + m.endTime?.slice(0, 5)
                        : "Horário não informado"}
                    </small>
                  </span>
                  <span>{detailLabel} →</span>
                </button>
              ))}
            {!meetings.some((m) => m.meetingDate === selectedDay) && (
              <p>Nenhum encontro neste dia.</p>
            )}
          </div>
        </AttendanceModal>
      )}
    </Panel>
  );
}

function Classroom({ api, data, doAction, setPage, workshopId }) {
  const [roster, Roster] = useState([]),
    [addStudent, AddStudent] = useState(""),
    [rosterBusy, RosterBusy] = useState(false),
    [rosterMessage, RosterMessage] = useState("");
  const [startTime, Start] = useState(""),
    [endTime, End] = useState("");
  const id = workshopId;
  const workshop = data.workshops.find((w) => w.id === id);
  const [enroll, E] = useState([]),
    [assign, A] = useState([]),
    [meetings, M] = useState([]),
    [meeting, MT] = useState(null),
    [selected, S] = useState({}),
    [notes, N] = useState([]),
    [student, ST] = useState(""),
    [instructor, IN] = useState(""),
    [day, D] = useState(""),
    [topic, T] = useState(""),
    [note, Note] = useState("");
  useEffect(() => {
    Promise.all([
      api("workshops/" + id + "/enrollments"),
      api("workshops/" + id + "/instructors"),
      api("workshops/" + id + "/meetings"),
    ]).then(([e, a, m]) => {
      E(e);
      A(a);
      M(m);
    });
  }, [id]);
  async function choose(m) {
    S({});
    N([]);
    Note("");
    const [a, n] = await Promise.all([
      api("meetings/" + m.id + "/attendance"),
      api("meetings/" + m.id + "/notes"),
    ]);
    const x = {};
    a.forEach((v) => (x[v.student.id] = v.present));
    S(x);
    Roster(a.map((v) => v.student));
    AddStudent("");
    RosterMessage("");
    N(n);
    MT(m);
  }
  if (!workshop) return <p>Oficina não encontrada.</p>;
  return (
    <>
      <button className="link" onClick={() => setPage("workshops")}>
        ← Oficinas
      </button>
      <Heading
        title={workshop.name}
        sub={workshop.description || "Equipe, matrículas, encontros e presença."}
      />
      <div className="columns">
        <Panel title="Vincular instrutor">
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              await doAction(async () => {
                await api("workshops/" + id + "/instructors", "POST", {
                  instructorId: Number(instructor),
                });
                A(await api("workshops/" + id + "/instructors"));
              });
            }}
          >
            <Field>
              Adicionar instrutor
              <select value={instructor} onChange={(e) => IN(e.target.value)}>
                <option value="">Selecione</option>
                {(data.instructors || [])
                  .filter((i) => !assign.some((x) => x.instructor.id === i.id))
                  .map((i) => (
                    <option value={i.id}>{i.name}</option>
                  ))}
              </select>
            </Field>
            <button>Vincular</button>
          </Form>
        </Panel>
        <Panel title="Matricular participante">
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              await doAction(async () => {
                await api("workshops/" + id + "/enrollments", "POST", {
                  studentId: Number(student),
                });
                E(await api("workshops/" + id + "/enrollments"));
              });
            }}
          >
            <Field>
              Matricular participante
              <select value={student} onChange={(e) => ST(e.target.value)}>
                <option value="">Selecione</option>
                {data.students
                  .filter((s) => !enroll.some((x) => x.student.id === s.id))
                  .map((s) => (
                    <option value={s.id}>{s.name}</option>
                  ))}
              </select>
            </Field>
            <button>Matricular</button>
          </Form>
        </Panel>
      </div>
      <Panel title={"Instrutores · " + assign.length}>
        {assign.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col">Nome</th>
                  <th scope="col">Área de atuação</th>
                  <th scope="col">Contato</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {assign.map((x) => (
                  <tr role="row" key={x.id}>
                    <td role="cell" data-label="Nome">
                      {x.instructor.name}
                    </td>
                    <td role="cell" data-label="Área de atuação">
                      {x.instructor.area || "—"}
                    </td>
                    <td role="cell" data-label="Contato">
                      {x.instructor.contact || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhum instrutor vinculado ainda.</p>
        )}
      </Panel>
      <Panel title={"Participantes matriculados · " + enroll.length}>
        {enroll.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col">Nome</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {enroll.map((x) => (
                  <tr role="row" key={x.id}>
                    <td role="cell" data-label="Nome">
                      {x.student.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhum participante matriculado ainda.</p>
        )}
      </Panel>
      <Panel title="Criar encontro">
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            await doAction(async () => {
              const m = await api("workshops/" + id + "/meetings", "POST", {
                meetingDate: day,
                topic,
                startTime,
                endTime,
              });
              M([...meetings, m]);
              D("");
              T("");
            });
          }}
        >
          <Field>
            Data
            <input type="date" required value={day} onChange={(e) => D(e.target.value)} />
          </Field>
          <Field>
            Início
            <input type="time" required value={startTime} onChange={(e) => Start(e.target.value)} />
          </Field>
          <Field>
            Término
            <input
              type="time"
              required
              min={startTime}
              value={endTime}
              onChange={(e) => End(e.target.value)}
            />
          </Field>
          <Field>
            Conteúdo do encontro
            <input value={topic} onChange={(e) => T(e.target.value)} />
          </Field>
          <button>Criar encontro</button>
        </Form>
      </Panel>
      <MeetingCalendar meetings={meetings} onOpen={choose} />
      <Panel title={"Encontros · " + meetings.length}>
        {meetings.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col">Data</th>
                  <th scope="col">Conteúdo</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {meetings.map((x) => (
                  <tr role="row" key={x.id}>
                    <td role="cell" data-label="Data">
                      {date(x.meetingDate)}
                      <small style={{ display: "block" }}>
                        {x.startTime
                          ? x.startTime.slice(0, 5) + " – " + x.endTime?.slice(0, 5)
                          : "Horário não informado"}
                      </small>
                    </td>
                    <td role="cell" data-label="Conteúdo">
                      {x.topic || "—"}
                    </td>
                    <td role="cell" data-label="Ações">
                      <button className="small" onClick={() => choose(x)}>
                        Abrir chamada
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhum encontro cadastrado ainda.</p>
        )}
      </Panel>
      {meeting && (
        <AttendanceModal
          onClose={() => MT(null)}
          title={"Chamada e registro · " + date(meeting.meetingDate)}
        >
          <div className="meeting-details">
            <strong>{meeting.topic || "Encontro"}</strong>
            <p>
              {meeting.startTime
                ? meeting.startTime.slice(0, 5) + " – " + meeting.endTime?.slice(0, 5)
                : "Horário não informado"}
            </p>
          </div>
          <p>
            Adicione ou remova alunos deste encontro e marque quem compareceu. Clique em Salvar
            chamada para confirmar as alterações.
          </p>
          <div className="meeting-roster-add">
            <label>
              Adicionar aluno
              <select
                value={addStudent}
                disabled={rosterBusy}
                onChange={(e) => AddStudent(e.target.value)}
              >
                <option value="">Selecione um aluno cadastrado</option>
                {data.students
                  .filter((s) => !roster.some((r) => r.id === s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className="save-attendance"
              disabled={!addStudent || rosterBusy}
              onClick={() => {
                const s = data.students.find((s) => s.id === Number(addStudent));
                if (s) {
                  Roster([...roster, s]);
                  S({ ...selected, [s.id]: false });
                  AddStudent("");
                  RosterMessage("");
                }
              }}
            >
              Adicionar aluno
            </button>
          </div>
          {!roster.length && <p>Nenhum aluno na chamada deste encontro.</p>}
          {roster.map((s) => (
            <div className="meeting-roster-row" key={s.id}>
              <span>{s.name}</span>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={rosterBusy}
                  checked={!!selected[s.id]}
                  onChange={(e) => {
                    S({ ...selected, [s.id]: e.target.checked });
                    RosterMessage("");
                  }}
                />
                Presente
              </label>
              <button
                type="button"
                className="remove-roster"
                disabled={rosterBusy}
                aria-label={"Remover " + s.name + " deste encontro"}
                onClick={() => {
                  Roster(roster.filter((r) => r.id !== s.id));
                  RosterMessage("");
                }}
              >
                Remover
              </button>
            </div>
          ))}
          <button
            className="save-attendance"
            disabled={rosterBusy}
            onClick={async () => {
              RosterBusy(true);
              RosterMessage("");
              try {
                await api(
                  "meetings/" + meeting.id + "/attendance",
                  "PUT",
                  roster.map((s) => ({ studentId: s.id, present: !!selected[s.id] })),
                );
                RosterMessage("Chamada salva com sucesso.");
              } catch (e) {
                RosterMessage(e.message);
              } finally {
                RosterBusy(false);
              }
            }}
          >
            {rosterBusy ? "Salvando…" : "Salvar chamada"}
          </button>
          {rosterMessage && <p role="status">{rosterMessage}</p>}
          <hr />
          <h3>Observação pedagógica</h3>
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              await doAction(async () => {
                await api("meetings/" + meeting.id + "/notes", "POST", { text: note });
                N(await api("meetings/" + meeting.id + "/notes"));
                Note("");
              });
            }}
          >
            <Field>
              Registro
              <textarea value={note} onChange={(e) => Note(e.target.value)} required />
            </Field>
            <button>Salvar observação</button>
          </Form>
          {notes.map((n) => (
            <p className="note">
              {n.text}
              <small>
                {n.author} · {n.createdAt?.slice(0, 10)}
              </small>
            </p>
          ))}
        </AttendanceModal>
      )}
    </>
  );
}
const Finance = FinanceView;
export { Dashboard, WorkshopList, People, Team, Projects, Finance, Classroom };
