// ============================================================
// CONFIRM MODAL — confirmação de exclusão estilizada
// ============================================================

import React, { useEffect } from "react";

export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  // Fecha com Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.handle} />

        <div style={styles.iconWrap}>
          <span style={styles.icon}>🗑️</span>
        </div>

        <h3 style={styles.title}>{title}</h3>
        {message && <p style={styles.message}>{message}</p>}

        <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={onConfirm}>
          Apagar
        </button>
        <button style={{ ...styles.btn, ...styles.btnCancel }} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(58,26,62,0.45)",
    backdropFilter: "blur(4px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    animation: "fadeIn 0.15s ease",
  },
  sheet: {
    background: "#fff",
    borderRadius: "2rem 2rem 0 0",
    padding: "0 1.5rem 2.5rem",
    width: "100%",
    maxWidth: 480,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    boxShadow: "0 -8px 40px rgba(199,125,255,0.2)",
    animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    background: "#e0d0f0", margin: "0.75rem 0 1rem",
    flexShrink: 0,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: "50%",
    background: "linear-gradient(135deg, #fff0f0, #ffe0e0)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: "0.25rem",
    boxShadow: "0 4px 16px rgba(255,107,107,0.2)",
  },
  icon: { fontSize: "1.8rem" },
  title: {
    fontSize: "1.1rem", fontWeight: 800,
    color: "#3A1A3E", textAlign: "center",
    margin: "0.25rem 0 0",
    fontFamily: "'Baloo 2', cursive",
  },
  message: {
    fontSize: "0.9rem", color: "#8A5A9A",
    textAlign: "center", lineHeight: 1.5,
    margin: "0 0 0.5rem",
  },
  btn: {
    width: "100%", border: "none",
    borderRadius: "1rem", padding: "0.9rem",
    fontSize: "1rem", fontWeight: 700,
    cursor: "pointer", marginTop: "0.4rem",
    fontFamily: "'Nunito', sans-serif",
    transition: "transform 0.1s, box-shadow 0.1s",
  },
  btnDanger: {
    background: "linear-gradient(135deg, #ff6b6b, #e03131)",
    color: "#fff",
    boxShadow: "0 4px 16px rgba(255,107,107,0.35)",
  },
  btnCancel: {
    background: "#f8f0ff",
    color: "#7B2FBE",
  },
};
