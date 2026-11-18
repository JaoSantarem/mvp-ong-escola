import { EditButton } from "../components/ui/EditButton.jsx";
import React, { useEffect, useState } from "react";
import { FormModal } from "../components/ui/FormModal.jsx";
import { SectionNav } from "../components/ui/SectionNav.jsx";
import { Heading } from "../components/ui/Heading.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { ListToolbar, matchesSearch } from "../components/ui/ListToolbar.jsx";
import {
  PersonPhoto,
  PhotoUploadModal,
  ProfilePhotoField,
  uploadProfilePhoto,
  validateProfilePhoto,
  useAvatars,
} from "../components/photos/Photos.jsx";
import { maskPhone } from "../utils/formatters.js";
function AreaCheckboxes({ day, management, onChange, disabled = false, name = "novo membro" }) {
  return (
    <fieldset className="area-checkboxes">
      <legend>Áreas de acesso</legend>
      <label>
        <input
          type="checkbox"
          checked={day}
          disabled={disabled}
          aria-label={"Dia a Dia de " + name}
          onChange={(e) => onChange("dayToDayAccess", e.target.checked)}
        />
        Dia a Dia
      </label>
      <label>
        <input
          type="checkbox"
          checked={management}
          disabled={disabled}
          aria-label={"Gestão de " + name}
          onChange={(e) => onChange("managementAccess", e.target.checked)}
        />
        Gestão
      </label>
    </fieldset>
  );
}
export function Team({ api, profile, doAction, section = "instructors", setPage }) {
  const [editing, setEditing] = useState(null);
  const [active, setActive] = useState(true);
  const [photoFile, setPhotoFile] = useState(null);
  const [formError, setFormError] = useState("");
  function openInstructor(person = null) {
    setEditing(person);
    setActive(person?.active !== false);
    setName(person?.name || "");
    setArea(person?.area || "");
    setContact(person?.contact || "");
    setPhotoFile(null);
    setFormError("");
    setCreating(true);
  }
  const isAdmin = profile?.role === "ADMIN",
    canEdit = ["ADMIN", "COORDINATOR"].includes(profile?.role);
  const membersView = section === "members" && isAdmin;
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [instructors, setInstructors] = useState([]);
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [memberName, setMemberName] = useState("");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [newAreas, setNewAreas] = useState({ dayToDayAccess: true, managementAccess: false });
  const [setupLink, setSetupLink] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [resetName, setResetName] = useState("");
  const [accessBusy, setAccessBusy] = useState({});
  const [photoOwner, setPhotoOwner] = useState(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const photoType = membersView ? "MEMBER" : "INSTRUCTOR";
  const { photos: avatars, error: photoError } = useAvatars(photoType, api, photoVersion);
  async function load() {
    setLoadError("");
    const [instructors, users] = await Promise.all([
      api("instructors"),
      isAdmin ? api("users") : Promise.resolve([]),
    ]);
    setInstructors(instructors);
    setUsers(users);
  }
  useEffect(() => {
    load().catch((e) => setLoadError(e.message));
  }, [profile?.role]);
  useEffect(() => {
    setCreating(false);
    setSearch("");
    setNotice("");
  }, [section]);
  const filteredInstructors = instructors.filter((i) =>
    matchesSearch([i.name, i.area, i.contact], search),
  );
  const filteredUsers = users.filter((u) => matchesSearch([u.name, u.login, u.email], search));
  async function addInstructor(e) {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    try {
      validateProfilePhoto(photoFile);
    } catch (error) {
      setFormError(error.message);
      return;
    }
    setBusy(true);
    const wasEditing = !!editing;
    const saved = await doAction(async () => {
      const record = await api(
        editing ? "instructors/" + editing.id : "instructors",
        editing ? "PUT" : "POST",
        { name, area, contact, active },
      );
      setEditing(record);
      await uploadProfilePhoto("INSTRUCTOR", record.id, photoFile);
      setPhotoFile(null);
      setPhotoVersion((n) => n + 1);
      await load();
    });
    setBusy(false);
    if (!saved) return;
    setCreating(false);
    setName("");
    setArea("");
    setContact("");
    setNotice(
      wasEditing ? "Instrutor atualizado com sucesso." : "Instrutor cadastrado com sucesso.",
    );
  }
  async function addMember(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const saved = await doAction(async () => {
      const result = await api("users", "POST", { name: memberName, login, email, ...newAreas });
      setSetupLink(window.location.origin + "/?invite=" + encodeURIComponent(result.setupToken));
      await load();
    });
    setBusy(false);
    if (!saved) return;
    setMemberName("");
    setLogin("");
    setEmail("");
    setNewAreas({ dayToDayAccess: true, managementAccess: false });
  }
  async function updateAccess(user, field, value) {
    if (accessBusy[user.id]) return;
    setAccessBusy((state) => ({ ...state, [user.id]: true }));
    const saved = await doAction(async () => {
      const result = await api("users/" + user.id + "/areas", "PUT", {
        dayToDayAccess: user.dayToDayAccess,
        managementAccess: user.managementAccess,
        [field]: value,
      });
      setUsers((rows) => rows.map((u) => (u.id === user.id ? result : u)));
    });
    setAccessBusy((state) => ({ ...state, [user.id]: false }));
    if (saved) setNotice("Áreas de " + (user.name || user.login) + " atualizadas.");
  }
  async function resetPassword(user) {
    if (
      !window.confirm(
        "Redefinir a senha de " +
          (user.name || user.login) +
          "? A pessoa precisará escolher uma nova senha pelo link de primeiro acesso.",
      )
    )
      return;
    await doAction(async () => {
      const result = await api("users/" + user.id + "/password-reset", "POST", {});
      setResetName(user.name || user.login);
      setResetLink(window.location.origin + "/?invite=" + encodeURIComponent(result.setupToken));
    });
  }
  return (
    <>
      <Heading
        title="Equipe"
        sub={
          membersView
            ? "Gerencie os membros e escolha quais áreas cada pessoa pode acessar."
            : "Instrutores, áreas de atuação e contatos da organização."
        }
        action={
          canEdit && (
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (!membersView) {
                  openInstructor();
                  return;
                }
                setSetupLink("");
                setCreating(true);
              }}
            >
              + {membersView ? "Novo membro" : "Novo instrutor"}
            </button>
          )
        }
      />
      <SectionNav
        label="Seções da equipe"
        value={membersView ? "members" : "instructors"}
        onChange={(next) => setPage("team:" + next)}
        items={[
          ["instructors", "Instrutores"],
          ...(isAdmin ? [["members", "Membros e acessos"]] : []),
        ]}
      />
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}
      {loadError && (
        <p className="error" role="alert">
          {loadError}
        </p>
      )}
      {photoError && (
        <p className="error" role="alert">
          {photoError}
        </p>
      )}
      <ListToolbar
        label="Buscar na equipe"
        placeholder={membersView ? "Buscar nome, login ou e-mail…" : "Buscar instrutor ou área…"}
        value={search}
        onChange={setSearch}
        count={membersView ? filteredUsers.length : filteredInstructors.length}
      />
      {search.trim() && !(membersView ? filteredUsers : filteredInstructors).length && (
        <div className="empty-state">
          <b>Nenhum resultado encontrado</b>Tente outro termo ou{" "}
          <button type="button" className="link" onClick={() => setSearch("")}>
            limpe a busca
          </button>
          .
        </div>
      )}
      {membersView ? (
        <Panel title={"Membros da organização · " + users.length}>
          <p className="section-description">
            Dia a Dia: visão geral, oficinas e participantes. Gestão: projetos, financeiro e equipe.
            Administradores mantêm as duas áreas.
          </p>
          {!users.length ? (
            <p>Nenhum membro cadastrado.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Nome</th>
                    <th>Login / e-mail</th>
                    <th>Áreas de acesso</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td data-label="Foto">
                        <PersonPhoto
                          photo={avatars[u.id]}
                          name={u.name || u.login}
                          onEdit={() => setPhotoOwner({ ...u, name: u.name || u.login })}
                        />
                      </td>
                      <td data-label="Nome">
                        {u.name || u.login}
                        {u.permissionRole === "ADMIN" && (
                          <small className="table-caption">Administrador</small>
                        )}
                      </td>
                      <td data-label="Login / e-mail">
                        {u.login}
                        <small className="table-caption">{u.email}</small>
                      </td>
                      <td data-label="Áreas de acesso">
                        <AreaCheckboxes
                          day={u.dayToDayAccess}
                          management={u.managementAccess}
                          name={u.name || u.login}
                          disabled={u.permissionRole === "ADMIN" || !!accessBusy[u.id]}
                          onChange={(field, value) => updateAccess(u, field, value)}
                        />
                        {accessBusy[u.id] && <small role="status">Salvando…</small>}
                      </td>
                      <td data-label="Ações">
                        <button type="button" className="small" onClick={() => resetPassword(u)}>
                          Redefinir senha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {resetLink && (
            <div className="credential-note">
              <b>Link de redefinição para {resetName}</b>
              <code>{resetLink}</code>
              <button type="button" className="small" onClick={() => setResetLink("")}>
                Fechar
              </button>
            </div>
          )}
        </Panel>
      ) : (
        <Panel title={"Instrutores · " + instructors.length}>
          {!instructors.length ? (
            <p>Nenhum instrutor cadastrado.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Nome</th>
                    <th>Área de atuação</th>
                    <th>Contato</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstructors.map((i) => (
                    <tr key={i.id}>
                      <td data-label="Foto">
                        <PersonPhoto photo={avatars[i.id]} name={i.name} />
                      </td>
                      <td data-label="Nome">
                        {i.name}
                        {i.active === false && <small className="table-caption">Inativo</small>}
                      </td>
                      <td data-label="Área de atuação">{i.area || "—"}</td>
                      <td data-label="Contato">{i.contact || "—"}</td>
                      <td data-label="Ações">
                        {canEdit && <EditButton name={i.name} onClick={() => openInstructor(i)} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
      <FormModal
        title={membersView ? "Novo membro" : editing ? "Editar instrutor" : "Novo instrutor"}
        open={creating}
        busy={busy}
        onClose={() => setCreating(false)}
      >
        {membersView ? (
          setupLink ? (
            <div className="credential-note">
              <b>Membro criado. Compartilhe o link de primeiro acesso:</b>
              <code>{setupLink}</code>
              <button type="button" className="secondary-button" onClick={() => setCreating(false)}>
                Concluir
              </button>
            </div>
          ) : (
            <form className="form" onSubmit={addMember}>
              <label>
                Nome completo
                <input
                  value={memberName}
                  required
                  onChange={(e) => setMemberName(e.target.value)}
                />
              </label>
              <label>
                Login
                <input
                  value={login}
                  required
                  minLength={3}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <AreaCheckboxes
                day={newAreas.dayToDayAccess}
                management={newAreas.managementAccess}
                onChange={(field, value) => setNewAreas((state) => ({ ...state, [field]: value }))}
              />
              <p className="full-field section-description">
                Sem uma área marcada, o membro poderá entrar, mas não verá os módulos do sistema.
              </p>
              <button disabled={busy}>{busy ? "Salvando…" : "Criar membro"}</button>
            </form>
          )
        ) : (
          <form className="form" onSubmit={addInstructor}>
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <ProfilePhotoField
              file={photoFile}
              onChange={setPhotoFile}
              existing={avatars[editing?.id]}
              name={name}
              disabled={busy}
            />
            <label>
              Nome
              <input value={name} required onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Área de atuação
              <input value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
            <label>
              Contato
              <input
                type="tel"
                inputMode="tel"
                required
                value={contact}
                maxLength={15}
                pattern="\(\d{2}\) (?:\d{4}|\d{5})-\d{4}"
                title="Informe um telefone com DDD: (11) 91234-5678"
                placeholder="(11) 91234-5678"
                onChange={(e) => setContact(maskPhone(e.target.value))}
              />
            </label>
            {editing && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Ativo para novas oficinas
              </label>
            )}
            <button disabled={busy}>
              {busy ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar instrutor"}
            </button>
          </form>
        )}
      </FormModal>
      {photoOwner && (
        <PhotoUploadModal
          type={photoType}
          owner={photoOwner}
          onClose={() => setPhotoOwner(null)}
          onSaved={async () => setPhotoVersion((n) => n + 1)}
        />
      )}
    </>
  );
}
