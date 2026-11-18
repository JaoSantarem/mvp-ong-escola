import React from "react";

export function SectionNav({ label, items, value, onChange }) {
  return (
    <nav className="section-nav" aria-label={label}>
      {items.map(([id, title]) => (
        <button
          key={id}
          type="button"
          aria-current={value === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          {title}
        </button>
      ))}
    </nav>
  );
}
