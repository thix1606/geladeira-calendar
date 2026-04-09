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
    sessionStorage.setItem(PENDING_TOKEN_KEY, JSON.stringify(params));
    window.location.replace(window.location.origin + window.location.pathname);
    return null;
  }

  // Erro no silent refresh (ex: login_required, consent_required)
  if (params.error) {
    sessionStorage.removeItem('gc_silent_refresh');
    clearToken(); // evita loop: sem isso init() voltaria a tentar o silent refresh
    // Limpa o hash sem recarregar — usuário verá a tela de login
    window.history.replaceState(null, '', window.location.pathname);
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
  // Só salva expiry se tiver info — sem expiry = sem TTL (usa sempre)
  if (expiresInSec) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + Number(expiresInSec) * 1000 - 60000));
  }
}

function loadToken() {
  const token  = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return null;
  // Se não há expiry salvo, retorna o token (será validado ao usar)
  const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
  if (!expiry || Date.now() < expiry) return token;
  // Token expirado — limpa do localStorage mas retorna para tentar reautenticar
  return { expired: true, token };
}

function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// Renova o token silenciosamente via iframe invisível sem recarregar a página.
// O app detecta o contexto de iframe em index.js e faz postMessage do hash.
function silentRefreshViaIframe() {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      client_id:              GOOGLE_CONFIG.CLIENT_ID,
      redirect_uri:           window.location.origin + '/',
      response_type:          'token',
      scope:                  GOOGLE_CONFIG.SCOPES,
      prompt:                 'none',
      include_granted_scopes: 'false',
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    let iframe;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      try { if (iframe?.parentNode) iframe.parentNode.removeChild(iframe); } catch {}
    };
    const tid = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 15000);
    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      const data = typeof e.data === 'string' ? e.data : '';
      if (!data.startsWith('#')) return;
      clearTimeout(tid);
      cleanup();
      const p = Object.fromEntries(new URLSearchParams(data.slice(1)));
      if (p.access_token) resolve(p);
      else reject(new Error(p.error || 'no_token'));
    }
    window.addEventListener('message', onMessage);
    iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;opacity:0;width:0;height:0;top:0;left:0;border:0;pointer-events:none;';
    document.body.appendChild(iframe);
    iframe.src = authUrl;
  });
}

// ── Hook ───────────────────────────────────────────────────

