import { statuses, types } from "./constants.js";
import { apiFetch } from "../../services/api.js";

export const numeric = (v) => Number(v.replace(/\D/g, "")) / 100;

export function value(r, k) {
  return ["date", "dueDate", "lastMovement"].includes(k)
    ? day(r[k])
    : k === "type"
      ? types[r.type] || r.type
      : k === "status"
        ? statuses[r.status] || r.status
        : ["amount", "settledAmount", "openAmount"].includes(k)
          ? money(r[k])
          : k === "attachments"
            ? filesOf(r)
                .map((f) => f.name)
                .join(", ")
            : r[k] || "";
}

export const day = (v) => (v ? v.split("-").reverse().join("/") : "—");

export const money = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const filesOf = (r) => [
  ...(r.attachments || []),
  ...(r.legacyAttachment ? [r.legacyAttachment] : []),
];

export function downloadBlob(blob, name) {
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

export const mask = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 15);
  return d ? money(Number(d) / 100) : "";
};

export async function getFile(f) {
  const res = await apiFetch(f.url, {
    headers: { Authorization: "Bearer " + sessionStorage.getItem("ong-auth") },
  });
  if (!res.ok) throw Error("Não foi possível baixar " + f.name);
  downloadBlob(await res.blob(), f.name);
}
