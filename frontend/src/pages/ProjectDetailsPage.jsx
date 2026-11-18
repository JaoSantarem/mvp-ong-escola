import React, { useEffect, useRef, useState } from "react";
import { Heading } from "../components/ui/Heading.jsx";
import { FormModal } from "../components/ui/FormModal.jsx";
import { PhotoUploadModal, AuthenticatedImage, PhotoAction } from "../components/photos/Photos.jsx";
import { brl, date } from "../utils/formatters.js";
export function ProjectDetails({ projectId, data, api, profile, setPage }) {
  const project = data.projects.find((p) => p.id === projectId);
  const [photos, setPhotos] = useState([]),
    [from, setFrom] = useState(""),
    [until, setUntil] = useState("");
  const [adding, setAdding] = useState(false),
    [viewing, setViewing] = useState(null),
    [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const apiRef = useRef(api);
  apiRef.current = api;
  const invalid = from && until && from > until;
  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    setPhotos([]);
    if (invalid) {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (until) params.set("until", until);
    apiRef
      .current("photos/PROJECT/" + projectId + "?" + params)
      .then((rows) => {
        if (active) setPhotos(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, from, until, version, invalid]);
  if (!project)
    return (
      <div className="empty-state">
        <b>Projeto não encontrado</b>
        <button type="button" className="link" onClick={() => setPage("projects")}>
          Voltar aos projetos
        </button>
      </div>
    );
  const canUpload = ["ADMIN", "COORDINATOR"].includes(profile?.role);
  return (
    <>
      <button type="button" className="back-button" onClick={() => setPage("projects")}>
        <span aria-hidden="true">←</span> Voltar aos projetos
      </button>
      <Heading
        title={project.name}
        sub="Informações e registros fotográficos do projeto."
        action={
          canUpload && (
            <PhotoAction primary onClick={() => setAdding(true)}>
              Adicionar fotos
            </PhotoAction>
          )
        }
      />
      <dl className="project-facts">
        <div>
          <dt>Fonte do recurso</dt>
          <dd>{project.funder || "Não informada"}</dd>
        </div>
        <div>
          <dt>Orçamento previsto</dt>
          <dd>{brl(project.budget)}</dd>
        </div>
        <div>
          <dt>Financeiro do projeto</dt>
          <dd>
            <button
              type="button"
              className="secondary-button project-finance-action"
              onClick={() => setPage("finance:summary:" + projectId)}
            >
              Ver resumo financeiro →
            </button>
          </dd>
        </div>
      </dl>
      <section className="panel">
        <h2>Fotos do projeto</h2>
        <div className="ledger-actions">
          <label>
            Data inicial das fotos
            <input
              type="date"
              value={from}
              max={until || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Data final das fotos
            <input
              type="date"
              value={until}
              min={from || undefined}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setFrom("");
              setUntil("");
            }}
          >
            Todas as datas
          </button>
        </div>
        <p className="section-description">
          O filtro considera a data informada para a foto, incluindo os dias inicial e final.
        </p>
        {invalid && (
          <p className="error" role="alert">
            A data final deve ser igual ou posterior à inicial.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Carregando fotos…</p>
        ) : (
          !invalid &&
          !error && (
            <>
              <p role="status">
                {photos.length} foto(s){from || until ? " no período" : " no projeto"}.
              </p>
              {!photos.length ? (
                <div className="empty-state">
                  <b>
                    {from || until ? "Nenhuma foto no período" : "Este projeto ainda não tem fotos"}
                  </b>
                  {from || until
                    ? "Altere as datas para consultar outros registros."
                    : "Use Adicionar fotos para registrar as atividades do projeto."}
                </div>
              ) : (
                <div className="project-gallery">
                  {photos.map((photo) => (
                    <figure key={photo.id}>
                      <button
                        type="button"
                        className="photo-open"
                        aria-label={
                          "Ampliar foto de " +
                          date(photo.photoDate) +
                          (photo.caption ? ": " + photo.caption : "")
                        }
                        onClick={() => setViewing(photo)}
                      >
                        <AuthenticatedImage
                          src={photo.url}
                          alt={photo.caption || "Registro de " + project.name}
                          className="gallery-image"
                        />
                      </button>
                      <figcaption>
                        <time dateTime={photo.photoDate}>{date(photo.photoDate)}</time>
                        <p>{photo.caption || photo.fileName}</p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </section>
      {adding && (
        <PhotoUploadModal
          type="PROJECT"
          owner={project}
          onClose={() => setAdding(false)}
          onSaved={async () => setVersion((n) => n + 1)}
        />
      )}
      {viewing && (
        <FormModal
          open
          title={viewing.caption || "Foto do projeto"}
          onClose={() => setViewing(null)}
        >
          <AuthenticatedImage
            src={viewing.url}
            alt={viewing.caption || project.name}
            className="photo-full"
          />
          <p>{date(viewing.photoDate)}</p>
        </FormModal>
      )}
    </>
  );
}
