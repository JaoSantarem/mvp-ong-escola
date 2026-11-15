import React, { useEffect, useState } from "react";
import { Panel } from "../ui/Panel.jsx";
import { MeetingCalendar } from "./MeetingCalendar.jsx";
import { AttendanceModal } from "./AttendanceModal.jsx";
import { date } from "../../utils/formatters.js";

export function OverviewCalendar({ api, workshops }) {
  const [meetings, setMeetings] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [detail, setDetail] = useState(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all(
      workshops.map(async (w) => {
        const rows = await api("workshops/" + w.id + "/meetings");
        return rows.map((m) => ({ ...m, workshopName: w.name }));
      }),
    )
      .then((rows) => {
        if (active) setMeetings(rows.flat());
      })
      .catch(() => {
        if (active)
          setError(
            "Não foi possível carregar os encontros. Atualize a página para tentar novamente.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workshops]);
  async function open(m) {
    const attendance = await api("meetings/" + m.id + "/attendance");
    setDetail({ ...m, attendance });
  }
  return (
    <>
      {loading ? (
        <Panel title="Calendário de encontros">
          <p role="status">Carregando encontros de todas as oficinas…</p>
        </Panel>
      ) : error ? (
        <Panel title="Calendário de encontros">
          <p role="alert">{error}</p>
        </Panel>
      ) : (
        <MeetingCalendar meetings={meetings} onOpen={open} detailLabel="Ver detalhes" />
      )}
      {detail && (
        <AttendanceModal
          title={"Encontro · " + date(detail.meetingDate)}
          onClose={() => setDetail(null)}
        >
          <div className="meeting-details">
            <strong>{detail.workshopName}</strong>
            <p>{detail.topic || "Conteúdo não informado"}</p>
            <p>
              {detail.startTime
                ? detail.startTime.slice(0, 5) + " – " + detail.endTime?.slice(0, 5)
                : "Horário não informado"}
            </p>
          </div>
          <h3>Alunos e presença</h3>
          {detail.attendance.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">Presença</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.attendance.map((a) => (
                    <tr key={a.student.id}>
                      <td data-label="Aluno">{a.student.name}</td>
                      <td data-label="Presença">
                        {a.id == null ? "Não registrada" : a.present ? "Presente" : "Ausente"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Nenhum aluno na chamada deste encontro.</p>
          )}
        </AttendanceModal>
      )}
    </>
  );
}
