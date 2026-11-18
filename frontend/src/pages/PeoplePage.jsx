import { EditButton } from "../components/ui/EditButton.jsx";
import {
  PersonPhoto,
  ProfilePhotoField,
  uploadProfilePhoto,
  validateProfilePhoto,
  useAvatars,
} from "../components/photos/Photos.jsx";
import { FormModal } from "../components/ui/FormModal.jsx";
import { ListToolbar, matchesSearch } from "../components/ui/ListToolbar.jsx";
import React, { useState } from "react";
import { Heading } from "../components/ui/Heading.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { Form } from "../components/ui/Form.jsx";
import { Field } from "../components/ui/Field.jsx";
import { date } from "../utils/formatters.js";

export function People({ data, api, doAction, profile }) {
  const [editing, setEditing] = useState(null);
  const [active, setActive] = useState(true);
  const [photoFile, setPhotoFile] = useState(null);
  const [formError, setFormError] = useState("");
  function openEditor(person = null) {
    setEditing(person);
    setActive(person?.active !== false);
    setName(person?.name || "");
    setBirthDate(person?.birthDate || "");
    setGuardian(person?.responsibleName || "");
    setConsent(person?.imageConsent || false);
    setPhotoFile(null);
    setFormError("");
    setCreating(true);
  }
  const [photoVersion, setPhotoVersion] = useState(0);
  const { photos: avatars, error: photoError } = useAvatars("STUDENT", api, photoVersion);
  const canUploadPhotos = ["ADMIN", "COORDINATOR"].includes(profile?.role);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = data.students.filter((s) => matchesSearch([s.name, s.responsibleName], search));
  const [name, setName] = useState("");
  const [birth, setBirthDate] = useState("");
  const [guardian, setGuardian] = useState("");
  const [consent, setConsent] = useState(false);
  async function add(e) {
    e.preventDefault();
    if (saving) return;
    setFormError("");
    try {
      validateProfilePhoto(photoFile);
    } catch (error) {
      setFormError(error.message);
      return;
    }
    setSaving(true);
    const wasEditing = !!editing;
    const saved = await doAction(async () => {
      const record = await api(
        editing ? "students/" + editing.id : "students",
        editing ? "PUT" : "POST",
        {
          name: name,
          birthDate: birth || null,
          responsibleName: guardian,
          imageConsent: consent,
          active,
        },
      );
      setEditing(record);
      await uploadProfilePhoto("STUDENT", record.id, photoFile);
      setPhotoFile(null);
      setPhotoVersion((version) => version + 1);
    });
    setSaving(false);
    if (!saved) return;
    setCreating(false);
    setNotice(
      wasEditing ? "Participante atualizado com sucesso." : "Participante cadastrado com sucesso.",
    );
    setName("");
    setBirthDate("");
    setGuardian("");
    setConsent(false);
  }
  return (
    <>
      <Heading
        title="Participantes"
        sub="Pessoas atendidas, responsáveis e autorizações em um só lugar."
        action={
          <button
            type="button"
            className="primary-button"
            aria-expanded={creating}
            onClick={() => openEditor()}
          >
            + Novo participante
          </button>
        }
      />
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}
      <FormModal
        busy={saving}
        open={creating}
        onClose={() => setCreating(false)}
        title={editing ? "Editar participante" : "Novo participante"}
      >
        {formError && (
          <p className="error" role="alert">
            {formError}
          </p>
        )}
        <Form onSubmit={add}>
          <ProfilePhotoField
            file={photoFile}
            onChange={setPhotoFile}
            existing={avatars[editing?.id]}
            name={name}
            disabled={saving}
          />
          <Field>
            Nome completo
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            Nascimento
            <input type="date" value={birth} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
          <Field>
            Responsável (obrigatório para menor)
            <input value={guardian} onChange={(e) => setGuardian(e.target.value)} />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Consentimento de imagem confirmado
          </label>
          {editing && (
            <label className="check">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Cadastro ativo para novas matrículas
            </label>
          )}
          <button disabled={saving}>
            {saving ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar participante"}
          </button>
        </Form>
      </FormModal>
      <ListToolbar
        label="Buscar participante ou responsável"
        placeholder="Buscar participante ou responsável…"
        value={search}
        onChange={setSearch}
        count={filtered.length}
      />
      {search.trim() && !filtered.length && (
        <div className="empty-state">
          <b>Nenhum resultado encontrado</b>Tente outro nome ou{" "}
          <button type="button" className="link" onClick={() => setSearch("")}>
            limpe a busca
          </button>
          .
        </div>
      )}
      <Panel title={"Participantes cadastrados · " + data.students.length}>
        {!data.students.length && (
          <div className="empty-state">
            <b>Nenhum participante cadastrado</b>Cadastre uma pessoa para começar as matrículas.
          </div>
        )}
        <div className="table-scroll">
          <table role="table">
            <thead>
              <tr role="row">
                <th scope="col" className="photo-column">
                  Foto
                </th>
                <th scope="col">Nome</th>
                <th scope="col">Nascimento</th>
                <th scope="col">Responsável</th>
                <th scope="col">Uso de imagem</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {filtered.map((s) => (
                <tr role="row" key={s.id}>
                  <td role="cell" data-label="Foto">
                    <PersonPhoto photo={avatars[s.id]} name={s.name} />
                  </td>
                  <td role="cell" data-label="Nome">
                    {s.name}
                    {s.active === false && <small className="table-caption">Inativo</small>}
                  </td>
                  <td role="cell" data-label="Nascimento">
                    {date(s.birthDate)}
                  </td>
                  <td role="cell" data-label="Responsável">
                    {s.responsibleName || "—"}
                  </td>
                  <td role="cell" data-label="Uso de imagem">
                    <span
                      className={"status-badge " + (s.imageConsent ? "is-positive" : "is-neutral")}
                    >
                      {s.imageConsent ? "Autorizada" : "Não autorizada"}
                    </span>
                  </td>
                  <td role="cell" data-label="Ações">
                    {canUploadPhotos && <EditButton name={s.name} onClick={() => openEditor(s)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {photoError && (
        <p className="error" role="alert">
          {photoError}
        </p>
      )}
    </>
  );
}
