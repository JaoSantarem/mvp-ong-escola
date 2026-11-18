import React, { createContext, useContext, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export const ActionErrorContext = createContext("");
let activeModal = null;
const locks = new Set();
let originalOverflow = "";
function lock(token) {
  if (!locks.size) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks.add(token);
}
function unlock(token) {
  if (!locks.delete(token)) return;
  if (!locks.size) document.body.style.overflow = originalOverflow;
}

export function FormModal({
  title,
  open,
  onClose,
  children,
  busy = false,
  closeLabel = "Fechar formulário",
}) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  const titleId = useId();
  const error = useContext(ActionErrorContext);
  useEffect(() => {
    if (!open) return;
    // Close the previous dialog before opening another, including on mobile.
    activeModal?.dismiss(false);
    const dialog = ref.current;
    const previous = document.activeElement;
    const token = {};
    const entry = {
      dismiss(restore = true) {
        dialog.close();
        unlock(token);
        if (activeModal === entry) activeModal = null;
        closeRef.current();
        if (restore && previous?.isConnected) previous.focus();
      },
    };
    activeModal = entry;
    lock(token);
    dialog.showModal();
    dialog
      .querySelector(
        "input:not([hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled])",
      )
      ?.focus();
    return () => {
      dialog.close();
      unlock(token);
      if (activeModal === entry) {
        activeModal = null;
        if (previous?.isConnected) previous.focus();
      }
    };
  }, [open]);
  const dismiss = () => {
    if (!busyRef.current && activeModal) activeModal.dismiss();
  };
  return createPortal(
    <dialog
      ref={ref}
      className="form-modal"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <header className="form-modal-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="modal-close"
          onClick={dismiss}
          disabled={busy}
          aria-label={closeLabel}
        >
          ×
        </button>
      </header>
      <div className="form-modal-body">
        {error && open && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
