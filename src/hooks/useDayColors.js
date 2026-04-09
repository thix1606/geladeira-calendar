// ============================================================
// useDayColors — cores personalizadas por dia (localStorage)
// ============================================================
// Chave: "YYYY-MM-DD" → cor hex

import { useState, useCallback } from "react";

const STORAGE_KEY = "cal_day_colors";

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function save(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function dateKey(date) {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

export const DAY_COLOR_OPTIONS = [
  { label: "Nenhuma",  value: null,      hex: null },
  { label: "Rosa",     value: "pink",    hex: "#FF6B9D" },
  { label: "Roxo",     value: "purple",  hex: "#C77DFF" },
  { label: "Azul",     value: "blue",    hex: "#74C0FC" },
  { label: "Verde",    value: "green",   hex: "#69DB7C" },
  { label: "Amarelo",  value: "yellow",  hex: "#FFD43B" },
  { label: "Laranja",  value: "orange",  hex: "#FFA94D" },
  { label: "Vermelho", value: "red",     hex: "#FF6B6B" },
];

export function useDayColors() {
  const [colors, setColors] = useState(load);

  const getColor = useCallback((date) => {
    const key = dateKey(date);
    if (!key) return null;
    const value = colors[key];
    return DAY_COLOR_OPTIONS.find((o) => o.value === value) ?? null;
  }, [colors]);

  const setColor = useCallback((date, value) => {
    const key = dateKey(date);
    if (!key) return;
    const updated = { ...colors };
    if (!value) {
      delete updated[key];
    } else {
      updated[key] = value;
    }
    save(updated);
    setColors(updated);
  }, [colors]);

  const getRawColors = useCallback(() => colors, [colors]);

  return { getColor, setColor, getRawColors, dateKey };
}
