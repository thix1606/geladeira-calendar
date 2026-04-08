import React, { useState, useRef } from "react";

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

const MONTH_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

const AddEventModal = ({ date, onSave, onClose }) => {
  const [title, setTitle] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🎉");
  const [selectedColor, setSelectedColor] = useState("pink");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const dateLabel = date
    ? `${date.getDate()} de ${MONTH_PT[date.getMonth()].charAt(0).toUpperCase() + MONTH_PT[date.getMonth()].slice(1)}`
    : "";

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      emoji: selectedEmoji,
      date,
      startTime: startTime || null,
      endTime: endTime || null,
      color: selectedColor,
      notes: notes.trim() || null,
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

        {/* Botões */}
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

export default AddEventModal;
