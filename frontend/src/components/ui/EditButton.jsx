import React from "react";
export function EditButton({ name, onClick }) {
  return (
    <button
      type="button"
      className="edit-button"
      aria-label={"Editar " + name}
      title={"Editar " + name}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m16 3 5 5M4 15 15 4a2.1 2.1 0 0 1 3 0l2 2a2.1 2.1 0 0 1 0 3L9 20l-6 1z" />
      </svg>
    </button>
  );
}
