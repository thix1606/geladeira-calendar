// ============================================================
// useGoogleCalendar — Google Identity Services (GIS) + gapi.client
// ============================================================
// Fluxo: implicit grant via redirect (ux_mode: 'redirect')
// O token retorna no hash da URL após autorização: #access_token=...
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import GOOGLE_CONFIG from "../googleConfig";

// ── Helpers ────────────────────────────────────────────────

function isEmailAllowed(email) {
  if (!email) return false;
  const list = (GOOGLE_CONFIG.ALLOWED_EMAILS || []).map((e) => e.toLowerCase());
  if (list.length === 0) return true;
  return list.includes(email.toLowerCase());
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Falha ao carregar: ${src}`));
    document.body.appendChild(s);
  });
}

// Extrai token do hash da URL (retorno do redirect OAuth)
const PENDING_TOKEN_KEY = 'gc_pending_token';

function extractTokenFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const params = Object.fromEntries(new URLSearchParams(hash));
  if (params.access_token) {
    // Salva o token no sessionStorage antes de recarregar
    sessionStorage.setItem(PENDING_TOKEN_KEY, JSON.stringify(params));
    // location.replace limpa o hash E remove a entrada do Google do histórico
    window.location.replace(window.location.origin + window.location.pathname);
    return null; // retorna null pois vai recarregar
  }
  return null;
}

function consumePendingToken() {
  const raw = sessionStorage.getItem(PENDING_TOKEN_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_TOKEN_KEY);
  try { return JSON.parse(raw); } catch { return null; }
}

const TOKEN_STORAGE_KEY = 'gc_access_token';
const TOKEN_EXPIRY_KEY  = 'gc_token_expiry';

function saveToken(token, expiresInSec) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSec * 1000 - 60000)); // -1min de margem
}

function loadToken() {
  const token  = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
  if (token && Date.now() < expiry) return token;
  return null;
}

function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// ── Hook ───────────────────────────────────────────────────

const useGoogleCalendar = () => {
  const [isSignedIn, setIsSignedIn]     = useState(false);
  const [isLoading, setIsLoading]       = useState(true);
  const [calendarId, setCalendarId]     = useState(null);
  const [events, setEvents]             = useState([]);
  const [error, setError]               = useState(null);
  const [blockedEmail, setBlockedEmail] = useState(null);

  const tokenClientRef = useRef(null);

  // ── Calendário ────────────────────────────────────────

  const ensureCalendarExists = useCallback(async () => {
    try {
      const res = await window.gapi.client.calendar.calendarList.list();
      const calendars = res.result.items || [];
      const existing = calendars.find((c) => c.summary === GOOGLE_CONFIG.CALENDAR_NAME);
      if (existing) { setCalendarId(existing.id); return existing.id; }
      const newCal = await window.gapi.client.calendar.calendars.insert({
        resource: {
          summary: GOOGLE_CONFIG.CALENDAR_NAME,
          timeZone: GOOGLE_CONFIG.TIMEZONE,
          description: "Calendário mágico para compromissos especiais! ⭐🌈",
        },
      });
      setCalendarId(newCal.result.id);
      return newCal.result.id;
    } catch (err) {
      console.error("Erro ao verificar/criar calendário:", err);
      setError("Erro ao acessar calendários");
    }
  }, []);

  // ── Autenticação com token ────────────────────────────

  const authenticateWithToken = useCallback(async (accessToken, expiresIn) => {
    try {
      window.gapi.client.setToken({ access_token: accessToken });

      const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json());

      const email = (userInfo.email || "").toLowerCase();

      if (!isEmailAllowed(email)) {
        setBlockedEmail(email);
        window.google?.accounts?.oauth2?.revoke(accessToken);
        window.gapi.client.setToken(null);
        clearToken();
        setIsSignedIn(false);
        return;
      }

      // Persiste o token no localStorage
      if (expiresIn) saveToken(accessToken, Number(expiresIn));

      setBlockedEmail(null);
      setIsSignedIn(true);
      await ensureCalendarExists();
    } catch (err) {
      console.error("Erro ao autenticar com token:", err);
      clearToken();
      setError("Erro ao verificar conta Google.");
    }
  }, [ensureCalendarExists]);

  // ── Inicialização ─────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await Promise.all([
          loadScript("https://apis.google.com/js/api.js"),
          loadScript("https://accounts.google.com/gsi/client"),
        ]);

        if (cancelled) return;

        await new Promise((resolve, reject) => {
          window.gapi.load("client", { callback: resolve, onerror: reject });
        });

        await window.gapi.client.init({
          apiKey:        GOOGLE_CONFIG.API_KEY,
          discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
        });

        if (cancelled) return;

        // Token client para fallback (não usado no fluxo principal)
        tokenClientRef.current = { ready: true };

        if (cancelled) return;

        // 1. Token pendente do sessionStorage (após location.replace pós-OAuth)
        const pendingToken = consumePendingToken();
        if (pendingToken?.access_token) {
          await authenticateWithToken(pendingToken.access_token, pendingToken.expires_in);
          setIsLoading(false);
          return;
        }

        // 2. Token salvo no localStorage (sessão persistente)
        const savedToken = loadToken();
        if (savedToken) {
          await authenticateWithToken(savedToken, null);
          setIsLoading(false);
          return;
        }

        // 3. Hash na URL (caso location.replace não tenha funcionado)
        extractTokenFromHash(); // se tiver token, salva e recarrega

        setIsLoading(false);

      } catch (err) {
        if (cancelled) return;
        const detail = err?.details ?? err?.message ?? JSON.stringify(err);
        console.error("Erro ao inicializar Google API:", err);
        setError(`Erro de configuração: ${detail}`);
        setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [authenticateWithToken]);

  // ── Auth ──────────────────────────────────────────────

  // Redirect manual para OAuth — evita popup e problemas de COOP
  const signIn = useCallback(() => {
    const params = new URLSearchParams({
      client_id:     GOOGLE_CONFIG.CLIENT_ID,
      redirect_uri:  window.location.origin + '/',
      response_type: 'token',
      scope:         GOOGLE_CONFIG.SCOPES,
      prompt:        'consent',
      include_granted_scopes: 'false',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }, []);

  const signOut = useCallback(() => {
    const token = window.gapi?.client?.getToken();
    if (token?.access_token) {
      window.google?.accounts?.oauth2?.revoke(token.access_token);
      window.gapi.client.setToken(null);
    }
    clearToken();
    setIsSignedIn(false);
    setCalendarId(null);
    setEvents([]);
    setBlockedEmail(null);
  }, []);

  // ── Eventos ───────────────────────────────────────────

  const fetchEvents = useCallback(async (year, month) => {
    if (!calendarId) return;
    try {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month + 1, 0, 23, 59, 59);
      const res   = await window.gapi.client.calendar.events.list({
        calendarId,
        timeMin:      start.toISOString(),
        timeMax:      end.toISOString(),
        singleEvents: true,
        orderBy:      "startTime",
        maxResults:   200,
      });
      setEvents(res.result.items || []);
    } catch (err) {
      console.error("Erro ao buscar eventos:", err);
    }
  }, [calendarId]);

  const addEvent = useCallback(async ({ title, emoji, date, startTime, endTime, color, notes }) => {
    if (!calendarId) return null;
    try {
      const colorMap = { pink:"4", purple:"3", blue:"1", green:"2", yellow:"5", red:"11", orange:"6" };
      const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
      const resource = { summary: `${emoji} ${title}`, description: notes || "", colorId: colorMap[color] || "4" };
      if (startTime) {
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = (endTime || startTime).split(":").map(Number);
        resource.start = { dateTime: `${dateStr}T${String(sh).padStart(2,"0")}:${String(sm).padStart(2,"0")}:00`, timeZone: GOOGLE_CONFIG.TIMEZONE };
        resource.end   = { dateTime: `${dateStr}T${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}:00`, timeZone: GOOGLE_CONFIG.TIMEZONE };
      } else {
        resource.start = { date: dateStr };
        resource.end   = { date: dateStr };
      }
      const res = await window.gapi.client.calendar.events.insert({ calendarId, resource });
      return res.result;
    } catch (err) {
      console.error("Erro ao adicionar evento:", err);
      return null;
    }
  }, [calendarId]);

  const deleteEvent = useCallback(async (eventId) => {
    if (!calendarId) return;
    try {
      await window.gapi.client.calendar.events.delete({ calendarId, eventId });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error("Erro ao deletar evento:", err);
    }
  }, [calendarId]);

  const updateEvent = useCallback(async (eventId, { title, emoji, startTime, endTime, color, notes }) => {
    if (!calendarId) return null;
    try {
      const colorMap = { pink:"4", purple:"3", blue:"1", green:"2", yellow:"5", red:"11", orange:"6" };
      // Busca o evento atual para preservar a data
      const existing = events.find((e) => e.id === eventId);
      if (!existing) return null;

      const resource = {
        summary:     `${emoji} ${title}`,
        description: notes || "",
        colorId:     colorMap[color] || "4",
      };

      if (startTime) {
        // Extrai a data do evento original
        const baseDate = existing.start?.date
          ? existing.start.date
          : new Date(existing.start.dateTime).toISOString().slice(0, 10);
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = (endTime || startTime).split(":").map(Number);
        resource.start = { dateTime: `${baseDate}T${String(sh).padStart(2,"0")}:${String(sm).padStart(2,"0")}:00`, timeZone: "America/Sao_Paulo" };
        resource.end   = { dateTime: `${baseDate}T${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}:00`, timeZone: "America/Sao_Paulo" };
      } else {
        const baseDate = existing.start?.date
          ? existing.start.date
          : new Date(existing.start.dateTime).toISOString().slice(0, 10);
        resource.start = { date: baseDate };
        resource.end   = { date: baseDate };
      }

      const res = await window.gapi.client.calendar.events.update({ calendarId, eventId, resource });
      setEvents((prev) => prev.map((e) => e.id === eventId ? res.result : e));
      return res.result;
    } catch (err) {
      console.error("Erro ao atualizar evento:", err);
      return null;
    }
  }, [calendarId, events]);

  useEffect(() => {
    if (calendarId && isSignedIn) {
      const now = new Date();
      fetchEvents(now.getFullYear(), now.getMonth() + 1);
    }
  }, [calendarId, isSignedIn, fetchEvents]);

  return { isSignedIn, isLoading, error, events, calendarId, blockedEmail, signIn, signOut, addEvent, deleteEvent, updateEvent, fetchEvents };
};

export default useGoogleCalendar;
