import React, { useEffect, useState } from "react";
import { FormModal } from "../ui/FormModal.jsx";
import { apiFetch } from "../../services/api.js";
import { date } from "../../utils/formatters.js";
export function DeleteMeetingModal({ meeting, profile, onClose, onDeleted }) {
  const [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [password, setPassword] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    apiFetch("/api/meetings/" + meeting.id + "/deletion-preview", {
      headers: { Authorization: "Bearer " + sessionStorage.getItem("ong-auth") },
      signal: controller.signal,
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw Error(body.error || "Não foi possível consultar o encontro.");
        return body;
      })
      .then((body) => {
        if (active) setPreview(body);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [meeting.id]);
  async function remove(e) {
    e.preventDefault();
    if (busy || !preview || !confirmed || !password) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch("/api/meetings/" + meeting.id, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + sessionStorage.getItem("ong-auth"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password, confirmed }),
      });
      setPassword("");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw Error(body.error || "Não foi possível excluir o encontro.");
      }
      onDeleted(meeting.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  return (
    <FormModal
      open
      title="Excluir encontro"
      closeLabel="Cancelar exclusão"
      busy={busy}
      onClose={onClose}
    >
      <div className="delete-meeting-summary">
        <strong>
          {date(meeting.meetingDate)} · {meeting.topic || "Encontro sem conteúdo informado"}
        </strong>
        <p>
          Esta exclusão é permanente. A oficina e os cadastros de participantes e instrutores serão
          mantidos.
        </p>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!preview && !error && <p role="status">Conferindo registros vinculados…</p>}
      {preview && (
        <>
          <ul className="delete-impact">
            <li>{preview.attendance} registro(s) de chamada</li>
            <li>{preview.notes} observação(ões) pedagógica(s)</li>
            <li>{preview.photos} imagem(ns) do encontro</li>
          </ul>
          <form className="form" onSubmit={remove}>
            <label className="check">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                required
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Entendo que o encontro e seus registros vinculados serão excluídos.
            </label>
            <label className="full-field">
              Sua senha atual
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                required
                disabled={busy}
                maxLength={1000}
                onChange={(e) => setPassword(e.target.value)}
              />
              <small>Senha da conta {profile?.email || profile?.login}.</small>
            </label>
            {profile?.login === "demo-local" && (
              <p className="full-field section-description">
                Esta é uma conta de demonstração. Use Sair e entre com sua conta para confirmar com
                uma senha conhecida.
              </p>
            )}
            <div className="delete-modal-actions full-field">
              <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="danger-button"
                disabled={busy || !confirmed || !password}
              >
                {busy ? "Excluindo…" : "Confirmar exclusão"}
              </button>
            </div>
          </form>
        </>
      )}
    </FormModal>
  );
}
