import React, { useEffect, useState, useRef } from "react";
import { PhotoUploadModal, AuthenticatedImage, PhotoAction } from "./Photos.jsx";
import { date } from "../../utils/formatters.js";
export function MeetingPhotos({ meeting, api, canUpload, onBusyChange }) {
  const [photos, setPhotos] = useState([]),
    [adding, setAdding] = useState(false),
    [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const handleBusy = React.useCallback(
    (value) => {
      setBusy(value);
      onBusyChange?.(value);
    },
    [onBusyChange],
  );
  const apiRef = useRef(api);
  apiRef.current = api;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRef
      .current("photos/MEETING/" + meeting.id)
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
  }, [meeting.id, version]);
  if (adding)
    return (
      <>
        <button
          disabled={busy}
          type="button"
          className="back-button"
          onClick={() => setAdding(false)}
        >
          ← Voltar às imagens
        </button>
        <h3>Adicionar imagens do encontro</h3>
        <PhotoUploadModal
          onBusyChange={handleBusy}
          embedded
          type="MEETING"
          owner={meeting}
          onClose={() => setAdding(false)}
          onSaved={async () => setVersion((n) => n + 1)}
        />
      </>
    );
  return (
    <>
      {canUpload && <PhotoAction onClick={() => setAdding(true)}>Adicionar imagens</PhotoAction>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando imagens…</p>
      ) : !photos.length ? (
        <p>Nenhuma imagem anexada a este encontro.</p>
      ) : (
        <div className="project-gallery">
          {photos.map((p) => (
            <figure key={p.id}>
              <AuthenticatedImage
                src={p.url}
                alt={p.caption || "Imagem do encontro"}
                className="gallery-image"
              />
              <figcaption>
                <time>{date(p.photoDate)}</time>
                <p>{p.caption || p.fileName}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
