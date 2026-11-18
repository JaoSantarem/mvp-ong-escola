import { FormModal } from "./ui/FormModal.jsx";
import React, { useState } from "react";
import { Form } from "./ui/Form.jsx";
import { Field } from "./ui/Field.jsx";
export function WorkshopEditor({ record, api, doAction, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(record?.name || "");
  const [description, setDescription] = useState(record?.description || "");
  const [active, setActive] = useState(record?.active !== false);
  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const ok = await doAction(() =>
      api(record ? "workshops/" + record.id : "workshops", record ? "PUT" : "POST", {
        name: name.trim(),
        description,
        active,
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
      title={record ? "Editar oficina" : "Cadastrar oficina"}
    >
      <Form onSubmit={save}>
        <Field>
          Nome
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Teatro e expressão"
          />
        </Field>
        <Field>
          Conteúdo / descrição
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objetivos e conteúdo programático"
          />
        </Field>
        {record && (
          <label className="check">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{" "}
            Oficina ativa para novos encontros e matrículas
          </label>
        )}
        <button disabled={saving}>
          {saving ? "Salvando…" : record ? "Salvar alterações" : "Criar oficina"}
        </button>
      </Form>
    </FormModal>
  );
}
