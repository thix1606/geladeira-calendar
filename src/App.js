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

  const [pinUnlocked, setPinUnlocked] = useState(() => isPinSessionValid());

  const {
    isSignedIn, isLoading, error, events, calendarId,
    blockedEmail, signIn, signOut, addEvent, deleteEvent, updateEvent, moveOrCopyEvent, fetchEvents,
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
  useEffect(() => { viewRef.current      = view;         }, [view]);
  useEffect(() => { showModalRef.current = showAddModal; }, [showAddModal]);

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
      if (viewRef.current === "day" || viewRef.current === "settings") {
        handleBackToMonth();
      }
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
  if (!isSignedIn)  return <LoginScreen onLogin={signIn} />;

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
