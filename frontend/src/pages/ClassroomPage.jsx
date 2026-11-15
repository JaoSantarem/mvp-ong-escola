import React, { useEffect, useState } from "react";
import { Heading } from "../components/ui/Heading.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { Form } from "../components/ui/Form.jsx";
import { Field } from "../components/ui/Field.jsx";
import { MeetingCalendar } from "../components/calendar/MeetingCalendar.jsx";
import { date } from "../utils/formatters.js";
import { AttendanceModal } from "../components/calendar/AttendanceModal.jsx";

export function Classroom({ api, data, doAction, setPage, workshopId }) {
  const [roster, Roster] = useState([]),
    [addStudent, AddStudent] = useState(""),
    [rosterBusy, RosterBusy] = useState(false),
    [rosterMessage, RosterMessage] = useState("");
  const [startTime, Start] = useState(""),
    [endTime, End] = useState("");
  const id = workshopId;
  const workshop = data.workshops.find((w) => w.id === id);
  const [enroll, E] = useState([]),
    [assign, A] = useState([]),
    [meetings, M] = useState([]),
    [meeting, MT] = useState(null),
    [selected, S] = useState({}),
    [notes, N] = useState([]),
    [student, ST] = useState(""),
    [instructor, IN] = useState(""),
    [day, D] = useState(""),
    [topic, T] = useState(""),
    [note, Note] = useState("");
  useEffect(() => {
    Promise.all([
      api("workshops/" + id + "/enrollments"),
      api("workshops/" + id + "/instructors"),
      api("workshops/" + id + "/meetings"),
    ]).then(([e, a, m]) => {
      E(e);
      A(a);
      M(m);
    });
  }, [id]);
  async function choose(m) {
    S({});
    N([]);
    Note("");
    const [a, n] = await Promise.all([
      api("meetings/" + m.id + "/attendance"),
      api("meetings/" + m.id + "/notes"),
    ]);
    const x = {};
    a.forEach((v) => (x[v.student.id] = v.present));
    S(x);
    Roster(a.map((v) => v.student));
    AddStudent("");
    RosterMessage("");
    N(n);
    MT(m);
  }
  if (!workshop) return <p>Oficina não encontrada.</p>;
  return (
    <>
      <button className="link" onClick={() => setPage("workshops")}>
        ← Oficinas
      </button>
      <Heading
        title={workshop.name}
        sub={workshop.description || "Equipe, matrículas, encontros e presença."}
      />
      <div className="columns">
        <Panel title="Vincular instrutor">
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              await doAction(async () => {
                await api("workshops/" + id + "/instructors", "POST", {
                  instructorId: Number(instructor),
                });
                A(await api("workshops/" + id + "/instructors"));
              });
            }}
          >
            <Field>
              Adicionar instrutor
              <select value={instructor} onChange={(e) => IN(e.target.value)}>
                <option value="">Selecione</option>
                {(data.instructors || [])
                  .filter((i) => !assign.some((x) => x.instructor.id === i.id))
                  .map((i) => (
                    <option value={i.id}>{i.name}</option>
                  ))}
              </select>
            </Field>
            <button>Vincular</button>
          </Form>
        </Panel>
        <Panel title="Matricular participante">
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              await doAction(async () => {
                await api("workshops/" + id + "/enrollments", "POST", {
                  studentId: Number(student),
                });
                E(await api("workshops/" + id + "/enrollments"));
              });
            }}
          >
            <Field>
              Matricular participante
              <select value={student} onChange={(e) => ST(e.target.value)}>
                <option value="">Selecione</option>
                {data.students
                  .filter((s) => !enroll.some((x) => x.student.id === s.id))
                  .map((s) => (
                    <option value={s.id}>{s.name}</option>
                  ))}
              </select>
            </Field>
            <button>Matricular</button>
          </Form>
        </Panel>
      </div>
      <Panel title={"Instrutores · " + assign.length}>
        {assign.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col">Nome</th>
                  <th scope="col">Área de atuação</th>
                  <th scope="col">Contato</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {assign.map((x) => (
                  <tr role="row" key={x.id}>
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
      <Panel title={"Participantes matriculados · " + enroll.length}>
        {enroll.length ? (
          <div className="table-scroll">
            <table role="table">
              <thead>
                <tr role="row">
                  <th scope="col">Nome</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {enroll.map((x) => (
                  <tr role="row" key={x.id}>
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
      <Panel title="Criar encontro">
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
              M([...meetings, m]);
              D("");
              T("");
            });
          }}
        >
          <Field>
            Data
            <input type="date" required value={day} onChange={(e) => D(e.target.value)} />
          </Field>
          <Field>
            Início
            <input type="time" required value={startTime} onChange={(e) => Start(e.target.value)} />
          </Field>
          <Field>
            Término
            <input
              type="time"
              required
              min={startTime}
              value={endTime}
              onChange={(e) => End(e.target.value)}
            />
          </Field>
          <Field>
            Conteúdo do encontro
            <input value={topic} onChange={(e) => T(e.target.value)} />
          </Field>
          <button>Criar encontro</button>
        </Form>
      </Panel>
      <MeetingCalendar meetings={meetings} onOpen={choose} />
      <Panel title={"Encontros · " + meetings.length}>
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
                      <button className="small" onClick={() => choose(x)}>
                        Abrir chamada
                      </button>
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
          onClose={() => MT(null)}
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
          <p>
            Adicione ou remova alunos deste encontro e marque quem compareceu. Clique em Salvar
            chamada para confirmar as alterações.
          </p>
          <div className="meeting-roster-add">
            <label>
              Adicionar aluno
              <select
                value={addStudent}
                disabled={rosterBusy}
                onChange={(e) => AddStudent(e.target.value)}
              >
                <option value="">Selecione um aluno cadastrado</option>
                {data.students
                  .filter((s) => !roster.some((r) => r.id === s.id))
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
                  Roster([...roster, s]);
                  S({ ...selected, [s.id]: false });
                  AddStudent("");
                  RosterMessage("");
                }
              }}
            >
              Adicionar aluno
            </button>
          </div>
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
                    S({ ...selected, [s.id]: e.target.checked });
                    RosterMessage("");
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
                  Roster(roster.filter((r) => r.id !== s.id));
                  RosterMessage("");
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
              RosterBusy(true);
              RosterMessage("");
              try {
                await api(
                  "meetings/" + meeting.id + "/attendance",
                  "PUT",
                  roster.map((s) => ({ studentId: s.id, present: !!selected[s.id] })),
                );
                RosterMessage("Chamada salva com sucesso.");
              } catch (e) {
                RosterMessage(e.message);
              } finally {
                RosterBusy(false);
              }
            }}
          >
            {rosterBusy ? "Salvando…" : "Salvar chamada"}
          </button>
          {rosterMessage && <p role="status">{rosterMessage}</p>}
          <hr />
          <h3>Observação pedagógica</h3>
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              await doAction(async () => {
                await api("meetings/" + meeting.id + "/notes", "POST", { text: note });
                N(await api("meetings/" + meeting.id + "/notes"));
                Note("");
              });
            }}
          >
            <Field>
              Registro
              <textarea value={note} onChange={(e) => Note(e.target.value)} required />
            </Field>
            <button>Salvar observação</button>
          </Form>
          {notes.map((n) => (
            <p className="note">
              {n.text}
              <small>
                {n.author} · {n.createdAt?.slice(0, 10)}
              </small>
            </p>
          ))}
        </AttendanceModal>
      )}
    </>
  );
}
