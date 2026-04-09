// ============================================================
// DAY VIEW — tela de detalhe do dia
// ============================================================

import React, { useMemo, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import EditEventModal from "./EditEventModal";
import BuildVersion from "./BuildVersion";

const WEEKDAY_PT = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const MONTH_PT   = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

const COLOR_BY_ID = {
  "1": "#74C0FC", "2": "#69DB7C", "3": "#C77DFF", "4": "#FF6B9D",
  "5": "#FFD43B", "6": "#FFA94D", "11": "#FF6B6B",
};

function getEventColor(event) { return COLOR_BY_ID[event.colorId] || "#FF6B9D"; }
function getEventEmoji(event) {
  const title = event.summary || "";
  const match = title.match(/^(\p{Emoji})/u);
  return match ? match[1] : "📅";
}
function getEventTitle(event) {
  return (event.summary || "Compromisso").replace(/^(\p{Emoji})\s*/u, "");
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

// Título gerado automaticamente para eventos de cor
function colorEventTitle(colorName) { return `📌 Dia com ${colorName}`; }
function isColorEvent(event) { return (event.summary || "").startsWith("📌 Dia com "); }

const DayView = ({
  date, events, onBack, onAddEvent, onDeleteEvent, onUpdateEvent, onMoveOrCopyEvent,
  dayColor,
  colorsConfig,
  onSetDayColor,
  onCreateColorEvent,
  onDeleteColorEvent,
  colorEventId,
}) => {
  const dayEvents = useMemo(() => {
    if (!date) return [];
    const all = events.filter((ev) => {
      const d = getEventDate(ev);
      if (!d) return false;
      return d.getDate() === date.getDate() &&
             d.getMonth() === date.getMonth() &&
             d.getFullYear() === date.getFullYear();
    });
    // Evento de cor sempre primeiro
    const colorEv = all.find(isColorEvent);
    const rest    = all.filter((ev) => !isColorEvent(ev));
    return colorEv ? [colorEv, ...rest] : rest;
  }, [events, date]);

  const [confirm,   setConfirm]   = useState(null);
  const [editingEv,  setEditingEv] = useState(null);

  if (!date) return null;

  const weekday   = WEEKDAY_PT[date.getDay()];
  const dateLabel = `${date.getDate()} de ${MONTH_PT[date.getMonth()].charAt(0).toUpperCase() + MONTH_PT[date.getMonth()].slice(1)} de ${date.getFullYear()}`;
  const headerBg  = dayColor?.hex ?? null;

  async function handleSelectColor(colorId) {
    // Remove evento anterior se existia cor
    if (colorEventId) {
      await onDeleteColorEvent(colorEventId);
    }
    if (!colorId) {
      onSetDayColor(null);
      return;
    }
    const color = colorsConfig.find((c) => c.id === colorId);
    if (!color) return;
    onSetDayColor(colorId);
    await onCreateColorEvent(date, color.name);
  }

  const handleDelete = (ev) => {
    setConfirm({
      title:   "Apagar compromisso?",
      message: ev.summary?.replace(/^\p{Emoji}\s*/u, "") || "",
      onConfirm: () => {
        setConfirm(null);
        onDeleteEvent(ev.id);
      },
    });
  };

  return (
    <div className="day-view">
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {editingEv && (
        <EditEventModal
          event={editingEv}
          onSave={async (id, data) => {
            await onUpdateEvent?.(id, data);
            setEditingEv(null);
          }}
          onMoveOrCopy={onMoveOrCopyEvent}
          onClose={() => setEditingEv(null)}
        />
      )}
      {/* Header */}
      <div
        className="day-header"
        style={headerBg ? { background: `linear-gradient(135deg, ${headerBg}cc, ${headerBg}88)` } : {}}
      >
        <button className="back-btn touch-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <div className="day-header-info">
          <div className="day-header-weekday">{weekday}</div>
          <div className="day-header-date">{dateLabel}</div>
        </div>
        <button className="day-add-btn touch-btn" onClick={onAddEvent}>
          <span>＋</span> Novo
        </button>
      </div>

      {/* Seletor de cor do dia */}
      {colorsConfig.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px 4px", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-soft)", fontWeight: 700, marginRight: 2 }}>
            Cor do dia:
          </span>

          {/* Opção "nenhuma" */}
          <button
            onClick={() => handleSelectColor(null)}
            title="Remover cor"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#e0e0e0",
              border: !dayColor ? "3px solid #3A1A3E" : "2px solid transparent",
              cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.8rem", color: "#888", fontWeight: 700,
            }}
          >✕</button>

          {colorsConfig.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectColor(c.id)}
              title={c.name}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: c.hex,
                border: dayColor?.id === c.id ? "3px solid #3A1A3E" : "2px solid transparent",
                cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.85rem", fontWeight: 800,
                color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.35)",
              }}
            >
              {c.name.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {colorsConfig.length === 0 && (
        <p style={{ fontSize: "0.75rem", color: "#bbb", padding: "8px 16px" }}>
          Configure cores em ⚙️ Configurações para marcar dias especiais.
        </p>
      )}

      {/* Lista de eventos */}
      {dayEvents.length === 0 ? (
        <div className="day-empty">
          <div className="day-empty-emoji">🌟</div>
          <div className="day-empty-text">
            Nenhum compromisso ainda!<br />Toque em "Novo" para adicionar ✨
          </div>
        </div>
      ) : (
        <div className="day-events-list">
          {dayEvents.map((ev, idx) => (
            <div
              key={ev.id}
              className="event-card"
              style={{
                "--event-color": isColorEvent(ev) ? (dayColor?.hex ?? "#FF6B9D") : getEventColor(ev),
                animationDelay: `${idx * 0.06}s`,
                cursor: isColorEvent(ev) ? "default" : "pointer",
              }}
              onClick={() => { if (!isColorEvent(ev)) setEditingEv(ev); }}
            >
              <div className="event-emoji-big">{getEventEmoji(ev)}</div>
              <div className="event-info">
                <div className="event-title">{getEventTitle(ev)}</div>
                <div className="event-time">
                  <span>🕐</span>{getEventTime(ev)}
                </div>
                {ev.description && <div className="event-notes">{ev.description}</div>}
              </div>
              {!isColorEvent(ev) && (
                <button
                  className="event-delete-btn touch-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(ev); }}
                  aria-label="Apagar evento"
                >🗑️</button>
              )}
            </div>
          ))}
        </div>
      )}
      <BuildVersion />
    </div>
  );
};

export default DayView;
