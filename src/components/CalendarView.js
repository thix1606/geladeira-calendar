import React, { useMemo } from "react";

const MONTH_NAMES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// Paleta de cores por colorId do Google Calendar
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

function isColorEvent(event) { return (event.summary || "").startsWith("📌 Dia com "); }

function getEventEmoji(event) {
  if (isColorEvent(event)) return null; // evento de cor não exibe emoji no grid
  const title = event.summary || "";
  const match = title.match(/^(\p{Emoji})/u);
  return match ? match[1] : "📅";
}

function getEventDate(event) {
  if (event.start?.date) return new Date(event.start.date + "T00:00:00");
  if (event.start?.dateTime) return new Date(event.start.dateTime);
  return null;
}

const DAY_COLOR_HEX = {
  pink:    '#FF6B9D',
  purple:  '#C77DFF',
  blue:    '#74C0FC',
  green:   '#69DB7C',
  yellow:  '#FFD43B',
  orange:  '#FFA94D',
  red:     '#FF6B6B',
};

const CalendarView = ({ currentDate, events, onDayPress, onMonthChange, onSignOut, dayColors = {}, dateKey, colorsConfig = [], onOpenSettings, todayPulse = false }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Mapeia eventos por dia do mês
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const d = getEventDate(ev);
      if (!d) return;
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    });
    return map;
  }, [events, year, month]);

  // Gera as células do calendário
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = [];

    // Células vazias antes do primeiro dia
    for (let i = 0; i < firstDay; i++) result.push({ type: "empty", key: `e${i}` });

    // Dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ type: "day", day: d, key: `d${d}` });
    }

    return result;
  }, [year, month]);

  const today = new Date();
  const isToday = (day) =>
    today.getDate() === day &&
    today.getMonth() === month &&
    today.getFullYear() === year;

  const isSunday = (day) => new Date(year, month, day).getDay() === 0;
  const isSaturday = (day) => new Date(year, month, day).getDay() === 6;

  return (
    <div className="calendar-view">
      {/* Header */}
      <div className="cal-header">
        <button className="nav-btn touch-btn" onClick={() => onMonthChange(-1)} aria-label="Mês anterior">
          ‹
        </button>

        <div className="cal-month-row">
          <span className="cal-month-name">{MONTH_NAMES_PT[month]}</span>
          <span className="cal-year">{year}</span>
        </div>

        <button className="nav-btn touch-btn" onClick={() => onMonthChange(1)} aria-label="Próximo mês">
          ›
        </button>
      </div>



      {/* Cabeçalho dos dias da semana */}
      <div className="weekdays">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`weekday-label ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div className="cal-grid">
        {cells.map((cell) => {
          if (cell.type === "empty") {
            return <div key={cell.key} className="day-cell empty" />;
          }

          const { day } = cell;
          const dayEvents = eventsByDay[day] || [];
          const hasEvents = dayEvents.length > 0;
          const preview = dayEvents.slice(0, 3);
          const extra = dayEvents.length - 3;

          return (
            <button
              key={cell.key}
              className={[
                "day-cell",
                isToday(day) ? "today" : "",
                isSunday(day) ? "sunday" : "",
                isSaturday(day) ? "saturday" : "",
                hasEvents ? "has-events" : "",
                isToday(day) && todayPulse ? "today-pulse" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => onDayPress(new Date(year, month, day))}
              aria-label={`Dia ${day}${hasEvents ? `, ${dayEvents.length} evento(s)` : ""}`}
              style={(() => {
                const key = dateKey?.(new Date(year, month, day));
                const colorId = key ? dayColors[key] : null;
                const colorDef = colorId ? colorsConfig.find((c) => c.id === colorId) : null;
                const hex = colorDef?.hex ?? (colorId ? DAY_COLOR_HEX[colorId] : null);
                return hex ? { background: hex + '33', borderColor: hex + '99' } : {};
              })()}
            >
              <span className="day-num">{day}</span>
              {(() => {
                const key = dateKey?.(new Date(year, month, day));
                const colorId = key ? dayColors[key] : null;
                const colorDef = colorId ? colorsConfig.find((c) => c.id === colorId) : null;
                if (!colorDef) return null;
                return (
                  <span style={{
                    position: 'absolute', bottom: 3, right: 3,
                    width: 13, height: 13, borderRadius: '50%',
                    background: colorDef.hex,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.42rem', fontWeight: 900, color: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    zIndex: 1,
                  }}>
                    {colorDef.name.charAt(0).toUpperCase()}
                  </span>
                );
              })()}
              {hasEvents && (
                <div className="day-events-preview">
                  {preview.map((ev) => {
                    const emoji = getEventEmoji(ev);
                    if (!emoji) return null; // eventos de cor são omitidos aqui
                    return (
                      <span key={ev.id} className="event-dot-emoji" title={ev.summary}>
                        {emoji}
                      </span>
                    );
                  })}
                  {extra > 0 && (
                    <span className="event-count-badge">+{extra}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Rodapé com versão do build */}
      <div style={{
        textAlign: 'center',
        padding: '8px 0 4px',
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: '0.04em',
        userSelect: 'none',
      }}>
        build {BUILD_SHA} · {BUILD_DATE}
      </div>
    </div>
  );
};

// ── Build info ────────────────────────────────────────────
const BUILD_SHA  = process.env.REACT_APP_BUILD_SHA  ? process.env.REACT_APP_BUILD_SHA.slice(0, 7)  : 'dev';
const BUILD_DATE = process.env.REACT_APP_BUILD_DATE
  ? new Date(process.env.REACT_APP_BUILD_DATE).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
  : 'local';

export { BUILD_SHA, BUILD_DATE };
export default CalendarView;
