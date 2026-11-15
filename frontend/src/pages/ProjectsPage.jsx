import React, { useState } from "react";
import { brl, currencyNumber, maskCurrency } from "../utils/formatters.js";
import { Heading } from "../components/ui/Heading.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { Form } from "../components/ui/Form.jsx";
import { Field } from "../components/ui/Field.jsx";

export function Projects({ data, api, doAction }) {
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
