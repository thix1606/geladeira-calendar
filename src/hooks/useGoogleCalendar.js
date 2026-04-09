import { useState, useEffect, useCallback } from "react";
import GOOGLE_CONFIG from "../googleConfig";

// Retorna o e-mail do usuário logado (ou null)
function getCurrentUserEmail() {
  try {
    const user = window.gapi.auth2.getAuthInstance().currentUser.get();
    return user.getBasicProfile().getEmail().toLowerCase();
  } catch {
    return null;
  }
}

// Verifica se o e-mail está na whitelist configurada
function isEmailAllowed(email) {
  if (!email) return false;
  const list = (GOOGLE_CONFIG.ALLOWED_EMAILS || []).map((e) => e.toLowerCase());
  if (list.length === 0) return true; // whitelist vazia = sem restrição
  return list.includes(email.toLowerCase());
}

const useGoogleCalendar = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarId, setCalendarId] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [blockedEmail, setBlockedEmail] = useState(null);

  const checkEmailAccess = useCallback(async (authInstance) => {
    const email = getCurrentUserEmail();
    if (!isEmailAllowed(email)) {
      setBlockedEmail(email);
      await authInstance.signOut();
      setIsSignedIn(false);
      setCalendarId(null);
      setEvents([]);
      return false;
    }
    setBlockedEmail(null);
    return true;
  }, []);

  useEffect(() => {
    const loadGapiScript = () => {
      if (window.gapi) { initClient(); return; }
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => window.gapi.load("client:auth2", initClient);
      script.onerror = () => setError("Erro ao carregar Google API");
      document.body.appendChild(script);
    };

    const initClient = async () => {
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_CONFIG.API_KEY,
          clientId: GOOGLE_CONFIG.CLIENT_ID,
          discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
          scope: GOOGLE_CONFIG.SCOPES,
        });

        const authInstance = window.gapi.auth2.getAuthInstance();
        const signedIn = authInstance.isSignedIn.get();

        if (signedIn) {
          const allowed = await checkEmailAccess(authInstance);
          setIsSignedIn(allowed);
          if (allowed) await ensureCalendarExists();
        } else {
          setIsSignedIn(false);
        }

        authInstance.isSignedIn.listen(async (signed) => {
          if (signed) {
            const allowed = await checkEmailAccess(authInstance);
            setIsSignedIn(allowed);
            if (allowed) await ensureCalendarExists();
          } else {
            setIsSignedIn(false);
            setCalendarId(null);
            setEvents([]);
          }
        });
      } catch (err) {
        const detail = err?.details ?? err?.error ?? err?.message ?? JSON.stringify(err);
        console.error("Erro ao inicializar Google API:", err);
        setError(`Erro de configuração: ${detail}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadGapiScript();
  }, [checkEmailAccess]);

  const ensureCalendarExists = useCallback(async () => {
    try {
      const response = await window.gapi.client.calendar.calendarList.list();
      const calendars = response.result.items || [];
      const existing = calendars.find((cal) => cal.summary === GOOGLE_CONFIG.CALENDAR_NAME);
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

  const fetchEvents = useCallback(async (year, month) => {
    if (!calendarId) return;
    try {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      const response = await window.gapi.client.calendar.events.list({
        calendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 200,
      });
      setEvents(response.result.items || []);
    } catch (err) {
      console.error("Erro ao buscar eventos:", err);
    }
  }, [calendarId]);

  const signIn = useCallback(async () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      const allowed = await checkEmailAccess(authInstance);
      if (allowed) return await ensureCalendarExists();
    } catch (err) {
      console.error("Erro no login:", err);
    }
  }, [ensureCalendarExists, checkEmailAccess]);

  const signOut = useCallback(async () => {
    await window.gapi.auth2.getAuthInstance().signOut();
    setCalendarId(null);
    setEvents([]);
    setBlockedEmail(null);
  }, []);

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
      const response = await window.gapi.client.calendar.events.insert({ calendarId, resource });
      return response.result;
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
