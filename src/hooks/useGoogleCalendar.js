// ============================================================
// useGoogleCalendar — Google Identity Services (GIS) + gapi.client
// ============================================================
// Autenticação: @google/model-viewer → google.accounts.oauth2 (GIS)
// API Calendar: gapi.client (mantida, apenas autenticação mudou)
// Migração: https://developers.google.com/identity/gsi/web/guides/gis-migration
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

// ── Hook ───────────────────────────────────────────────────

const useGoogleCalendar = () => {
  const [isSignedIn, setIsSignedIn]   = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [calendarId, setCalendarId]   = useState(null);
  const [events, setEvents]           = useState([]);
  const [error, setError]             = useState(null);
  const [blockedEmail, setBlockedEmail] = useState(null);

  // Referência ao token client do GIS
  const tokenClientRef = useRef(null);
  // Resolve/reject do signIn pendente
  const signInResolveRef = useRef(null);

  // ── Calendário ─────────────────────────────────────────

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

  // ── Inicialização ───────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Carrega os dois scripts em paralelo
        await Promise.all([
          loadScript("https://apis.google.com/js/api.js"),
          loadScript("https://accounts.google.com/gsi/client"),
        ]);

        if (cancelled) return;

        // Inicializa gapi.client (sem autenticação — só discovery)
        await new Promise((resolve, reject) => {
          window.gapi.load("client", { callback: resolve, onerror: reject });
        });

        await window.gapi.client.init({
          apiKey:         GOOGLE_CONFIG.API_KEY,
          discoveryDocs:  GOOGLE_CONFIG.DISCOVERY_DOCS,
        });

        if (cancelled) return;

        // Inicializa o token client do GIS
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CONFIG.CLIENT_ID,
          scope:     GOOGLE_CONFIG.SCOPES,
          callback:  async (tokenResponse) => {
            if (tokenResponse.error) {
              console.error("GIS token error:", tokenResponse);
              if (signInResolveRef.current) { signInResolveRef.current(false); signInResolveRef.current = null; }
              return;
            }

            // Seta o token no gapi.client para as chamadas da Calendar API
            window.gapi.client.setToken({ access_token: tokenResponse.access_token });

            // Pega o e-mail via userinfo
            try {
              const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              }).then((r) => r.json());

              const email = (userInfo.email || "").toLowerCase();

              if (!isEmailAllowed(email)) {
                setBlockedEmail(email);
                window.google.accounts.oauth2.revoke(tokenResponse.access_token);
                setIsSignedIn(false);
                if (signInResolveRef.current) { signInResolveRef.current(false); signInResolveRef.current = null; }
                return;
              }

              setBlockedEmail(null);
              setIsSignedIn(true);
              await ensureCalendarExists();
              if (signInResolveRef.current) { signInResolveRef.current(true); signInResolveRef.current = null; }
            } catch (err) {
              console.error("Erro ao obter userinfo:", err);
              if (signInResolveRef.current) { signInResolveRef.current(false); signInResolveRef.current = null; }
            }
          },
        });

        if (cancelled) return;
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
  }, [ensureCalendarExists]);

  // ── Auth ────────────────────────────────────────────────

  const signIn = useCallback(() => {
    return new Promise((resolve) => {
      signInResolveRef.current = resolve;
      tokenClientRef.current?.requestAccessToken({ prompt: "consent" });
    });
  }, []);

  const signOut = useCallback(() => {
    const token = window.gapi?.client?.getToken();
    if (token?.access_token) {
      window.google?.accounts?.oauth2?.revoke(token.access_token);
      window.gapi.client.setToken(null);
    }
    setIsSignedIn(false);
    setCalendarId(null);
    setEvents([]);
    setBlockedEmail(null);
  }, []);

  // ── Eventos ─────────────────────────────────────────────

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

  useEffect(() => {
    if (calendarId && isSignedIn) {
      const now = new Date();
      fetchEvents(now.getFullYear(), now.getMonth() + 1);
    }
  }, [calendarId, isSignedIn, fetchEvents]);

  return { isSignedIn, isLoading, error, events, calendarId, blockedEmail, signIn, signOut, addEvent, deleteEvent, fetchEvents };
};

export default useGoogleCalendar;
