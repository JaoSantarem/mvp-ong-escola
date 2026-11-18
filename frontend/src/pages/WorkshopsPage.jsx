import { WorkshopEditor } from "../components/WorkshopEditor.jsx";
import { CardAction } from "../components/ui/CardAction.jsx";
import { ListToolbar, matchesSearch } from "../components/ui/ListToolbar.jsx";
import React, { useState } from "react";
import { Heading } from "../components/ui/Heading.jsx";

export function WorkshopList({ data, api, refresh, doAction, setPage }) {
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = data.workshops.filter((w) => matchesSearch([w.name, w.description], search));
  return (
    <>
      <Heading
        title="Oficinas e turmas"
        sub="Organize as atividades e acompanhe cada turma."
        action={
          <button
            type="button"
            className="primary-button"
            aria-expanded={creating}
            onClick={() => setCreating(!creating)}
          >
            + Nova oficina
          </button>
        }
      />
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}
      {creating && (
        <WorkshopEditor
          api={api}
          doAction={doAction}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setNotice("Oficina cadastrada.");
          }}
        />
      )}
      <ListToolbar
        label="Buscar oficina por nome ou descrição"
        placeholder="Buscar oficina por nome ou descrição…"
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
      {!data.workshops.length && (
        <div className="empty-state">
          <b>Nenhuma oficina por aqui</b>Clique em Nova oficina para criar a primeira turma.
        </div>
      )}
      <div className="cards">
        {filtered.map((w) => (
          <article key={w.id} className="interactive-card workshop-card">
            <small className="tag">{w.active ? "ATIVA" : "ENCERRADA"}</small>
            <h3>{w.name}</h3>
            <p>{w.description || "Sem descrição"}</p>
            <CardAction
              label={"Abrir turma " + w.name}
              onClick={() => setPage("classroom:" + w.id)}
            />
          </article>
        ))}
      </div>
    </>
  );
}
