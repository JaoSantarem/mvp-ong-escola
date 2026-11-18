import React from "react";
// Native button spans the card, retaining Enter/Space and focus support.
export function CardAction({ label, onClick, row = false }) {
  return (
    <button
      type="button"
      className={row ? "row-hit-target" : "card-hit-target"}
      aria-label={label}
      onClick={onClick}
    >
      <span className="sr-only">{label}</span>
    </button>
  );
}
