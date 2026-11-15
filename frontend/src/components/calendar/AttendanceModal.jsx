import React, { useEffect, useRef } from "react";

export function AttendanceModal({ children, onClose, title }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="attendance-modal"
      aria-labelledby="attendance-title"
      onCancel={onClose}
    >
      <header>
        <h2 id="attendance-title">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar chamada">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
