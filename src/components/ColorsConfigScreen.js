// ============================================================
// TELA DE CONFIGURAÇÃO DE CORES
// ============================================================

import React, { useState } from "react";
import { COLOR_PALETTE } from "../hooks/useDayColors";

export default function ColorsConfigScreen({ colorsConfig, onSave, onRemove, onBack }) {
  const [editing, setEditing]       = useState(null); // { id, hex, name } ou null
  const [nameInput, setNameInput]   = useState("");

  function handleSelectPalette(paletteColor) {
    const existing = colorsConfig.find((c) => c.id === paletteColor.id);
    setEditing({ id: paletteColor.id, hex: paletteColor.hex, name: existing?.name ?? "" });
    setNameInput(existing?.name ?? "");
  }

  function handleSave() {
    if (!nameInput.trim() || !editing) return;
    onSave({ ...editing, name: nameInput.trim() });
    setEditing(null);
    setNameInput("");
  }

  function handleRemove(colorId) {
    onRemove(colorId);
    if (editing?.id === colorId) { setEditing(null); setNameInput(""); }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>‹</button>
          <h2 style={styles.title}>Cores do Calendário</h2>
        </div>

        <p style={styles.hint}>
          Configure cores personalizadas para marcar dias especiais.
          Cada cor deve ter um nome (ex: Papai, Mamãe, Vovó).
        </p>

        {/* Paleta */}
        <div style={styles.palette}>
          {COLOR_PALETTE.map((pc) => {
            const configured = colorsConfig.find((c) => c.id === pc.id);
            const isEditing  = editing?.id === pc.id;
            return (
              <button
                key={pc.id}
                onClick={() => handleSelectPalette(pc)}
                title={configured?.name ?? "Clique para configurar"}
                style={{
                  ...styles.sphere,
                  background: pc.hex,
                  border: isEditing ? "3px solid #3A1A3E" : configured ? "3px solid rgba(0,0,0,0.2)" : "2px dashed rgba(0,0,0,0.2)",
                  opacity: !configured && !isEditing ? 0.55 : 1,
                }}
              >
                <span style={styles.sphereLabel}>
                  {configured ? configured.name.charAt(0).toUpperCase() : "+"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        {editing && (
          <div style={styles.editor}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ ...styles.spherePreview, background: editing.hex }} />
              <p style={styles.editorTitle}>Nome para esta cor</p>
            </div>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(null); }}
              placeholder="Ex: Papai, Mamãe, Vovó..."
              style={styles.input}
              maxLength={20}
            />
            <div style={styles.editorActions}>
              <button
                onClick={handleSave}
                disabled={!nameInput.trim()}
                style={{ ...styles.btn, ...styles.btnPrimary, opacity: nameInput.trim() ? 1 : 0.4 }}
              >
                Salvar
              </button>
              {colorsConfig.find((c) => c.id === editing.id) && (
                <button
                  onClick={() => handleRemove(editing.id)}
                  style={{ ...styles.btn, ...styles.btnDanger }}
                >
                  Remover
                </button>
              )}
              <button onClick={() => setEditing(null)} style={{ ...styles.btn, ...styles.btnSecondary }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista configuradas */}
        {colorsConfig.length > 0 && (
          <div style={styles.configuredList}>
            <p style={styles.listTitle}>Configuradas</p>
            {colorsConfig.map((c) => (
              <div key={c.id} style={styles.configuredRow}>
                <div style={{ ...styles.sphereSmall, background: c.hex }} />
                <span style={styles.configuredName}>{c.name}</span>
                <button style={styles.editBtn} onClick={() => handleSelectPalette(COLOR_PALETTE.find((p) => p.id === c.id))}>
                  ✏️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "linear-gradient(135deg, #fff0f6 0%, #f8f0ff 100%)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    padding: "0", overflowY: "auto",
    fontFamily: "'Nunito', sans-serif",
    zIndex: 100,
  },
  card: {
    background: "#fff", borderRadius: "0 0 1.5rem 1.5rem",
    padding: "1.5rem", width: "100%", maxWidth: 500,
    boxShadow: "0 8px 32px rgba(199,125,255,0.15)",
    minHeight: "100vh",
  },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" },
  backBtn: {
    fontSize: "2rem", lineHeight: 1, background: "none", border: "none",
    color: "#7B2FBE", cursor: "pointer", padding: "0 8px",
  },
  title: { fontSize: "1.2rem", fontWeight: 800, color: "#7B2FBE", margin: 0 },
  hint: { fontSize: "0.85rem", color: "#888", marginBottom: "1.25rem", lineHeight: 1.5 },
  palette: { display: "flex", flexWrap: "wrap", gap: 12, marginBottom: "1.5rem" },
  sphere: {
    width: 52, height: 52, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "transform 0.15s",
  },
  sphereLabel: { fontSize: "1.1rem", fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.3)" },
  spherePreview: { width: 32, height: 32, borderRadius: "50%", flexShrink: 0 },
  editor: {
    background: "#f8f0ff", borderRadius: "1rem", padding: "1rem",
    marginBottom: "1.25rem",
  },
  editorTitle: { fontSize: "0.9rem", fontWeight: 700, color: "#7B2FBE", margin: 0 },
  input: {
    width: "100%", boxSizing: "border-box",
    border: "2px solid #e0c8ff", borderRadius: "0.75rem",
    padding: "0.6rem 0.9rem", fontSize: "1rem", marginBottom: "0.75rem",
    fontFamily: "'Nunito', sans-serif", outline: "none",
  },
  editorActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  btn: {
    border: "none", borderRadius: "0.75rem",
    padding: "0.6rem 1.2rem", fontSize: "0.9rem", fontWeight: 700,
    cursor: "pointer",
  },
  btnPrimary:   { background: "linear-gradient(135deg, #C77DFF, #7B2FBE)", color: "#fff" },
  btnDanger:    { background: "#fff0f0", color: "#e03131", border: "1px solid #ffcdd2" },
  btnSecondary: { background: "#f0f0f0", color: "#666" },
  configuredList: { borderTop: "1px solid #f0e8ff", paddingTop: "1rem" },
  listTitle: { fontSize: "0.75rem", fontWeight: 700, color: "#7B2FBE", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" },
  configuredRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  sphereSmall: { width: 28, height: 28, borderRadius: "50%", flexShrink: 0 },
  configuredName: { flex: 1, fontSize: "0.95rem", color: "#3A1A3E", fontWeight: 600 },
  editBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "1rem" },
};
