import React, { useMemo } from "react";

const WEEKDAY_PT = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const MONTH_PT   = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

const COLOR_BY_ID = {
  "1": "#74C0FC",
  "2": "#69DB7C",
  "3": "#C77DFF",
  "4": "#FF6B9D",
  "5": "#FFD43B",
  "6": "#FFA94D",
  "11": "#FF6B6B",
};

function getEventColor(event) {
  return COLOR_BY_ID[event.colorId] || "#FF6B9D";
}

function getEventEmoji(event) {
  const title = event.summary || "";
  const match = title.match(/^(\p{Emoji})/u);
  return match ? match[1] : "📅";
}

function getEventTitle(event) {
  const title = event.summary || "Compromisso";
  return title.replace(/^(\p{Emoji})\s*/u, "");
}

function getEventTime(event) {
  if (event.start?.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
    const fmt = (d) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
  }
  return "Dia todo";
}

function getEventDate(event) {
  if (event.start?.date) return new Date(event.start.date + "T00:00:00");
  if (event.start?.dateTime) return new Date(event.start.dateTime);
  return null;
}

const DayView = ({ date, events, onBack, onAddEvent, onDeleteEvent }) => {
  const dayEvents = useMemo(() => {
    if (!date) return [];
    return events.filter((ev) => {
      const d = getEventDate(ev);
      if (!d) return false;
      return (
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear()
      );
    });
  }, [events, date]);

  if (!date) return null;

  const weekday = WEEKDAY_PT[date.getDay()];
  const dateLabel = `${date.getDate()} de ${MONTH_PT[date.getMonth()].charAt(0).toUpperCase() + MONTH_PT[date.getMonth()].slice(1)} de ${date.getFullYear()}`;

  const handleDelete = (ev) => {
    if (window.confirm(`Apagar "${ev.summary}"?`)) {
      onDeleteEvent(ev.id);
    }
  };

  return (
    <div className="day-view">
      {/* Header colorido */}
      <div className="day-header">
        <button className="back-btn touch-btn" onClick={onBack} aria-label="Voltar">
          ‹
        </button>
        <div className="day-header-info">
          <div className="day-header-weekday">{weekday}</div>
          <div className="day-header-date">{dateLabel}</div>
        </div>
        <button className="day-add-btn touch-btn" onClick={onAddEvent}>
          <span>＋</span>
          Novo
        </button>
      </div>

      {/* Lista de eventos */}
      {dayEvents.length === 0 ? (
        <div className="day-empty">
          <div className="day-empty-emoji">🌟</div>
          <div className="day-empty-text">
            Nenhum compromisso ainda!<br />
            Toque em "Novo" para adicionar ✨
          </div>
        </div>
      ) : (
        <div className="day-events-list">
          {dayEvents.map((ev, idx) => (
            <div
              key={ev.id}
              className="event-card"
              style={{
                "--event-color": getEventColor(ev),
                animationDelay: `${idx * 0.06}s`,
              }}
            >
              <div className="event-emoji-big">{getEventEmoji(ev)}</div>
              <div className="event-info">
                <div className="event-title">{getEventTitle(ev)}</div>
                <div className="event-time">
                  <span>🕐</span>
                  {getEventTime(ev)}
                </div>
                {ev.description && (
                  <div className="event-notes">{ev.description}</div>
                )}
              </div>
              <button
                className="event-delete-btn touch-btn"
                onClick={() => handleDelete(ev)}
                aria-label="Apagar evento"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DayView;
