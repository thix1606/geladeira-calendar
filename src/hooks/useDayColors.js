// ============================================================
// useDayColors — cores nomeadas configuráveis + cor por dia
// ============================================================

import { useState, useCallback } from "react";

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

// Estrutura de uma cor configurada:
// { id: "pink", hex: "#FF6B9D", name: "Papai" }

function loadColorsConfig() {
  try { return JSON.parse(localStorage.getItem(COLORS_CONFIG_KEY) || "[]"); } catch { return []; }
}

function saveColorsConfig(list) {
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

export function useDayColors() {
  const [colorsConfig, setColorsConfig] = useState(loadColorsConfig);
  const [dayColors, setDayColors]       = useState(loadDayColors);

  // ── Configuração de cores ──────────────────────────────

  const saveColor = useCallback((colorDef) => {
    // colorDef: { id, hex, name }
    const updated = colorsConfig.filter((c) => c.id !== colorDef.id);
    updated.push(colorDef);
    saveColorsConfig(updated);
    setColorsConfig(updated);
  }, [colorsConfig]);

  const removeColor = useCallback((colorId) => {
    const updated = colorsConfig.filter((c) => c.id !== colorId);
    saveColorsConfig(updated);
    setColorsConfig(updated);
  }, [colorsConfig]);

  // ── Cor por dia ───────────────────────────────────────

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
    if (!colorId) {
      delete updated[key];
    } else {
      updated[key] = colorId;
    }
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
  };
}
