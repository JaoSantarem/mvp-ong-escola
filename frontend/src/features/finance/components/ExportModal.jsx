import React, { useEffect, useRef, useState } from "react";

export function ExportModal({ pageCount, totalCount, onClose, onExport }) {
  const ref = useRef(null),
    [scope, Scope] = useState("page");
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className="attendance-modal export-modal"
      aria-labelledby="export-title"
      aria-describedby="export-note"
      onCancel={onClose}
    >
      <header>
        <h2 id="export-title">Exportar CSV</h2>
        <button type="button" aria-label="Fechar exportação" onClick={onClose}>
          ×
        </button>
      </header>
      <p>Quais registros você quer exportar?</p>
      <fieldset className="export-options">
        <legend>Escolha o alcance da exportação</legend>
        <label>
          <input
            type="radio"
            name="export-scope"
            value="page"
            checked={scope === "page"}
            onChange={() => Scope("page")}
          />
          <span>
            <strong>Página atual</strong>
            <small>{pageCount} registro(s) desta página</small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="export-scope"
            value="all"
            checked={scope === "all"}
            onChange={() => Scope("all")}
          />
          <span>
            <strong>Tudo</strong>
            <small>{totalCount} registro(s) encontrados</small>
          </span>
        </label>
      </fieldset>
      <p id="export-note" className="export-note">
        Ao escolher Tudo, serão exportados todos os registros que correspondem aos filtros
        aplicados, incluindo os de outras páginas.
      </p>
      <div className="ledger-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="save-attendance" onClick={() => onExport(scope)}>
          Exportar
        </button>
      </div>
    </dialog>
  );
}
