import React, { useState, useEffect, useCallback, useMemo } from "react";
import useGoogleCalendar from "./hooks/useGoogleCalendar";
import { useDayColors, dateKey } from "./hooks/useDayColors";
import CalendarView from "./components/CalendarView";
import DayView from "./components/DayView";
import AddEventModal from "./components/AddEventModal";
import LoginScreen from "./components/LoginScreen";
import PinScreen, { isPinSessionValid, clearPinSession } from "./components/PinScreen";
import BlockedScreen from "./components/BlockedScreen";
import ErrorScreen from "./components/ErrorScreen";
import ColorsConfigScreen from "./components/ColorsConfigScreen";
import BuildVersion from "./components/BuildVersion";
import { BUILD_API_KEY, BUILD_CLIENT_ID } from "./googleConfig";
import "./App.css";

// Título do evento automático de cor
function colorEventTitle(colorName) { return `📌 Dia com ${colorName}`; }
function isColorEvent(ev) { return (ev.summary || "").startsWith("📌 Dia com "); }

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState("month"); // "month" | "day" | "settings"
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForDate, setAddForDate] = useState(null);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [todayPulse, setTodayPulse] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [pinUnlocked, setPinUnlocked] = useState(() => isPinSessionValid());

  const {
    isSignedIn, isLoading, error, events, calendarId,
    blockedEmail, signIn, signOut, addEvent, deleteEvent, updateEvent, moveOrCopyEvent, fetchEvents,
    needsReAuth, renewAuth,
  } = useGoogleCalendar();

  const {
    colorsConfig, saveColor, removeColor,
    getDayColor, setDayColor, getRawDayColors, hydrateDayColorsFromEvents, syncing,
  } = useDayColors(calendarId);

  // Emojis flutuantes
  useEffect(() => {
    const emojis = ["⭐","🌈","🦄","🌸","🍭","✨","🎀","🌺","💫","🎈"];
    setFloatingEmojis(Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      left: `${Math.random() * 90}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${12 + Math.random() * 8}s`,
      size: `${1.2 + Math.random() * 1.2}rem`,
    })));
  }, []);

  // Quando eventos chegam do servidor, reconstrói dayColors para datas ainda
  // sem cor no localStorage (ex: primeiro acesso em navegador novo).
  useEffect(() => {
    hydrateDayColorsFromEvents(events);
  }, [events, hydrateDayColorsFromEvents]);

  // ── Navegação ─────────────────────────────────────────────

  const handleDayPress = useCallback((date) => {
    setSelectedDate(date);
    setView("day");
    fetchEvents(date.getFullYear(), date.getMonth() + 1);
    window.history.pushState({ view: "day" }, "");
  }, [fetchEvents]);

  const handleBackToMonth = useCallback(() => {
    setView("month");
    setSelectedDate(null);
  }, []);

  // Refs para o handler estável de back (sem stale closure)
  const viewRef         = React.useRef(view);
  const showModalRef    = React.useRef(showAddModal);
  const showExitRef     = React.useRef(false);
  const currentDateRef  = React.useRef(currentDate);
  const fetchEventsRef  = React.useRef(fetchEvents);
  useEffect(() => { viewRef.current      = view;             }, [view]);
  useEffect(() => { showModalRef.current = showAddModal;     }, [showAddModal]);
  useEffect(() => { showExitRef.current  = showExitConfirm;  }, [showExitConfirm]);
  useEffect(() => { currentDateRef.current = currentDate;    }, [currentDate]);
  useEffect(() => { fetchEventsRef.current = fetchEvents;    }, [fetchEvents]);

  // Bloqueia o back do browser — handler registrado UMA VEZ para evitar janela sem listener.
  // Prioridade: 1) fecha modal aberto  2) volta pra month  3) mantém guard (fica no app)
  // Empilha várias entradas de guarda para garantir buffer mesmo em browsers que não disparam
  // popstate ao chegar à primeira entrada do histórico.
  useEffect(() => {
    window.history.replaceState({ app: true }, "");
    // Empilha 5 entradas de guarda para ter buffer suficiente
    for (let i = 0; i < 5; i++) {
      window.history.pushState({ app: true }, "");
    }

    const onPopState = () => {
      // Repõe 2 entradas a cada pop para não esgotar o buffer
      window.history.pushState({ app: true }, "");
      window.history.pushState({ app: true }, "");
      if (showModalRef.current) {
        setShowAddModal(false);
        return;
      }
      if (showExitRef.current) return; // já está mostrando o diálogo
      if (viewRef.current === "day" || viewRef.current === "settings") {
        handleBackToMonth();
        return;
      }
      // Tela de mês: se estiver num mês diferente do atual, volta ao mês atual
      const now = new Date();
      const curr = currentDateRef.current;
      if (curr.getMonth() !== now.getMonth() || curr.getFullYear() !== now.getFullYear()) {
        setCurrentDate(now);
        fetchEventsRef.current(now.getFullYear(), now.getMonth() + 1);
        return;
      }
      // Está no mês atual: pergunta se quer sair
      setShowExitConfirm(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenSettings = useCallback(() => {
    setView("settings");
    window.history.pushState({ view: "settings" }, "");
  }, []);

  // ── Eventos ───────────────────────────────────────────────

  const handleOpenAddModal = useCallback((date) => {
    setAddForDate(date);
    setShowAddModal(true);
  }, []);

  const handleAddEvent = useCallback(async (eventData) => {
    const result = await addEvent(eventData);
    if (result) {
      setShowAddModal(false);
      await fetchEvents(eventData.date.getFullYear(), eventData.date.getMonth() + 1);
    }
  }, [addEvent, fetchEvents]);

  const handleMonthChange = useCallback((direction) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
    fetchEvents(d.getFullYear(), d.getMonth() + 1);
  }, [currentDate, fetchEvents]);

  // ── Cores + eventos automáticos ───────────────────────────

  // Encontra o evento de cor atual para o dia selecionado
  const colorEventId = useMemo(() => {
    if (!selectedDate) return null;
    const dayEv = events.find((ev) => {
      if (!isColorEvent(ev)) return false;
      const d = ev.start?.date
        ? new Date(ev.start.date + "T00:00:00")
        : ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
      if (!d) return false;
      return d.getDate() === selectedDate.getDate() &&
             d.getMonth() === selectedDate.getMonth() &&
             d.getFullYear() === selectedDate.getFullYear();
    });
    return dayEv?.id ?? null;
  }, [events, selectedDate]);

  const handleCreateColorEvent = useCallback(async (date, colorName) => {
    const dateStr = dateKey(date);
    const [y, m, d] = dateStr.split("-");
    const result = await addEvent({
      title: `Dia com ${colorName}`,
      emoji: "📌",
      date: new Date(Number(y), Number(m) - 1, Number(d)),
      startTime: null,
      endTime: null,
      color: "pink",
      notes: "",
    });
    if (result) await fetchEvents(date.getFullYear(), date.getMonth() + 1);
    return result;
  }, [addEvent, fetchEvents]);

  const handleDeleteColorEvent = useCallback(async (eventId) => {
    await deleteEvent(eventId);
    if (selectedDate) await fetchEvents(selectedDate.getFullYear(), selectedDate.getMonth() + 1);
  }, [deleteEvent, fetchEvents, selectedDate]);

  // ── Auth ──────────────────────────────────────────────────

  const handleGoToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(now);
    fetchEvents(now.getFullYear(), now.getMonth() + 1);
    // Dispara animação no dia atual
    setTodayPulse(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setTodayPulse(true)));
    setTimeout(() => setTodayPulse(false), 1800);
  }, [fetchEvents]);

  const handleSignOut = useCallback(async () => {
    clearPinSession();
    setPinUnlocked(false);
    await signOut();
  }, [signOut]);

  // ── Guards ────────────────────────────────────────────────

  if (isLoading) return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-emoji">🌟</div>
        <div className="splash-title">Calendário Mágico</div>
        <div className="splash-dots"><span /><span /><span /></div>
      </div>
      <BuildVersion style={{ position: 'absolute', bottom: '1rem', width: '100%' }} />
    </div>
  );

  if (error) return (
    <ErrorScreen
      error={error}
      buildApiKey={BUILD_API_KEY}
      buildClientId={BUILD_CLIENT_ID}
      onRetry={() => window.location.reload()}
    />
  );

  if (!pinUnlocked) return <PinScreen onUnlock={() => setPinUnlocked(true)} />;
  if (blockedEmail) return <BlockedScreen email={blockedEmail} onSignOut={signOut} />;
  if (needsReAuth && !isSignedIn) return (
    <div className="login-screen">
      <div className="login-mascot">🔑</div>
      <div className="login-title">Sessão Expirada</div>
      <div className="login-subtitle">
        Sua sessão com o Google foi encerrada.<br />Toque para reconectar.
      </div>
      <button className="login-btn" onClick={renewAuth}>
        <span className="login-btn-icon">🔄</span>
        Reconectar
      </button>
      <BuildVersion style={{ marginTop: '2rem' }} />
    </div>
  );
  if (!isSignedIn) return <LoginScreen onLogin={signIn} />;

  // ── App principal ─────────────────────────────────────────

  if (view === "settings") {
    return (
      <ColorsConfigScreen
        colorsConfig={colorsConfig}
        onSave={saveColor}
        onRemove={removeColor}
        onBack={handleBackToMonth}
        onSignOut={handleSignOut}
        syncing={syncing}
      />
    );
  }

  return (
    <div className="app-root">
      {needsReAuth && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 350,
          background: 'rgba(58,26,62,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: '2rem', padding: '2rem 1.5rem',
            width: '100%', maxWidth: 360, textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
            fontFamily: "'Nunito', sans-serif",
          }}>
            <span style={{ fontSize: '2.5rem' }}>🔑</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3A1A3E', fontFamily: "'Baloo 2', cursive", margin: 0 }}>
              Sessão Google Expirada
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#8A5A9A', margin: 0, lineHeight: 1.5 }}>
              Toque em Reconectar para continuar usando o calendário.
            </p>
            <button
              style={{
                width: '100%', border: 'none', borderRadius: '1rem', padding: '0.9rem',
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem',
                background: 'linear-gradient(135deg, #C77DFF, #7B2FBE)', color: '#fff',
              }}
              onClick={renewAuth}
            >
              🔄 Reconectar
            </button>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div
          onClick={() => setShowExitConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(58,26,62,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: 'overlayIn 0.15s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '2rem 2rem 0 0',
              padding: '0 1.5rem 2.5rem', width: '100%', maxWidth: 480,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 -8px 40px rgba(199,125,255,0.2)',
              animation: 'sheetUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0d0f0', margin: '0.75rem 0 1rem', flexShrink: 0 }} />
            <span style={{ fontSize: '1.8rem' }}>🚪</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3A1A3E', fontFamily: "'Baloo 2', cursive", margin: '0.25rem 0 0.25rem', textAlign: 'center' }}>
              Sair do Calendário Mágico?
            </h3>
            <button
              style={{
                width: '100%', border: 'none', borderRadius: '1rem', padding: '0.9rem',
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.4rem',
                background: 'linear-gradient(135deg, #ff6b6b, #e03131)', color: '#fff',
              }}
              onClick={() => { setShowExitConfirm(false); window.history.go(-50); }}
            >
              Sim, sair
            </button>
            <button
              style={{
                width: '100%', border: 'none', borderRadius: '1rem', padding: '0.9rem',
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.25rem',
                background: '#f8f0ff', color: '#7B2FBE',
              }}
              onClick={() => setShowExitConfirm(false)}
            >
              Não, ficar
            </button>
          </div>
        </div>
      )}

      <div className="floating-layer" aria-hidden="true">
        {floatingEmojis.map((item) => (
          <span key={item.id} className="floating-emoji" style={{
            left: item.left,
            animationDelay: item.delay,
            animationDuration: item.duration,
            fontSize: item.size,
          }}>
            {item.emoji}
          </span>
        ))}
      </div>

      {view === "month" ? (
        <CalendarView
          currentDate={currentDate}
          events={events}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          onSignOut={handleSignOut}
          onOpenSettings={handleOpenSettings}
          dayColors={getRawDayColors()}
          dateKey={dateKey}
          colorsConfig={colorsConfig}
          todayPulse={todayPulse}
        />
      ) : (
        <DayView
          date={selectedDate}
          events={events}
          onBack={handleBackToMonth}
          onAddEvent={() => handleOpenAddModal(selectedDate)}
          onDeleteEvent={deleteEvent}
          onUpdateEvent={updateEvent}
          onMoveOrCopyEvent={async (id, date, mode) => {
            await moveOrCopyEvent(id, date, mode);
            if (selectedDate) fetchEvents(selectedDate.getFullYear(), selectedDate.getMonth() + 1);
          }}
          dayColor={getDayColor(selectedDate)}
          colorsConfig={colorsConfig}
          onSetDayColor={(colorId) => setDayColor(selectedDate, colorId)}
          onCreateColorEvent={handleCreateColorEvent}
          onDeleteColorEvent={handleDeleteColorEvent}
          colorEventId={colorEventId}
        />
      )}

      {showAddModal && (
        <AddEventModal
          date={addForDate}
          onSave={handleAddEvent}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {view === "month" && (
        <>
          <button
            className="fab-add"
            onClick={() => handleOpenAddModal(new Date())}
            aria-label="Adicionar compromisso"
          >
            <span className="fab-plus">+</span>
            <span className="fab-label">Novo</span>
          </button>
          <button
            className="fab-today"
            onClick={handleGoToday}
            aria-label="Ir para hoje"
          >
            Hoje
          </button>
          <button
            className="fab-settings"
            onClick={handleOpenSettings}
            aria-label="Configurações"
          >
            ⚙️
          </button>
        </>
      )}
    </div>
  );
}

export default App;
