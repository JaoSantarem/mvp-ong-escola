import React, { useState } from "react";
import { Heading } from "../components/ui/Heading.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { Form } from "../components/ui/Form.jsx";
import { Field } from "../components/ui/Field.jsx";
import { date } from "../utils/formatters.js";

export function People({ data, api, doAction }) {
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
