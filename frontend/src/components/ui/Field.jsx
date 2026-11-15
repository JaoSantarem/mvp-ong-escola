import React from "react";

export function Field({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}
