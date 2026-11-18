import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../services/api.js";
import { FormModal } from "../ui/FormModal.jsx";

export function today() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"].map((type) => parts.find((p) => p.type === type).value).join("-");
}
export function AuthenticatedImage({ src, alt, className, fallback }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl("");
    if (!src) return;
    let active = true,
      objectUrl;
    const controller = new AbortController();
    apiFetch(src, {
      headers: { Authorization: "Bearer " + sessionStorage.getItem("ong-auth") },
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.blob();
      })
      .then((blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return url ? (
    <img src={url} alt={alt} className={className} />
  ) : (
    <span className={className + " photo-placeholder"} role="img" aria-label={alt}>
      {fallback || "Foto indisponível"}
    </span>
  );
}
export function useAvatars(type, api, version = 0) {
  const [photos, setPhotos] = useState({});
  const [error, setError] = useState("");
  const apiRef = useRef(api);
  apiRef.current = api;
  useEffect(() => {
    let active = true;
    setError("");
    setPhotos({});
    if (!type) return;
    apiRef
      .current("photos/avatars/" + type)
      .then((rows) => {
        if (active) setPhotos(Object.fromEntries(rows.map((p) => [p.ownerId, p])));
      })
      .catch(() => {
        if (active)
          setError("Não foi possível carregar as fotos. Atualize a página para tentar novamente.");
      });
    return () => {
      active = false;
    };
  }, [type, version]);
  return { photos, error };
}
export function PhotoAction({ children, onClick, label, primary = false }) {
  return (
    <button
      type="button"
      className={primary ? "primary-button photo-action photo-action-primary" : "photo-action"}
      onClick={onClick}
      aria-label={label}
      aria-haspopup="dialog"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 6h3l2-3h6l2 3h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
        <circle cx="12" cy="12" r="4" />
      </svg>
      <span>{children}</span>
    </button>
  );
}
export function PersonPhoto({ photo, name, onEdit }) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <div className="person-photo">
      <AuthenticatedImage
        src={photo?.url}
        alt={"Foto de " + name}
        className="person-avatar"
        fallback={initials}
      />
      {onEdit && (
        <PhotoAction onClick={onEdit} label={(photo ? "Trocar" : "Adicionar") + " foto de " + name}>
          {photo ? "Trocar foto" : "Adicionar foto"}
        </PhotoAction>
      )}
    </div>
  );
}
export function PhotoUploadModal({
  owner,
  type,
  onClose,
  onSaved,
  embedded = false,
  onBusyChange,
}) {
  const [files, setFiles] = useState([]),
    [photoDate, setPhotoDate] = useState(() =>
      type === "MEETING" ? owner.meetingDate || today() : today(),
    ),
    [caption, setCaption] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploaded, setUploaded] = useState(false);
  const project = ["PROJECT", "MEETING"].includes(type);
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (
      !uploaded &&
      (!files.length ||
        files.length > (project ? 10 : 1) ||
        files.some(
          (f) =>
            !f.size || f.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(f.type),
        ) ||
        files.reduce((n, f) => n + f.size, 0) > 30 * 1024 * 1024)
    ) {
      setError(
        "Selecione " +
          (project ? "até 10 fotos" : "uma foto") +
          " JPG ou PNG, de até 8 MB por foto e 30 MB no total.",
      );
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    try {
      if (!uploaded) {
        const body = new FormData();
        files.forEach((f) => body.append("files", f));
        body.append("photoDate", photoDate);
        body.append("caption", caption);
        const response = await apiFetch("/api/photos/" + type + "/" + owner.id, {
          method: "POST",
          headers: { Authorization: "Bearer " + sessionStorage.getItem("ong-auth") },
          body,
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw Error(
            result.error ||
              result.reason ||
              result.detail ||
              result.message ||
              "Não foi possível enviar as fotos.",
          );
        }
        setUploaded(true);
      }
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  const content = (
    <form className="form" onSubmit={save}>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {uploaded && (
        <p role="status">Fotos salvas. Atualize a lista para concluir, sem reenviar os arquivos.</p>
      )}
      <label className="full-field">
        {project ? "Fotos" : "Foto"}
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple={project}
          required={!uploaded}
          disabled={busy || uploaded}
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        <small>JPG ou PNG. Até 8 MB por foto{project ? ", 10 fotos e 30 MB por envio" : ""}.</small>
      </label>
      {files.length > 0 && (
        <p className="full-field" role="status">
          {files.length} foto(s) selecionada(s): {files.map((f) => f.name).join(", ")}
        </p>
      )}
      {project && (
        <>
          <label>
            Data das fotos
            <input
              type="date"
              value={photoDate}
              required
              disabled={busy || uploaded}
              onChange={(e) => setPhotoDate(e.target.value)}
            />
          </label>
          <label className="full-field">
            Legenda (opcional)
            <textarea
              value={caption}
              maxLength={500}
              disabled={busy || uploaded}
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
        </>
      )}
      <button disabled={busy}>
        {busy
          ? "Enviando…"
          : uploaded
            ? "Atualizar lista"
            : project
              ? "Salvar fotos"
              : "Salvar foto"}
      </button>
    </form>
  );
  return embedded ? (
    content
  ) : (
    <FormModal
      open
      title={project ? "Adicionar fotos" : "Foto de " + owner.name}
      onClose={onClose}
      busy={busy}
    >
      {content}
    </FormModal>
  );
}

export function validateProfilePhoto(file) {
  if (
    file &&
    (!file.size || file.size > 8 * 1024 * 1024 || !["image/png", "image/jpeg"].includes(file.type))
  )
    throw Error("Selecione uma foto JPG ou PNG de até 8 MB.");
}
export async function uploadProfilePhoto(type, id, file) {
  if (!file) return;
  validateProfilePhoto(file);
  const body = new FormData();
  body.append("files", file);
  const response = await apiFetch("/api/photos/" + type + "/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + sessionStorage.getItem("ong-auth") },
    body,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw Error(
      result.error ||
        result.message ||
        "Os dados foram salvos, mas a foto não foi enviada. Tente salvar novamente.",
    );
  }
}
export function ProfilePhotoField({ file, onChange, existing, name, disabled }) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = "";
  }, [file]);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="profile-photo-field full-field">
      <button
        type="button"
        className="profile-photo-picker"
        disabled={disabled}
        aria-label={existing || file ? "Trocar foto de perfil" : "Adicionar foto de perfil"}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Prévia da foto de perfil" className="profile-photo-large" />
        ) : (
          <AuthenticatedImage
            src={existing?.url}
            alt={"Foto de " + (name || "perfil")}
            className="profile-photo-large"
            fallback={(name || "?").slice(0, 1).toUpperCase()}
          />
        )}
        <span className="profile-photo-hover" aria-hidden="true">
          +
        </span>
        <span className="profile-photo-plus" aria-hidden="true">
          +
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        hidden
        disabled={disabled}
        aria-label="Arquivo da foto de perfil"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <div className="profile-photo-help">
        <strong>Foto de perfil</strong>
        <p>Clique na foto para escolher uma imagem.</p>
        <small>Opcional. JPG ou PNG, até 8 MB. A foto atual é mantida sem nova seleção.</small>
        {file && (
          <>
            <p className="selected-photo-name">{file.name}</p>
            <button
              type="button"
              className="quiet-button"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Descartar seleção
            </button>
          </>
        )}
      </div>
    </div>
  );
}
