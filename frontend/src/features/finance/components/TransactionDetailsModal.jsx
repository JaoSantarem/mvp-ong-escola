import React, { useState } from "react";
import { FormModal } from "../../../components/ui/FormModal.jsx";
import { fields, statuses } from "../constants.js";
import { day, filesOf, getFile, mask, money, numeric, value } from "../utils.js";

const actions = {
  CREATE: "Cadastro",
  APPROVE: "Aprovação",
  REJECT: "Recusa",
  SETTLE: "Baixa",
  REVERSE: "Estorno",
  CORRECT: "Correção",
  CANCEL: "Cancelamento",
};

export function MovementFields({ account, method, set }) {
  return (
    <>
      <label>
        Conta bancária ou caixa
        <input
          required
          maxLength={255}
          value={account}
          onChange={(e) => set("accountName", e.target.value)}
          placeholder="Ex.: Caixa da sede"
        />
      </label>
      <label>
        Forma de movimentação
        <select required value={method} onChange={(e) => set("method", e.target.value)}>
          <option value="">Selecione</option>
          {["Pix", "Transferência", "Boleto", "Cartão", "Dinheiro", "Outra"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
    </>
  );
}

function localDate() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function Detail({ row, close, canManage, api, onSaved }) {
  const expense = row.type === "EXPENSE";
  const payment = expense ? "pagamento" : "recebimento";
  const closed = row.status === "CANCELLED";
  const reversible = (row.history || []).filter(
    (event) =>
      event.action === "SETTLE" &&
      !row.history.some((e) => e.reversesId != null && e.reversesId === event.id),
  );
  const [action, setAction] = useState("");
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const title =
    action === "SETTLE"
      ? "Registrar " + payment
      : action === "REVERSE"
        ? "Estornar baixa"
        : action === "CANCEL"
          ? "Cancelar lançamento"
          : action === "CORRECT"
            ? "Corrigir lançamento"
            : "Detalhes do lançamento";

  function begin(action) {
    setAction(action);
    setFile(null);
    setError("");
    setForm({
      amount: money(action === "CORRECT" ? row.amount : row.openAmount),
      date: localDate(),
      accountName: "",
      method: "",
      reason: "",
      description: row.description,
      dueDate: row.dueDate || "",
      counterparty: (expense ? row.beneficiary : row.source) || "",
      eventId: reversible[0]?.id || 0,
    });
  }
  async function submit(event, decision) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (decision) await api("expenses/" + row.id + "/" + decision, "POST", {});
      else {
        const body = new FormData();
        const data = {
          ...form,
          action,
          revision: row.revision,
          amount: numeric(form.amount),
          dueDate: form.dueDate || null,
        };
        body.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
        if (file) body.append("file", file);
        await api("ledger/" + row.type + "/" + row.id + "/actions", "POST", body);
      }
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormModal title={title} open busy={busy} onClose={close}>
      <p>
        <strong>{row.description}</strong> · {statuses[row.status]}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {action ? (
        <form className="form" onSubmit={submit}>
          {action === "SETTLE" && (
            <>
              <label>
                Valor do {payment}
                <input
                  required
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => set("amount", mask(e.target.value))}
                />
                <small>Em aberto: {money(row.openAmount)}</small>
              </label>
              <label>
                Data do {payment}
                <input
                  type="date"
                  required
                  max={localDate()}
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </label>
              <MovementFields account={form.accountName} method={form.method} set={set} />
              <label>
                Comprovante (opcional)
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
              </label>
            </>
          )}
          {action === "REVERSE" && (
            <>
              <label>
                Baixa a estornar
                <select
                  value={form.eventId}
                  onChange={(e) => set("eventId", Number(e.target.value))}
                >
                  {reversible.map((e) => (
                    <option key={e.id || 0} value={e.id || 0}>
                      {day(e.movementDate)} · {money(e.amount)} ·{" "}
                      {e.accountName || "Recebimento anterior"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data do estorno
                <input
                  type="date"
                  required
                  max={localDate()}
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </label>
            </>
          )}
          {action === "CORRECT" && (
            <>
              <label>
                Descrição
                <input
                  required
                  maxLength={255}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </label>
              <label>
                Valor
                <input
                  required
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => set("amount", mask(e.target.value))}
                />
              </label>
              <label>
                Vencimento
                <input
                  required
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </label>
              <label>
                {expense ? "Fornecedor / favorecido" : "Doador / origem"}
                <input
                  maxLength={255}
                  value={form.counterparty}
                  onChange={(e) => set("counterparty", e.target.value)}
                />
              </label>
              {expense && <p>A despesa voltará para aprovação.</p>}
            </>
          )}
          {action !== "SETTLE" && (
            <label>
              Motivo
              <textarea
                required
                maxLength={255}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
              />
            </label>
          )}
          <div className="ledger-actions full-field">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setAction("")}
            >
              Voltar
            </button>
            <button disabled={busy}>{busy ? "Salvando…" : title}</button>
          </div>
        </form>
      ) : (
        <>
          {canManage && !closed && (
            <div className="ledger-actions">
              {expense &&
                row.status === "PENDING" &&
                ["approve", "reject"].map((d) => (
                  <button
                    key={d}
                    disabled={busy}
                    className="secondary"
                    onClick={(e) => submit(e, d)}
                  >
                    {d === "approve" ? "Aprovar" : "Recusar"}
                  </button>
                ))}
              {Number(row.openAmount) > 0 &&
                ["APPROVED", "EXPECTED", "PARTIAL"].includes(row.status) && (
                  <button className="primary-button" onClick={() => begin("SETTLE")}>
                    Registrar {payment}
                  </button>
                )}
              {!!reversible.length && (
                <button className="secondary" onClick={() => begin("REVERSE")}>
                  Estornar baixa
                </button>
              )}
              {!Number(row.settledAmount) && (
                <>
                  <button disabled={busy} className="secondary" onClick={() => begin("CORRECT")}>
                    Corrigir
                  </button>
                  <button disabled={busy} className="secondary" onClick={() => begin("CANCEL")}>
                    Cancelar lançamento
                  </button>
                </>
              )}
            </div>
          )}
          <dl className="ledger-details">
            {Object.entries(fields)
              .filter(([k]) => k !== "attachments" && row[k] != null && row[k] !== "")
              .map(([k, label]) => (
                <div key={k}>
                  <dt>{label}</dt>
                  <dd>{value(row, k)}</dd>
                </div>
              ))}
          </dl>
          <h3>Histórico</h3>
          {(row.history || []).length ? (
            <ol>
              {row.history.map((e) => (
                <li key={e.id || "original"}>
                  <strong>{actions[e.action]}</strong> {e.movementDate && day(e.movementDate)}{" "}
                  {e.amount != null && money(e.amount)}
                  <small className="table-caption">
                    {[
                      e.accountName,
                      e.method,
                      e.actor,
                      e.recordedAt && new Date(e.recordedAt).toLocaleString("pt-BR"),
                      e.note,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p>Lançamento anterior ao histórico de alterações.</p>
          )}
          <h3>Anexos</h3>
          {filesOf(row).length ? (
            filesOf(row).map((f) => (
              <p key={f.url}>
                <button
                  className="secondary"
                  onClick={() => getFile(f).catch((e) => setError(e.message))}
                >
                  {f.eventId ? "Comprovante" : "Baixar"} · {f.name}
                </button>
              </p>
            ))
          ) : (
            <p>Nenhum anexo.</p>
          )}
        </>
      )}
    </FormModal>
  );
}
