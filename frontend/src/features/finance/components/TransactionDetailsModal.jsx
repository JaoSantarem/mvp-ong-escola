import React, { useEffect, useRef, useState } from "react";
import { fields } from "../constants.js";
import { filesOf, getFile, value } from "../utils.js";

export function Detail({ row, close, decide }) {
  const ref = useRef(null),
    [error, ErrorText] = useState(""),
    [busy, Busy] = useState(false);
  useEffect(() => {
    const last = document.activeElement;
    ref.current.showModal();
    return () => last?.focus();
  }, []);
  return (
    <dialog
      className="attendance-modal"
      ref={ref}
      onCancel={close}
      aria-labelledby="ledger-detail-title"
    >
      <header>
        <h2 id="ledger-detail-title">Detalhes do lançamento</h2>
        <button onClick={close} aria-label="Fechar detalhes">
          ×
        </button>
      </header>
      <dl className="ledger-details">
        {Object.entries(fields)
          .filter(([k]) => k !== "attachments")
          .map(([k, label]) => (
            <div key={k}>
              <dt>{label}</dt>
              <dd>{value(row, k) || "—"}</dd>
            </div>
          ))}
      </dl>
      <h3>Anexos</h3>
      {filesOf(row).length ? (
        filesOf(row).map((f, i) => (
          <p key={i}>
            <button
              className="secondary"
              onClick={() => getFile(f).catch((e) => ErrorText(e.message))}
            >
              Baixar {f.name}
            </button>
          </p>
        ))
      ) : (
        <p>Nenhum anexo.</p>
      )}
      {error && <p role="alert">{error}</p>}
      {row.type === "EXPENSE" && row.status === "PENDING" && (
        <div className="ledger-actions">
          {["approve", "reject"].map((action) => (
            <button
              className="secondary"
              disabled={busy}
              key={action}
              onClick={async () => {
                Busy(true);
                try {
                  await decide(row, action);
                  close();
                } catch (e) {
                  ErrorText(e.message);
                } finally {
                  Busy(false);
                }
              }}
            >
              {action === "approve" ? "Aprovar" : "Recusar"}
            </button>
          ))}
        </div>
      )}
    </dialog>
  );
}
