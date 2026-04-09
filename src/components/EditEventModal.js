import React, { useState, useMemo } from "react";

const MONTH_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAYS_SHORT = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

const EMOJIS = [
  "🎂","🎉","🏫","🏊","🎨","⚽","🎵","🐶","🌸","🍕",
  "🚀","🦋","🌈","🎀","🧸","🦄","🎠","🍦","🎭","🏄",
  "🌟","🎪","🧁","🎮","📚",
];

const COLORS = [
  { key: "pink",   hex: "#FF6B9D", label: "Rosa" },
  { key: "purple", hex: "#C77DFF", label: "Roxo" },
  { key: "blue",   hex: "#74C0FC", label: "Azul" },
  { key: "green",  hex: "#69DB7C", label: "Verde" },
  { key: "yellow", hex: "#FFD43B", label: "Amarelo" },
  { key: "orange", hex: "#FFA94D", label: "Laranja" },
  { key: "red",    hex: "#FF6B6B", label: "Vermelho" },
];

const COLOR_ID_MAP = { pink:"4", purple:"3", blue:"1", green:"2", yellow:"5", orange:"6", red:"11" };
const ID_COLOR_MAP = Object.fromEntries(Object.entries(COLOR_ID_MAP).map(([k,v]) => [v,k]));

function extractEmoji(summary) {
  const match = (summary || "").match(/^(\p{Emoji})\s*/u);
  return match ? match[1] : "🎉";
}
function extractTitle(summary) {
  return (summary || "").replace(/^(\p{Emoji})\s*/u, "");
}
function extractTime(dateTime) {
  if (!dateTime) return "";
  const d = new Date(dateTime);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function toDateStr(y, m, d) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// ── Mini calendário ─────────────────────────────────────────
function MiniCalendar({ mode, selectedDays, onToggleDay, calDate, onCalDateChange }) {
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();

  const cells = useMemo(() => {
    const rawFirst = new Date(year, month, 1).getDay();
    const firstDay = (rawFirst + 6) % 7; // Seg=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let i = 0; i < firstDay; i++) result.push({ type: "empty", key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) result.push({ type: "day", day: d, key: `d${d}` });
    return result;
  }, [year, month]);

  const todayStr = toDateStr(
    new Date().getFullYear(), new Date().getMonth(), new Date().getDate()
  );

  return (
    <div style={mcStyles.wrap}>
      {/* Navegação do mês */}
      <div style={mcStyles.header}>
        <button style={mcStyles.navBtn} onClick={() => onCalDateChange(-1)}>‹</button>
        <span style={mcStyles.monthLabel}>{MONTH_PT[month]} {year}</span>
        <button style={mcStyles.navBtn} onClick={() => onCalDateChange(1)}>›</button>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div style={mcStyles.grid}>
        {WEEKDAYS_SHORT.map((wd) => (
          <span key={wd} style={mcStyles.wdLabel}>{wd}</span>
        ))}
      </div>

      {/* Células dos dias */}
      <div style={mcStyles.grid}>
        {cells.map((cell) => {
          if (cell.type === "empty") return <span key={cell.key} />;
          const ds = toDateStr(year, month, cell.day);
          const selected = selectedDays.has(ds);
          const isToday  = ds === todayStr;
          return (
            <button
              key={cell.key}
              onClick={() => onToggleDay(ds)}
              style={{
                ...mcStyles.dayBtn,
                background: selected
                  ? "linear-gradient(135deg,#C77DFF,#7B2FBE)"
                  : isToday ? "#FFF0F6" : "transparent",
                color: selected ? "#fff" : isToday ? "#FF6B9D" : "#3A1A3E",
                fontWeight: selected || isToday ? 800 : 500,
                border: isToday && !selected ? "2px solid #FF6B9D" : "2px solid transparent",
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {mode === "copy" && selectedDays.size > 0 && (
        <p style={mcStyles.hint}>
          {selectedDays.size} dia{selectedDays.size > 1 ? "s" : ""} selecionado{selectedDays.size > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

const mcStyles = {
  wrap: {
    background: "#f8f0ff", borderRadius: "0.75rem",
    padding: "0.6rem 0.5rem 0.75rem",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: "0.4rem",
  },
  navBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "1.4rem", color: "#7B2FBE", lineHeight: 1,
    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: "50%",
  },
  monthLabel: {
    fontSize: "0.9rem", fontWeight: 800, color: "#7B2FBE",
  },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
    gap: "2px", textAlign: "center",
  },
  wdLabel: {
    fontSize: "0.6rem", fontWeight: 700, color: "#aaa",
    padding: "2px 0", textAlign: "center",
  },
  dayBtn: {
    border: "none", borderRadius: "50%", cursor: "pointer",
    fontSize: "0.8rem", aspectRatio: "1",
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", padding: 0,
    fontFamily: "var(--font-body)",
    transition: "background 0.12s",
    minHeight: 36,
  },
  hint: {
    fontSize: "0.72rem", color: "#7B2FBE", fontWeight: 700,
    margin: "0.4rem 0 0", textAlign: "center",
  },
};

// ── Modal principal ─────────────────────────────────────────
const EditEventModal = ({ event, onSave, onClose, onMoveOrCopy }) => {
  const [title,         setTitle]         = useState(extractTitle(event.summary));
  const [selectedEmoji, setSelectedEmoji] = useState(extractEmoji(event.summary));
  const [selectedColor, setSelectedColor] = useState(ID_COLOR_MAP[event.colorId] ?? "pink");
  const [startTime,     setStartTime]     = useState(event.start?.dateTime ? extractTime(event.start.dateTime) : "");
  const [endTime,       setEndTime]       = useState(event.end?.dateTime   ? extractTime(event.end.dateTime)   : "");
  const [notes,         setNotes]         = useState(event.description ?? "");
  const [saving,        setSaving]        = useState(false);

  // Painel de mover/copiar
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [moveMode,       setMoveMode]       = useState("move"); // "move" | "copy"
  const [selectedDays,   setSelectedDays]   = useState(new Set());
  const [calDate,        setCalDate]        = useState(() => {
    // Inicia no mês do evento
    if (event.start?.date) return new Date(event.start.date + "T00:00:00");
    if (event.start?.dateTime) return new Date(event.start.dateTime);
    return new Date();
  });
  const [moveSaving, setMoveSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(event.id, {
      title: title.trim(),
      emoji: selectedEmoji,
      startTime: startTime || null,
      endTime:   endTime   || null,
      color:     selectedColor,
      notes:     notes.trim() || null,
    });
    setSaving(false);
  };

  const handleSetMoveMode = (m) => {
    setMoveMode(m);
    setSelectedDays(new Set()); // limpa seleção ao trocar modo
  };

  const handleToggleDay = (dateStr) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (moveMode === "move") {
        // seleção única
        if (next.has(dateStr)) next.clear();
        else { next.clear(); next.add(dateStr); }
      } else {
        // multi-seleção
        if (next.has(dateStr)) next.delete(dateStr);
        else next.add(dateStr);
      }
      return next;
    });
  };

  const handleCalDateChange = (dir) => {
    setCalDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const handleMoveOrCopy = async () => {
    if (selectedDays.size === 0) return;
    setMoveSaving(true);
    const dates = [...selectedDays].map((ds) => {
      const [y, m, d] = ds.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
    for (const date of dates) {
      await onMoveOrCopy?.(event.id, date, moveMode);
    }
    setMoveSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" role="dialog" aria-modal="true">
        <div className="modal-handle" />

        <div className="modal-title">
          Editar Compromisso ✏️
        </div>

        {/* Nome */}
        <div className="modal-section">
          <div className="modal-label">O que vai acontecer?</div>
          <input
            className="modal-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            autoFocus
          />
        </div>

        {/* Emoji */}
        <div className="modal-section">
          <div className="modal-label">Escolha um emoji!</div>
          <div className="emoji-grid">
            {EMOJIS.map((em) => (
              <button
                key={em}
                className={`emoji-btn ${selectedEmoji === em ? "selected" : ""}`}
                onClick={() => setSelectedEmoji(em)}
                aria-label={em}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Cor */}
        <div className="modal-section">
          <div className="modal-label">Cor do compromisso</div>
          <div className="color-row">
            {COLORS.map((c) => (
              <button
                key={c.key}
                className={`color-btn ${selectedColor === c.key ? "selected" : ""}`}
                style={{ background: c.hex }}
                onClick={() => setSelectedColor(c.key)}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        {/* Horário */}
        <div className="modal-section">
          <div className="modal-label">Horário (opcional)</div>
          <div className="time-row">
            <span className="time-label">Das</span>
            <input
              className="time-input"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <span className="time-label">às</span>
            <input
              className="time-input"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Observações */}
        <div className="modal-section">
          <div className="modal-label">Observação (opcional)</div>
          <textarea
            className="modal-textarea modal-input"
            placeholder="Anote algo especial aqui... 💫"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
          />
        </div>

        {/* Mover / copiar */}
        {!showDatePicker ? (
          <button
            className="cancel-btn"
            onClick={() => setShowDatePicker(true)}
            style={{ color: "var(--purple-d)", marginTop: 0 }}
          >
            📆 Copiar ou mudar para outro dia
          </button>
        ) : (
          <div style={styles.datePicker}>
            <p style={styles.datePickerTitle}>📆 Copiar ou mudar para outro dia</p>

            {/* Mover ou copiar */}
            <div style={styles.modeRow}>
              {["move", "copy"].map((m) => (
                <button
                  key={m}
                  onClick={() => handleSetMoveMode(m)}
                  style={{
                    ...styles.modeBtn,
                    background: moveMode === m ? "var(--purple-d)" : "#f0e8ff",
                    color:      moveMode === m ? "#fff" : "var(--purple-d)",
                  }}
                >
                  {m === "move" ? "📦 Mover" : "📋 Copiar"}
                </button>
              ))}
            </div>

            <p style={styles.modeHint}>
              {moveMode === "move"
                ? "Selecione o dia para onde mover o evento."
                : "Selecione um ou mais dias para copiar o evento."}
            </p>

            <MiniCalendar
              mode={moveMode}
              selectedDays={selectedDays}
              onToggleDay={handleToggleDay}
              calDate={calDate}
              onCalDateChange={handleCalDateChange}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                className="save-btn"
                style={{ flex: 1, margin: 0 }}
                onClick={handleMoveOrCopy}
                disabled={selectedDays.size === 0 || moveSaving}
              >
                {moveSaving
                  ? "Aguarde... ⏳"
                  : moveMode === "move"
                    ? "Mover"
                    : `Copiar para ${selectedDays.size} dia${selectedDays.size !== 1 ? "s" : ""}`}
              </button>
              <button
                className="cancel-btn"
                style={{ flex: 1, margin: 0 }}
                onClick={() => { setShowDatePicker(false); setSelectedDays(new Set()); }}
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        <button
          className="save-btn"
          onClick={handleSave}
          disabled={!title.trim() || saving}
        >
          {saving ? "Salvando... ⏳" : `Salvar ${selectedEmoji}`}
        </button>

        <button className="cancel-btn" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

const styles = {
  datePicker: {
    background: "#f8f0ff", borderRadius: "1rem",
    padding: "1rem", display: "flex",
    flexDirection: "column", gap: "0.6rem",
    marginBottom: "0.5rem",
  },
  datePickerTitle: {
    fontSize: "0.9rem", fontWeight: 800,
    color: "var(--purple-d)", margin: 0,
  },
  modeRow: { display: "flex", gap: 8 },
  modeBtn: {
    flex: 1, border: "none", borderRadius: "0.75rem",
    padding: "0.65rem", fontSize: "0.95rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "var(--font-body)",
    transition: "background 0.15s",
  },
  modeHint: {
    fontSize: "0.78rem", color: "#888", margin: 0,
  },
};

export default EditEventModal;