const useGoogleCalendar = () => {
  const [isSignedIn, setIsSignedIn]     = useState(false);
  const [isLoading, setIsLoading]       = useState(true);
  const [calendarId, setCalendarId]     = useState(null);
  const [events, setEvents]             = useState([]);
  const [error, setError]               = useState(null);
  const [blockedEmail, setBlockedEmail] = useState(null);
  const [needsReAuth, setNeedsReAuth]   = useState(false);

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

  const authenticateWithToken = useCallback(async (accessToken, expiresIn, silent = false) => {
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

      setNeedsReAuth(false);
      setBlockedEmail(null);
      setIsSignedIn(true);
      await ensureCalendarExists();
    } catch (err) {
      console.error("Erro ao autenticar com token:", err);
      clearToken();
      if (silent) {
        setNeedsReAuth(true); // não mostra tela de erro — mostra overlay de sessão expirada
      } else {
        setError("Erro ao verificar conta Google.");
      }
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

        // 2. Hash na URL (caso location.replace não tenha funcionado)
        extractTokenFromHash();

        // 3. Token salvo no localStorage
        const savedToken = loadToken();
        if (savedToken) {
          const tokenStr = typeof savedToken === 'object' ? savedToken.token : savedToken;
          const expired  = typeof savedToken === 'object' && savedToken.expired;

          if (!expired) {
            // Token ainda válido — usa direto
            await authenticateWithToken(tokenStr, null);
            setIsLoading(false);
            return;
          }

          // Token expirado — tenta reautenticar silenciosamente via iframe (sem reload da página)
          try {
            const result = await silentRefreshViaIframe();
            await authenticateWithToken(result.access_token, result.expires_in, true);
          } catch (err) {
            console.warn('Silent refresh (init) failed:', err.message);
            setNeedsReAuth(true);
          }
        }

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

  // Renova o token silenciosamente via iframe (sem reload) antes de expirar.
  // Também verifica ao voltar ao app após a tela escura (visibilitychange).
  useEffect(() => {
    if (!isSignedIn) return;

    async function tryIframeRefresh() {
      try {
        const result = await silentRefreshViaIframe();
        await authenticateWithToken(result.access_token, result.expires_in, true);
      } catch (err) {
        console.warn('Background token refresh failed:', err.message);
        // Só exibe overlay se o token já expirou de fato
        const exp = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
        if (exp && Date.now() >= exp) setNeedsReAuth(true);
      }
    }

    // Agenda refresh 5 min antes da expiração
    const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
    let timer = null;
    if (expiry) {
      const msLeft = expiry - Date.now() - 5 * 60 * 1000;
      if (msLeft > 0) timer = setTimeout(tryIframeRefresh, msLeft);
      else if (Date.now() < expiry) tryIframeRefresh(); // menos de 5 min restantes
    }

    // Verifica ao voltar ao app (fridge sai do modo escuro/idle)
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const exp = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
      if (exp && Date.now() >= exp - 5 * 60 * 1000) tryIframeRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isSignedIn, authenticateWithToken]);

  // Renovação manual de sessão — usa select_account para o usuário escolher a conta
  // sem precisar redigitar senha (se a sessão Google ainda existir no browser)
  const renewAuth = useCallback(() => {
    setNeedsReAuth(false);
    const params = new URLSearchParams({
      client_id:              GOOGLE_CONFIG.CLIENT_ID,
      redirect_uri:           window.location.origin + '/',
      response_type:          'token',
      scope:                  GOOGLE_CONFIG.SCOPES,
      prompt:                 'select_account',
      include_granted_scopes: 'false',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }, []);

  // Move ou copia um evento para outra data
  const moveOrCopyEvent = useCallback(async (eventId, targetDate, mode) => {
    // mode: 'move' | 'copy'
    if (!calendarId) return null;
    try {
      const existing = events.find((e) => e.id === eventId);
      if (!existing) return null;

      const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(2,'0')}`;

      // Monta o resource com a nova data, preservando hora e restante
      const resource = { ...existing };
      delete resource.id; delete resource.etag; delete resource.kind;
      delete resource.created; delete resource.updated;
      delete resource.creator; delete resource.organizer;
      delete resource.iCalUID; delete resource.sequence;
      delete resource.htmlLink; delete resource.status;

      if (existing.start?.dateTime) {
        const origStart = new Date(existing.start.dateTime);
        const origEnd   = new Date(existing.end.dateTime);
        const duration  = origEnd - origStart;
        const newStart  = new Date(`${dateStr}T${origStart.toTimeString().slice(0,8)}`);
        const newEnd    = new Date(newStart.getTime() + duration);
        resource.start = { dateTime: newStart.toISOString(), timeZone: existing.start.timeZone ?? 'America/Sao_Paulo' };
        resource.end   = { dateTime: newEnd.toISOString(),   timeZone: existing.end.timeZone   ?? 'America/Sao_Paulo' };
      } else {
        resource.start = { date: dateStr };
        resource.end   = { date: dateStr };
      }

      if (mode === 'move') {
        // Atualiza o evento existente com a nova data
        const res = await window.gapi.client.calendar.events.update({ calendarId, eventId, resource });
        setEvents((prev) => prev.map((e) => e.id === eventId ? res.result : e));
        return res.result;
      } else {
        // Cria um novo evento (cópia) na nova data
        const res = await window.gapi.client.calendar.events.insert({ calendarId, resource });
        setEvents((prev) => [...prev, res.result]);
        return res.result;
      }
    } catch (err) {
      console.error('Erro ao mover/copiar evento:', err);
      return null;
    }
  }, [calendarId, events]);

  return { isSignedIn, isLoading, error, events, calendarId, blockedEmail, needsReAuth, signIn, signOut, renewAuth, addEvent, deleteEvent, updateEvent, moveOrCopyEvent, fetchEvents };
};

export default useGoogleCalendar;
