export const brl = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const date = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—");

export function maskPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function currencyNumber(value) {
  return Number(String(value).replace(/\D/g, "")) / 100;
}

export function maskCurrency(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 15);
  return digits ? brl(Number(digits) / 100) : "";
}
