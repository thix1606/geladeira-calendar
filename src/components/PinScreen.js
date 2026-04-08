import React, { useState, useEffect } from "react";
import GOOGLE_CONFIG from "../googleConfig";

// Chave usada no localStorage para guardar a sessão do PIN
const PIN_STORAGE_KEY = "cal_pin_unlocked_until";

// Verifica se já existe uma sessão válida salva neste dispositivo
export function isPinSessionValid() {
  try {
    const until = localStorage.getItem(PIN_STORAGE_KEY);
    if (!until) return false;
    return Date.now() < parseInt(until, 10);
  } catch {
    return false;
  }
}

// Salva a sessão por PIN_SESSION_HOURS horas
function savePinSession() {
  const hours = GOOGLE_CONFIG.PIN_SESSION_HOURS ?? 12;
  const until = Date.now() + hours * 60 * 60 * 1000;
  localStorage.setItem(PIN_STORAGE_KEY, String(until));
}

// Apaga a sessão (para forçar redigitação do PIN)
export function clearPinSession() {
  localStorage.removeItem(PIN_STORAGE_KEY);
}

// ── Componente ──────────────────────────────────────────────
const PinScreen = ({ onUnlock }) => {
  const [digits, setDigits] = useState([]);
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState("");

  const PIN = String(GOOGLE_CONFIG.PIN || "1234");
  const PIN_LEN = PIN.length;

  const handleDigit = (d) => {
    if (digits.length >= PIN_LEN) return;
    const next = [...digits, d];
    setDigits(next);

    if (next.length === PIN_LEN) {
      setTimeout(() => {
        if (next.join("") === PIN) {
          savePinSession();
          onUnlock();
        } else {
          setShake(true);
          setHint("PIN incorreto, tente de novo 🙈");
          setTimeout(() => {
            setDigits([]);
            setShake(false);
            setHint("");
          }, 700);
        }
      }, 120);
    }
  };

  const handleDelete = () => setDigits((prev) => prev.slice(0, -1));

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="pin-screen">
      <div className="pin-mascot">🔐</div>
      <div className="pin-title">Qual é o código secreto?</div>
      <div className="pin-subtitle">Digite o PIN para entrar ✨</div>

      {/* Indicadores dos dígitos */}
      <div className={`pin-dots ${shake ? "pin-shake" : ""}`}>
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <div
            key={i}
            className={`pin-dot ${i < digits.length ? "pin-dot-filled" : ""}`}
          />
        ))}
      </div>

      {hint && <div className="pin-hint">{hint}</div>}

      {/* Teclado numérico */}
      <div className="pin-keypad">
        {keys.map((key, idx) => {
          if (key === "") return <div key={idx} />;
          return (
            <button
              key={idx}
              className={`pin-key ${key === "⌫" ? "pin-key-del" : ""}`}
              onClick={() => key === "⌫" ? handleDelete() : handleDigit(key)}
              aria-label={key === "⌫" ? "Apagar" : key}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PinScreen;
