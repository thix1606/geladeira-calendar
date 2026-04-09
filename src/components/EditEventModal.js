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

const EditEventModal = ({ event, onSave, onClose }) => {
  const [title,         setTitle]         = useState(extractTitle(event.summary));
  const [selectedEmoji, setSelectedEmoji] = useState(extractEmoji(event.summary));
  const [selectedColor, setSelectedColor] = useState(ID_COLOR_MAP[event.colorId] ?? "pink");
  const [startTime,     setStartTime]     = useState(event.start?.dateTime ? extractTime(event.start.dateTime) : "");
  const [endTime,       setEndTime]       = useState(event.end?.dateTime   ? extractTime(event.end.dateTime)   : "");
  const [notes,         setNotes]         = useState(event.description ?? "");
  const [saving,        setSaving]        = useState(false);

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

export default EditEventModal;
