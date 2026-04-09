// ============================================================
// useDayColors — cores nomeadas configuráveis + cor por dia
// ============================================================
// colorsConfig é sincronizado com o Google Calendar (servidor).
// dayColors é salvo apenas no localStorage (por ser por-dispositivo/dia).

import { useState, useEffect, useCallback } from "react";
import { loadColorsFromServer, saveColorsToServer } from "../services/colorsSync";

const COLORS_CONFIG_KEY = "cal_colors_config";
const DAY_COLORS_KEY    = "cal_day_colors";

// Paleta de cores disponíveis
export const COLOR_PALETTE = [
  { hex: "#FF6B9D", id: "pink"   },
  { hex: "#C77DFF", id: "purple" },
  { hex: "#74C0FC", id: "blue"   },
  { hex: "#69DB7C", id: "green"  },
  { hex: "#FFD43B", id: "yellow" },
  { hex: "#FFA94D", id: "orange" },
  { hex: "#FF6B6B", id: "red"    },
  { hex: "#20C997", id: "teal"   },
];

function loadColorsConfigLocal() {
  try { return JSON.parse(localStorage.getItem(COLORS_CONFIG_KEY) || "[]"); } catch { return []; }
}

function saveColorsConfigLocal(list) {
  localStorage.setItem(COLORS_CONFIG_KEY, JSON.stringify(list));
}

function loadDayColors() {
  try { return JSON.parse(localStorage.getItem(DAY_COLORS_KEY) || "{}"); } catch { return {}; }
}

function saveDayColors(map) {
  localStorage.setItem(DAY_COLORS_KEY, JSON.stringify(map));
}

export function dateKey(date) {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

export function useDayColors(calendarId) {
  const [colorsConfig, setColorsConfig] = useState(loadColorsConfigLocal);
  const [dayColors, setDayColors]       = useState(loadDayColors);
  const [syncing, setSyncing]           = useState(false);

  // ── Carrega do servidor quando calendarId fica disponível ──
  useEffect(() => {
    if (!calendarId) return;
    setSyncing(true);
    loadColorsFromServer(calendarId)
      .then((serverConfig) => {
        if (serverConfig && serverConfig.length > 0) {
          // Servidor tem dados — usa como fonte de verdade
          saveColorsConfigLocal(serverConfig);
          setColorsConfig(serverConfig);
        } else if (colorsConfig.length > 0) {
          // Servidor vazio mas localStorage tem dados — sobe pro servidor
          saveColorsToServer(calendarId, colorsConfig).catch(console.warn);
        }
      })
      .catch(console.warn)
      .finally(() => setSyncing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarId]);

  // ── Configuração de cores ──────────────────────────────────

  const saveColor = useCallback(async (colorDef) => {
    const updated = colorsConfig.filter((c) => c.id !== colorDef.id);
    updated.push(colorDef);
    saveColorsConfigLocal(updated);
    setColorsConfig(updated);
    if (calendarId) {
      try { await saveColorsToServer(calendarId, updated); } catch (e) { console.warn("Sync falhou:", e); }
    }
  }, [colorsConfig, calendarId]);

  const removeColor = useCallback(async (colorId) => {
    const updated = colorsConfig.filter((c) => c.id !== colorId);
    saveColorsConfigLocal(updated);
    setColorsConfig(updated);
    if (calendarId) {
      try { await saveColorsToServer(calendarId, updated); } catch (e) { console.warn("Sync falhou:", e); }
    }
  }, [colorsConfig, calendarId]);

  // ── Cor por dia (localStorage apenas) ─────────────────────

  const getDayColor = useCallback((date) => {
    const key = dateKey(date);
    if (!key) return null;
    const colorId = dayColors[key];
    if (!colorId) return null;
    return colorsConfig.find((c) => c.id === colorId) ?? null;
  }, [dayColors, colorsConfig]);

  const setDayColor = useCallback((date, colorId) => {
    const key = dateKey(date);
    if (!key) return;
    const updated = { ...dayColors };
    if (!colorId) delete updated[key];
    else updated[key] = colorId;
    saveDayColors(updated);
    setDayColors(updated);
  }, [dayColors]);

  const getRawDayColors = useCallback(() => dayColors, [dayColors]);

  return {
    colorsConfig,
    saveColor,
    removeColor,
    getDayColor,
    setDayColor,
    getRawDayColors,
    syncing,
  };
}
