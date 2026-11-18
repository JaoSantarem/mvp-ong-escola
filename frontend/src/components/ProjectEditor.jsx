import { FormModal } from "./ui/FormModal.jsx";
import React, { useState } from "react";
import { brl, currencyNumber, maskCurrency } from "../utils/formatters.js";
import { Form } from "./ui/Form.jsx";
import { Field } from "./ui/Field.jsx";
export function ProjectEditor({ record, api, doAction, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(record?.name || "");
  const [funder, setFunder] = useState(record?.funder || "");
  const [budget, setBudget] = useState(record ? brl(record.budget) : "");
  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const ok = await doAction(() =>
      api(record ? "projects/" + record.id : "projects", record ? "PUT" : "POST", {
        name: name.trim(),
        funder: funder.trim(),
        budget: currencyNumber(budget),
      }),
    );
    setSaving(false);
    if (ok) onSaved();
  }
  return (
    <FormModal
      busy={saving}
      open
      onClose={onClose}
      title={record ? "Editar projeto" : "Novo projeto"}
    >
      <Form onSubmit={save}>
        <Field>
          Nome do projeto
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Oficinas de esporte 2026"
          />
        </Field>
        <Field>
          Fonte do recurso
          <input
            value={funder}
            onChange={(e) => setFunder(e.target.value)}
            placeholder="Doação, edital, parceria…"
          />
        </Field>
        <Field>
          Orçamento (R$)
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            value={budget}
            onChange={(e) => setBudget(maskCurrency(e.target.value))}
            placeholder="R$ 0,00"
            aria-label="Orçamento em reais"
          />
        </Field>
        <button disabled={saving}>
          {saving ? "Salvando…" : record ? "Salvar alterações" : "Cadastrar projeto"}
        </button>
      </Form>
    </FormModal>
  );
}
