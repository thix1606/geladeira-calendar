// ============================================================
// ERROR SCREEN — Diagnóstico de credenciais Google
// ============================================================
// Mostra parcialmente as credenciais do build (para verificação)
// e permite que o usuário insira manualmente se necessário.
// ============================================================

import React, { useState } from "react";

function maskValue(val) {
  if (!val) return "(não definido)";
  if (val.length <= 8) return "••••••••";
  return val.slice(0, 6) + "••••••••" + val.slice(-4);
}

export default function ErrorScreen({ error, buildApiKey, buildClientId, onRetry }) {
  const [showOverride, setShowOverride] = useState(false);
  const [apiKey, setApiKey]     = useState("");
  const [clientId, setClientId] = useState("");
  const [saved, setSaved]       = useState(false);

  function handleSave() {
    if (!apiKey.trim() || !clientId.trim()) return;
    localStorage.setItem("gc_override_api_key", apiKey.trim());
    localStorage.setItem("gc_override_client_id", clientId.trim());
    setSaved(true);
    setTimeout(() => onRetry(), 800);
  }

  function handleClear() {
    localStorage.removeItem("gc_override_api_key");
    localStorage.removeItem("gc_override_client_id");
    setApiKey("");
    setClientId("");
    setSaved(false);
    onRetry();
  }

  const hasOverride =
    localStorage.getItem("gc_override_api_key") ||
    localStorage.getItem("gc_override_client_id");

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.icon}>⚙️</div>
        <h2 style={styles.title}>Ops!</h2>
        <p style={styles.errorMsg}>{error}</p>

        {/* Credenciais do build */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>Credenciais do build (CI)</p>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>API Key</span>
            <code style={styles.credValue}>{maskValue(buildApiKey)}</code>
          </div>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>Client ID</span>
            <code style={styles.credValue}>{maskValue(buildClientId)}</code>
          </div>
          {(!buildApiKey || !buildClientId) && (
            <p style={styles.warning}>
              ⚠️ Uma ou mais credenciais não foram injetadas no build. Verifique os secrets do GitHub Actions.
            </p>
          )}
        </div>

        {/* Override manual */}
        {!showOverride ? (
          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={() => setShowOverride(true)}>
              Inserir credenciais manualmente
            </button>
            {hasOverride && (
              <button style={{ ...styles.btnSecondary, color: "#ff6b6b" }} onClick={handleClear}>
                Limpar override salvo
              </button>
            )}
          </div>
        ) : (
          <div style={styles.form}>
            <p style={styles.sectionTitle}>Credenciais manuais</p>
            <p style={styles.hint}>
              Disponíveis em{" "}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={styles.link}>
                Google Cloud Console → Credenciais
              </a>
            </p>

            <label style={styles.label}>API Key</label>
            <input
              style={styles.input}
              type="text"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />

            <label style={styles.label}>Client ID</label>
            <input
              style={styles.input}
              type="text"
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />

            <div style={styles.actions}>
              <button
                style={styles.btnPrimary}
                onClick={handleSave}
                disabled={!apiKey.trim() || !clientId.trim()}
              >
                {saved ? "✓ Salvo! Recarregando..." : "Salvar e tentar novamente"}
              </button>
              <button style={styles.btnSecondary} onClick={() => setShowOverride(false)}>
                Cancelar
              </button>
            </div>
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
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1rem",
    fontFamily: "'Nunito', sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: "1.5rem",
    padding: "2rem",
    maxWidth: "480px",
    width: "100%",
    boxShadow: "0 8px 32px rgba(199,125,255,0.15)",
    textAlign: "center",
  },
  icon: { fontSize: "2.5rem", marginBottom: "0.5rem" },
  title: { fontSize: "1.5rem", fontWeight: 800, color: "#7B2FBE", margin: "0 0 0.5rem" },
  errorMsg: { color: "#555", fontSize: "0.95rem", marginBottom: "1.5rem" },
  section: {
    background: "#f8f0ff", borderRadius: "1rem", padding: "1rem",
    marginBottom: "1.25rem", textAlign: "left",
  },
  sectionTitle: {
    fontSize: "0.75rem", fontWeight: 700, color: "#7B2FBE",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem",
  },
  credRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: "0.5rem", gap: "1rem",
  },
  credLabel: { fontSize: "0.8rem", color: "#666", flexShrink: 0 },
  credValue: {
    fontSize: "0.8rem", color: "#7B2FBE", background: "#efe3ff",
    borderRadius: "0.4rem", padding: "0.2rem 0.5rem", wordBreak: "break-all",
  },
  warning: {
    fontSize: "0.8rem", color: "#c05c00", background: "#fff3cd",
    borderRadius: "0.5rem", padding: "0.5rem 0.75rem", marginTop: "0.75rem",
  },
  form: { textAlign: "left" },
  hint: { fontSize: "0.8rem", color: "#888", marginBottom: "1rem" },
  link: { color: "#7B2FBE" },
  label: { display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#555", marginBottom: "0.3rem" },
  input: {
    width: "100%", boxSizing: "border-box",
    border: "2px solid #e0c8ff", borderRadius: "0.75rem",
    padding: "0.6rem 0.9rem", fontSize: "0.9rem", marginBottom: "1rem",
    fontFamily: "monospace", outline: "none",
  },
  actions: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" },
  btnPrimary: {
    background: "linear-gradient(135deg, #C77DFF, #7B2FBE)",
    color: "#fff", border: "none", borderRadius: "1rem",
    padding: "0.75rem 1.5rem", fontSize: "0.95rem", fontWeight: 700,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "transparent", border: "2px solid #e0c8ff",
    color: "#7B2FBE", borderRadius: "1rem",
    padding: "0.65rem 1.5rem", fontSize: "0.9rem", fontWeight: 700,
    cursor: "pointer",
  },
};
