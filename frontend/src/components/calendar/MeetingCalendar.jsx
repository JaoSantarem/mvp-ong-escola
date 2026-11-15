import React, { useState } from "react";
import { Panel } from "../ui/Panel.jsx";
import { date } from "../../utils/formatters.js";
import { AttendanceModal } from "./AttendanceModal.jsx";

export function MeetingCalendar({ meetings, onOpen, detailLabel = "Abrir chamada" }) {
  const [selectedDay, selectDay] = useState(null);
  const [opening, setOpening] = useState(false),
    [openError, setOpenError] = useState("");
  async function openMeeting(m) {
    setOpening(true);
    setOpenError("");
    try {
      await onOpen(m);
      selectDay(null);
    } catch {
      setOpenError("Não foi possível abrir o encontro. Tente novamente.");
    } finally {
      setOpening(false);
    }
  }
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const year = month.getFullYear(),
    mo = month.getMonth(),
    offset = new Date(year, mo, 1).getDay(),
    count = new Date(year, mo + 1, 0).getDate();
  return (
    <Panel title="Calendário de encontros">
      <div className="calendar-nav">
        <button onClick={() => setMonth(new Date(year, mo - 1, 1))} aria-label="Mês anterior">
          ←
        </button>
        <strong aria-live="polite">
          {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </strong>
        <button onClick={() => setMonth(new Date(year, mo + 1, 1))} aria-label="Próximo mês">
          →
        </button>
      </div>
      <div className="meeting-calendar">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((x) => (
          <b key={x}>{x}</b>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={"empty" + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day =
            String(year) +
            "-" +
            String(mo + 1).padStart(2, "0") +
            "-" +
            String(i + 1).padStart(2, "0");
          const dayMeetings = meetings
            .filter((m) => m.meetingDate === day)
            .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
          return (
            <button
              type="button"
              className="calendar-day calendar-day-trigger"
              key={day}
              onClick={() => {
                selectDay(day);
                setOpenError("");
              }}
              aria-label={date(day) + ", " + dayMeetings.length + " encontros"}
            >
              <span>{i + 1}</span>
              {dayMeetings.length > 3 ? (
                <strong className="calendar-count">{dayMeetings.length} encontros</strong>
              ) : (
                dayMeetings.map((m) => (
                  <span className="calendar-preview" key={m.id}>
                    {m.startTime?.slice(0, 5) || "Sem horário"}{" "}
                    {m.workshopName && <b>{m.workshopName} · </b>}
                    {m.topic || "Encontro"}
                  </span>
                ))
              )}
            </button>
          );
        })}
      </div>
      {selectedDay && (
        <AttendanceModal title={"Encontros · " + date(selectedDay)} onClose={() => selectDay(null)}>
          {openError && <p role="alert">{openError}</p>}
          <div className="day-meeting-list">
            {meetings
              .filter((m) => m.meetingDate === selectedDay)
              .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
              .map((m) => (
                <button type="button" key={m.id} disabled={opening} onClick={() => openMeeting(m)}>
                  <span>
                    {m.workshopName && <small>{m.workshopName}</small>}
                    <strong>{m.topic || "Encontro"}</strong>
                    <small>
                      {m.startTime
                        ? m.startTime.slice(0, 5) + " – " + m.endTime?.slice(0, 5)
                        : "Horário não informado"}
                    </small>
                  </span>
                  <span>{detailLabel} →</span>
                </button>
              ))}
            {!meetings.some((m) => m.meetingDate === selectedDay) && (
              <p>Nenhum encontro neste dia.</p>
            )}
          </div>
        </AttendanceModal>
      )}
    </Panel>
  );
}
