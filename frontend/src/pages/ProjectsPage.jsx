import { CardAction } from "../components/ui/CardAction.jsx";
import { FormModal } from "../components/ui/FormModal.jsx";
import { ListToolbar, matchesSearch } from "../components/ui/ListToolbar.jsx";
import React, { useState } from "react";
import { brl, currencyNumber, maskCurrency } from "../utils/formatters.js";
import { Heading } from "../components/ui/Heading.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { Form } from "../components/ui/Form.jsx";
import { Field } from "../components/ui/Field.jsx";

export function Projects({ data, api, doAction, setPage }) {
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = data.projects.filter((p) => matchesSearch([p.name, p.funder], search));
  const [name, setName] = useState("");
  const [funder, setFunder] = useState("");
  const [budget, setBudget] = useState("");
  async function add(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const saved = await doAction(() =>
      api("projects", "POST", {
        name: name.trim(),
        funder: funder.trim(),
        budget: currencyNumber(budget),
      }),
    );
    setSaving(false);
    if (!saved) return;
    setCreating(false);
    setNotice("Projeto cadastrado com sucesso.");
    setName("");
    setFunder("");
    setBudget("");
  }
  return (
    <>
      <Heading
        title="Projetos"
        sub="Acompanhe as iniciativas e o planejamento dos recursos."
        action={
          <button
            type="button"
            className="primary-button"
            aria-expanded={creating}
            onClick={() => setCreating(!creating)}
          >
            + Novo projeto
          </button>
        }
      />
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}
      <FormModal
        busy={saving}
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo projeto"
      >
        <Form onSubmit={add}>
          <Field>
            Nome do projeto
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Oficinas de esporte 2026"
            />
          </Field>
          <Field>
            Fonte do recurso
            <input
              value={funder}
              onChange={(e) => setFunder(e.target.value)}
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
              onChange={(e) => setBudget(maskCurrency(e.target.value))}
              placeholder="R$ 0,00"
              aria-label="Orçamento em reais"
            />
          </Field>
          <button disabled={saving}>{saving ? "Salvando…" : "Cadastrar projeto"}</button>
        </Form>
      </FormModal>
      <ListToolbar
        label="Buscar projeto ou fonte de recurso"
        placeholder="Buscar projeto ou fonte de recurso…"
        value={search}
        onChange={setSearch}
        count={filtered.length}
      />
      {search.trim() && !filtered.length && (
        <div className="empty-state">
          <b>Nenhum resultado encontrado</b>Tente outro nome ou{" "}
          <button type="button" className="link" onClick={() => setSearch("")}>
            limpe a busca
          </button>
          .
        </div>
      )}
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
                {filtered.map((p) => (
                  <tr role="row" key={p.id} className="interactive-row">
                    <td role="cell" data-label="Projeto">
                      <strong>{p.name}</strong>
                      <CardAction
                        row
                        label={"Abrir projeto " + p.name}
                        onClick={() => setPage("project:" + p.id)}
                      />
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
