import React, { useState } from "react";
import { Heading } from "../components/ui/Heading.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { Form } from "../components/ui/Form.jsx";
import { Field } from "../components/ui/Field.jsx";

export function WorkshopList({ data, api, refresh, doAction, setPage }) {
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
