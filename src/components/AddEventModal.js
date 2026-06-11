import React, { useState } from "react";

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

const WEEKDAY_LABELS = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const DAY_CODE       = ["MO","TU","WE","TH","FR","SA","SU"];

const MONTH_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function buildRRule({ freq, weekdays, monthDay, bizPos, until }) {
  let rule = "RRULE:FREQ=";
  if (freq === "weekly") {
    const byday = [...weekdays].sort().map(i => DAY_CODE[i]).join(",");
    rule += `WEEKLY;BYDAY=${byday}`;
  } else if (freq === "monthly-day") {
    rule += `MONTHLY;BYMONTHDAY=${monthDay}`;
  } else {
    rule += `MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=${bizPos}`;
  }
  if (until) rule += `;UNTIL=${until.replace(/-/g,"")}T235959Z`;
  return rule;
}

const AddEventModal = ({ date, onSave, onClose }) => {
  const [title,          setTitle]          = useState("");
  const [selectedEmoji,  setSelectedEmoji]  = useState("🎉");
  const [selectedColor,  setSelectedColor]  = useState("pink");
  const [startTime,      setStartTime]      = useState("");
  const [endTime,        setEndTime]        = useState("");
  const [notes,          setNotes]          = useState("");
  const [saving,         setSaving]         = useState(false);

  // Recorrência
  const [isRecurring,    setIsRecurring]    = useState(false);
  const [recurrFreq,     setRecurrFreq]     = useState("weekly");
  const [recurrWeekdays, setRecurrWeekdays] = useState(new Set());
  const [recurrMonthDay, setRecurrMonthDay] = useState(() => date?.getDate() ?? 1);
  const [recurrBizPos,   setRecurrBizPos]   = useState(1);
  const [recurrUntil,    setRecurrUntil]    = useState("");

  const dateLabel = date
    ? `${date.getDate()} de ${MONTH_PT[date.getMonth()].charAt(0).toUpperCase() + MONTH_PT[date.getMonth()].slice(1)}`
    : "";

  const toggleWeekday = (i) => {
    setRecurrWeekdays(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const canSave = title.trim() &&
    !(isRecurring && recurrFreq === "weekly" && recurrWeekdays.size === 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const recurrence = isRecurring
      ? buildRRule({ freq: recurrFreq, weekdays: recurrWeekdays, monthDay: recurrMonthDay, bizPos: recurrBizPos, until: recurrUntil })
      : null;
    await onSave({
      title: title.trim(),
      emoji: selectedEmoji,
      date,
      startTime: startTime || null,
      endTime:   endTime   || null,
      color:     selectedColor,
      notes:     notes.trim() || null,
      recurrence,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" role="dialog" aria-modal="true">
        <div className="modal-handle" />

        <div className="modal-title">
          Novo Compromisso 🌟
          <div style={{ fontSize: "1rem", color: "#8A5A9A", fontWeight: 700, marginTop: 4 }}>
            {dateLabel}
          </div>
        </div>

        {/* Nome */}
        <div className="modal-section">
          <div className="modal-label">O que vai acontecer?</div>
          <input
            className="modal-input"
            type="text"
            placeholder="Ex: Aniversário da Lua 🎂"
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

        {/* Recorrência */}
        <div className="modal-section">
          <div className="modal-label">Recorrência (opcional)</div>

          {/* Toggle único / recorrente */}
          <div style={styles.modeRow}>
            <button
              style={{ ...styles.modeBtn, ...(isRecurring ? {} : styles.modeBtnActive) }}
              onClick={() => setIsRecurring(false)}
            >
              📅 Evento único
            </button>
            <button
              style={{ ...styles.modeBtn, ...(isRecurring ? styles.modeBtnActive : {}) }}
              onClick={() => setIsRecurring(true)}
            >
              🔁 Recorrente
            </button>
          </div>

          {isRecurring && (
            <div style={styles.recurrBox}>
              {/* Tipo de frequência */}
              <div style={{ ...styles.modeRow, flexWrap: "wrap" }}>
                {[
                  { key: "weekly",           label: "Semanal" },
                  { key: "monthly-day",      label: `Todo dia ${date?.getDate() ?? ""}` },
                  { key: "monthly-first-biz",label: "1º dia útil" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    style={{
                      ...styles.freqBtn,
                      ...(recurrFreq === key ? styles.freqBtnActive : {}),
                    }}
                    onClick={() => setRecurrFreq(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Dias da semana */}
              {recurrFreq === "weekly" && (
                <>
                  <div className="wd-picker">
                    {WEEKDAY_LABELS.map((wd, i) => (
                      <button
                        key={i}
                        className={`wd-btn${recurrWeekdays.has(i) ? " selected" : ""}`}
                        onClick={() => toggleWeekday(i)}
                        aria-pressed={recurrWeekdays.has(i)}
                      >
                        {wd}
                      </button>
                    ))}
                  </div>
                  {recurrWeekdays.size === 0 && (
                    <p style={styles.hint}>Selecione pelo menos um dia da semana.</p>
                  )}
                </>
              )}

              {recurrFreq === "monthly-day" && (
                <div style={{ ...styles.untilRow, alignItems: "center" }}>
                  <span style={styles.infoText}>Todo dia</span>
                  <input
                    type="number"
                    min="1" max="31"
                    value={recurrMonthDay}
                    onChange={(e) => setRecurrMonthDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                    style={{ ...styles.untilInput, width: 60, textAlign: "center" }}
                  />
                  <span style={styles.infoText}>de cada mês</span>
                </div>
              )}

              {recurrFreq === "monthly-first-biz" && (
                <div style={{ ...styles.untilRow, alignItems: "center" }}>
                  <span style={styles.infoText}>O</span>
                  <select
                    value={recurrBizPos}
                    onChange={(e) => setRecurrBizPos(Number(e.target.value))}
                    style={{ ...styles.untilInput, width: 90 }}
                  >
                    {[1,2,3,4,5].map(n => (
                      <option key={n} value={n}>{n}º</option>
                    ))}
                  </select>
                  <span style={styles.infoText}>dia útil do mês</span>
                </div>
              )}

              {/* Repetir até */}
              <div style={styles.untilRow}>
                <span style={styles.untilLabel}>Repetir até (opcional):</span>
                <input
                  type="date"
                  value={recurrUntil}
                  onChange={(e) => setRecurrUntil(e.target.value)}
                  style={styles.untilInput}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={!canSave || saving}
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
  modeRow: { display: "flex", gap: 8, marginBottom: 8 },
  modeBtn: {
    flex: 1, border: "none", borderRadius: "0.75rem",
    padding: "0.6rem 0.5rem", fontSize: "0.88rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "var(--font-body)",
    background: "#f0e8ff", color: "var(--purple-d)",
    transition: "background 0.15s",
  },
  modeBtnActive: { background: "var(--purple-d)", color: "#fff" },
  recurrBox: {
    background: "#f8f0ff", borderRadius: "0.75rem",
    padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem",
  },
  freqBtn: {
    flex: "1 1 auto", border: "none", borderRadius: "0.75rem",
    padding: "0.5rem 0.4rem", fontSize: "0.82rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "var(--font-body)",
    background: "#ede4ff", color: "var(--purple-d)",
    transition: "background 0.15s",
  },
  freqBtnActive: { background: "var(--purple-d)", color: "#fff" },
  hint: { fontSize: "0.75rem", color: "#e03131", margin: 0 },
  infoText: { fontSize: "0.82rem", color: "#7B2FBE", margin: 0, fontStyle: "italic" },
  untilRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  untilLabel: { fontSize: "0.78rem", color: "#888", fontWeight: 700, flexShrink: 0 },
  untilInput: {
    flex: 1, minWidth: 0, border: "2px solid #e0c8ff", borderRadius: "0.5rem",
    padding: "0.4rem 0.6rem", fontSize: "0.85rem",
    fontFamily: "var(--font-body)", outline: "none", color: "var(--text)",
  },
};

export default AddEventModal;
