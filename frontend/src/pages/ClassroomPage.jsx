import { WorkshopEditor } from "../components/WorkshopEditor.jsx";
import { EditButton } from "../components/ui/EditButton.jsx";
import { DeleteMeetingModal } from "../components/calendar/DeleteMeetingModal.jsx";
import { PersonPhoto, useAvatars } from "../components/photos/Photos.jsx";
import { NavIcon } from "../components/ui/NavIcon.jsx";
import { MeetingPhotos } from "../components/photos/MeetingPhotos.jsx";
import { FormModal } from "../components/ui/FormModal.jsx";
import { SectionNav } from "../components/ui/SectionNav.jsx";
import React, { useEffect, useState } from "react";
import { Heading } from "../components/ui/Heading.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { Form } from "../components/ui/Form.jsx";
import { Field } from "../components/ui/Field.jsx";
import { MeetingCalendar } from "../components/calendar/MeetingCalendar.jsx";
import { date } from "../utils/formatters.js";
import { AttendanceModal } from "../components/calendar/AttendanceModal.jsx";

export function Classroom({ api, data, doAction, setPage, workshopId, profile, refresh }) {
  const [editing, setEditing] = useState(false);
  const [roster, setRoster] = useState([]);
  const [addStudent, setAddStudent] = useState("");
  const [rosterBusy, setRosterBusy] = useState(false);
  const [rosterMessage, setRosterMessage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [removing, setRemoving] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [meetingView, setMeetingView] = useState("attendance");
  const [creating, setCreating] = useState(null);
  const [section, setSection] = useState("meetings");
  const { photos: instructorPhotos, error: instructorPhotoError } = useAvatars(
    section === "members" ? "INSTRUCTOR" : null,
    api,
  );
  const { photos: studentPhotos, error: studentPhotoError } = useAvatars(
    section === "members" ? "STUDENT" : null,
    api,
  );
  const id = workshopId;
  const workshop = data.workshops.find((w) => w.id === id);
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [meeting, setMeeting] = useState(null);
  const [selected, setSelected] = useState({});
  const [notes, setNotes] = useState([]);
  const [student, setStudent] = useState("");
  const [instructor, setInstructor] = useState("");
  const [day, setDay] = useState("");
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    Promise.all([
      api("workshops/" + id + "/enrollments"),
      api("workshops/" + id + "/instructors"),
      api("workshops/" + id + "/meetings"),
    ]).then(([enrollments, assignments, meetings]) => {
      setEnrollments(enrollments);
      setAssignments(assignments);
      setMeetings(meetings);
    });
  }, [id]);
  async function openMeeting(selectedMeeting) {
    setMeetingView("attendance");
    setSelected({});
    setNotes([]);
    setNote("");
    const [attendance, meetingNotes] = await Promise.all([
      api("meetings/" + selectedMeeting.id + "/attendance"),
      api("meetings/" + selectedMeeting.id + "/notes"),
    ]);
    const presenceByStudent = {};
    for (const record of attendance) {
      presenceByStudent[record.student.id] = record.present;
    }
    setSelected(presenceByStudent);
    setRoster(attendance.map((record) => record.student));
    setAddStudent("");
    setRosterMessage("");
    setNotes(meetingNotes);
    setMeeting(selectedMeeting);
  }

  if (!workshop) return <p>Oficina não encontrada.</p>;
  return (
    <>
      <button type="button" className="back-button" onClick={() => setPage("workshops")}>
        <span aria-hidden="true">←</span> Voltar às oficinas
      </button>
      {editing && (
        <WorkshopEditor
          record={workshop}
          api={api}
          doAction={doAction}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
      <Heading
        title={
          <span className="ledger-actions">
            {workshop.name}
            {["ADMIN", "COORDINATOR"].includes(profile?.role) && (
              <EditButton name={workshop.name} onClick={() => setEditing(true)} />
            )}
          </span>
        }
        action={
          section === "meetings" &&
          workshop.active && (
            <button
              type="button"
              className="primary-button"
              aria-expanded={creating === "meeting"}
              onClick={() => setCreating("meeting")}
            >
              + Novo encontro
            </button>
          )
        }
        sub={workshop.description || "Equipe, matrículas, encontros e presença."}
      />
      <SectionNav
        label="Seções da turma"
        value={section}
        onChange={setSection}
        items={[
          ["meetings", "Encontros, chamada e registros"],
          ["members", "Matrículas e instrutores"],
        ]}
      />
      <p className="section-description">
        {section === "meetings"
          ? "Agende os encontros e abra uma chamada para registrar presenças e observações pedagógicas."
          : "Vincule os instrutores e matricule os participantes desta oficina."}
      </p>
      <div className="classroom-add-actions" hidden={section !== "members" || !workshop.active}>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setCreating("instructor")}
        >
          + Vincular instrutor
        </button>
        <button type="button" className="primary-button" onClick={() => setCreating("enrollment")}>
          + Matricular participante
        </button>
      </div>
      <FormModal
        title="Vincular instrutor"
        open={creating === "instructor"}
        onClose={() => setCreating(null)}
      >
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            await doAction(async () => {
              await api("workshops/" + id + "/instructors", "POST", {
                instructorId: Number(instructor),
              });
              setAssignments(await api("workshops/" + id + "/instructors"));
              setCreating(null);
              setInstructor("");
            });
          }}
        >
          <Field>
            Adicionar instrutor
            <select required value={instructor} onChange={(e) => setInstructor(e.target.value)}>
              <option value="">Selecione</option>
              {(data.instructors || [])
                .filter(
                  (i) => i.active !== false && !assignments.some((x) => x.instructor.id === i.id),
                )
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
            </select>
          </Field>
          <button>Vincular</button>
        </Form>
      </FormModal>
      <FormModal
        title="Matricular participante"
        open={creating === "enrollment"}
        onClose={() => setCreating(null)}
      >
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            await doAction(async () => {
              await api("workshops/" + id + "/enrollments", "POST", {
                studentId: Number(student),
              });
              setEnrollments(await api("workshops/" + id + "/enrollments"));
              setCreating(null);
              setStudent("");
            });
          }}
        >
          <Field>
            Matricular participante
            <select required value={student} onChange={(e) => setStudent(e.target.value)}>
              <option value="">Selecione</option>
              {data.students
                .filter(
                  (s) => s.active !== false && !enrollments.some((x) => x.student.id === s.id),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </Field>
          <button>Matricular</button>
        </Form>
      </FormModal>

      {section === "members" && (instructorPhotoError || studentPhotoError) && (
        <p className="error" role="alert">
          {instructorPhotoError || studentPhotoError}
        </p>
      )}
      <Panel
        icon={<NavIcon name="team" />}
        title={"Instrutores · " + assignments.length}
        hidden={section !== "members"}
      >
        {assignments.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col" className="photo-column">
                    Foto
                  </th>
                  <th scope="col">Nome</th>
                  <th scope="col">Área de atuação</th>
                  <th scope="col">Contato</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {assignments.map((x) => (
                  <tr role="row" key={x.id}>
                    <td role="cell" data-label="Foto">
                      <PersonPhoto
                        photo={instructorPhotos[x.instructor.id]}
                        name={x.instructor.name}
                      />
                    </td>
                    <td role="cell" data-label="Nome">
                      {x.instructor.name}
                    </td>
                    <td role="cell" data-label="Área de atuação">
                      {x.instructor.area || "—"}
                    </td>
                    <td role="cell" data-label="Contato">
                      {x.instructor.contact || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhum instrutor vinculado ainda.</p>
        )}
      </Panel>
      <Panel
        icon={<NavIcon name="people" />}
        title={"Participantes matriculados · " + enrollments.length}
        hidden={section !== "members"}
      >
        {enrollments.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col" className="photo-column">
                    Foto
                  </th>
                  <th scope="col">Nome</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {enrollments.map((x) => (
                  <tr role="row" key={x.id}>
                    <td role="cell" data-label="Foto">
                      <PersonPhoto photo={studentPhotos[x.student.id]} name={x.student.name} />
                    </td>
                    <td role="cell" data-label="Nome">
                      {x.student.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhum participante matriculado ainda.</p>
        )}
      </Panel>
      <FormModal
        title="Novo encontro"
        open={creating === "meeting"}
        onClose={() => setCreating(null)}
      >
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            await doAction(async () => {
              const m = await api("workshops/" + id + "/meetings", "POST", {
                meetingDate: day,
                topic,
                startTime,
                endTime,
              });
              setMeetings([...meetings, m]);
              setCreating(null);
              setDay("");
              setTopic("");
            });
          }}
        >
          <Field>
            Data
            <input type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
          <Field>
            Início
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field>
            Término
            <input
              type="time"
              required
              min={startTime}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
          <Field>
            Conteúdo do encontro
            <input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </Field>
          <button>Criar encontro</button>
        </Form>
      </FormModal>
      <div hidden={section !== "meetings"}>
        <MeetingCalendar meetings={meetings} onOpen={openMeeting} />
      </div>
      {deleteNotice && (
        <p className="success-notice" role="status">
          {deleteNotice}
        </p>
      )}
      <Panel title={"Encontros · " + meetings.length} hidden={section !== "meetings"}>
        {meetings.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col">Data</th>
                  <th scope="col">Conteúdo</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {meetings.map((x) => (
                  <tr role="row" key={x.id}>
                    <td role="cell" data-label="Data">
                      {date(x.meetingDate)}
                      <small style={{ display: "block" }}>
                        {x.startTime
                          ? x.startTime.slice(0, 5) + " – " + x.endTime?.slice(0, 5)
                          : "Horário não informado"}
                      </small>
                    </td>
                    <td role="cell" data-label="Conteúdo">
                      {x.topic || "—"}
                    </td>
                    <td role="cell" data-label="Ações">
                      <button className="small" onClick={() => openMeeting(x)}>
                        Abrir chamada
                      </button>
                      {["ADMIN", "COORDINATOR"].includes(profile?.role) && (
                        <button
                          type="button"
                          className="delete-icon-button"
                          aria-label={
                            "Excluir encontro de " +
                            date(x.meetingDate) +
                            (x.topic ? ": " + x.topic : "")
                          }
                          title="Excluir encontro"
                          onClick={() => setRemoving(x)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhum encontro cadastrado ainda.</p>
        )}
      </Panel>
      {meeting && (
        <AttendanceModal
          busy={rosterBusy || photoBusy}
          onClose={() => setMeeting(null)}
          title={"Chamada e registro · " + date(meeting.meetingDate)}
        >
          <div className="meeting-details">
            <strong>{meeting.topic || "Encontro"}</strong>
            <p>
              {meeting.startTime
                ? meeting.startTime.slice(0, 5) + " – " + meeting.endTime?.slice(0, 5)
                : "Horário não informado"}
            </p>
          </div>
          <SectionNav
            label="Seções do encontro"
            value={meetingView}
            onChange={(value) => {
              if (!photoBusy) setMeetingView(value);
            }}
            items={[
              ["attendance", "Chamada"],
              ["notes", "Observações"],
              ["photos", "Imagens"],
            ]}
          />
          <div hidden={meetingView !== "attendance"}>
            <p>Marque quem compareceu e salve a chamada para confirmar as alterações.</p>
            <button
              type="button"
              className="secondary-button"
              disabled={rosterBusy}
              onClick={() => setMeetingView("student")}
            >
              + Adicionar aluno
            </button>
          </div>
          <div hidden={meetingView !== "student"}>
            <h3>Adicionar aluno ao encontro</h3>
            <p>A inclusão será confirmada ao salvar a chamada.</p>
            <button type="button" className="link" onClick={() => setMeetingView("attendance")}>
              ← Voltar à chamada
            </button>
            <div className="meeting-roster-add">
              <label>
                Adicionar aluno
                <select
                  value={addStudent}
                  disabled={rosterBusy}
                  onChange={(e) => setAddStudent(e.target.value)}
                >
                  <option value="">Selecione um aluno cadastrado</option>
                  {data.students
                    .filter((s) => s.active !== false && !roster.some((r) => r.id === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className="save-attendance"
                disabled={!addStudent || rosterBusy}
                onClick={() => {
                  const s = data.students.find((s) => s.id === Number(addStudent));
                  if (s) {
                    setRoster([...roster, s]);
                    setSelected({ ...selected, [s.id]: false });
                    setAddStudent("");
                    setRosterMessage("");
                    setMeetingView("attendance");
                  }
                }}
              >
                Adicionar aluno
              </button>
            </div>
          </div>
          <div hidden={meetingView !== "attendance"}>
            {!roster.length && <p>Nenhum aluno na chamada deste encontro.</p>}
            {roster.map((s) => (
              <div className="meeting-roster-row" key={s.id}>
                <span>{s.name}</span>
                <label className="check">
                  <input
                    type="checkbox"
                    disabled={rosterBusy}
                    checked={!!selected[s.id]}
                    onChange={(e) => {
                      setSelected({ ...selected, [s.id]: e.target.checked });
                      setRosterMessage("");
                    }}
                  />
                  Presente
                </label>
                <button
                  type="button"
                  className="remove-roster"
                  disabled={rosterBusy}
                  aria-label={"Remover " + s.name + " deste encontro"}
                  onClick={() => {
                    setRoster(roster.filter((r) => r.id !== s.id));
                    setRosterMessage("");
                  }}
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              className="save-attendance"
              disabled={rosterBusy}
              onClick={async () => {
                setRosterBusy(true);
                setRosterMessage("");
                try {
                  await api(
                    "meetings/" + meeting.id + "/attendance",
                    "PUT",
                    roster.map((s) => ({ studentId: s.id, present: !!selected[s.id] })),
                  );
                  setRosterMessage("Chamada salva com sucesso.");
                } catch (e) {
                  setRosterMessage(e.message);
                } finally {
                  setRosterBusy(false);
                }
              }}
            >
              {rosterBusy ? "Salvando…" : "Salvar chamada"}
            </button>
            {rosterMessage && <p role="status">{rosterMessage}</p>}
          </div>
          <div hidden={meetingView !== "notes"}>
            <h3>Observação pedagógica</h3>
            <Form
              onSubmit={async (e) => {
                e.preventDefault();
                await doAction(async () => {
                  await api("meetings/" + meeting.id + "/notes", "POST", { text: note });
                  setNotes(await api("meetings/" + meeting.id + "/notes"));
                  setNote("");
                });
              }}
            >
              <Field>
                Registro
                <textarea value={note} onChange={(e) => setNote(e.target.value)} required />
              </Field>
              <button>Salvar observação</button>
            </Form>
            {notes.map((n) => (
              <p className="note" key={n.id}>
                {n.text}
                <small>
                  {n.author}
                  {n.createdAt && " · " + new Date(n.createdAt).toLocaleString("pt-BR")}
                </small>
              </p>
            ))}
          </div>
          {meetingView === "photos" && (
            <MeetingPhotos
              onBusyChange={setPhotoBusy}
              meeting={meeting}
              api={api}
              canUpload={["ADMIN", "COORDINATOR", "INSTRUCTOR"].includes(profile?.role)}
            />
          )}
        </AttendanceModal>
      )}
      {removing && (
        <DeleteMeetingModal
          meeting={removing}
          profile={profile}
          onClose={() => setRemoving(null)}
          onDeleted={(id) => {
            setMeetings((rows) => rows.filter((row) => row.id !== id));
            if (meeting?.id === id) setMeeting(null);
            setRemoving(null);
            setDeleteNotice("Encontro excluído com sucesso.");
            refresh().catch(() =>
              setDeleteNotice(
                "Encontro excluído. Atualize a página para sincronizar os indicadores.",
              ),
            );
          }}
        />
      )}
    </>
  );
}
