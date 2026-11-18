import React from "react";
const paths = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  workshops: "M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M8 17h6",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  projects: "M3 7V4h6l2 3h10v13H3z M3 11h18",
  finance: "M3 6h18v14H3z M3 6V4h15 M16 11h5v5h-5z",
  team: "M12 3 3 7v6c0 4 9 8 9 8s9-4 9-8V7z M8 12l3 3 5-6",
};
export function NavIcon({ name }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.dashboard} />
    </svg>
  );
}
