import React, { useEffect, useState } from "react";
import { Heading } from "../components/ui/Heading.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { Form } from "../components/ui/Form.jsx";
import { Field } from "../components/ui/Field.jsx";
import { maskPhone } from "../utils/formatters.js";

export function Team({ api, profile, doAction }) {
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
