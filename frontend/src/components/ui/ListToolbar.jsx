import React from "react";
export function ListToolbar({ label, placeholder, value, onChange, count, children }) {
  return (
    <div className="list-toolbar">
      <label className="list-search">
        <span className="sr-only">{label}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </label>
      {children}
      <span className="list-count" role="status">
        {count} {count === 1 ? "registro" : "registros"}
      </span>
    </div>
  );
}
export function matchesSearch(values, query) {
  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const text = normalize(values.join(" "));
  return normalize(query)
    .trim()
    .split(/\s+/)
    .every((term) => text.includes(term));
}
