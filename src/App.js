import React, { useState, useEffect, useCallback } from "react";
import useGoogleCalendar from "./hooks/useGoogleCalendar";
import { useDayColors } from "./hooks/useDayColors";
import CalendarView from "./components/CalendarView";
import DayView from "./components/DayView";
import AddEventModal from "./components/AddEventModal";
import LoginScreen from "./components/LoginScreen";
import PinScreen, { isPinSessionValid, clearPinSession } from "./components/PinScreen";
import BlockedScreen from "./components/BlockedScreen";
import ErrorScreen from "./components/ErrorScreen";
import { BUILD_API_KEY, BUILD_CLIENT_ID } from "./googleConfig";
import "./App.css";

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState("month");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForDate, setAddForDate] = useState(null);
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // ── Camada 1: PIN ─────────────────────────────────────────
  // true  → PIN já foi validado nesta sessão (ou sessionStorage ainda válido)
  // false → precisa mostrar a tela de PIN
  const [pinUnlocked, setPinUnlocked] = useState(() => isPinSessionValid());

  const {
    isSignedIn,
    isLoading,
    error,
    events,
    blockedEmail,   // Camada 2: e-mail não autorizado
    signIn,
    signOut,
    addEvent,
    deleteEvent,
    fetchEvents,
  } = useGoogleCalendar();

  const { getColor, setColor, getRawColors, dateKey } = useDayColors();

  // Emojis flutuantes decorativos
  useEffect(() => {
    const emojis = ["⭐","🌈","🦄","🌸","🍭","✨","🎀","🌺","💫","🎈"];
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      left: `${Math.random() * 90}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${12 + Math.random() * 8}s`,
      size: `${1.2 + Math.random() * 1.2}rem`,
    }));
    setFloatingEmojis(items);
  }, []);

  const handleDayPress = useCallback((date) => {
    setSelectedDate(date);
    setView("day");
    fetchEvents(date.getFullYear(), date.getMonth() + 1);
    // Empurra estado no histórico para o back do browser funcionar
    window.history.pushState({ view: 'day' }, '');
  }, [fetchEvents]);

  const handleBackToMonth = useCallback(() => {
    setView("month");
    setSelectedDate(null);
  }, []);

  // Intercepta o back do browser
  useEffect(() => {
    const onPopState = (e) => {
      if (view === 'day') {
        // Back no DayView → volta pro calendário
        handleBackToMonth();
      } else {
        // Back no calendário → não faz nada, re-empurra o estado
        window.history.pushState(null, '');
      }
    };
    window.addEventListener('popstate', onPopState);
    // Garante que sempre há um estado no histórico para interceptar
    window.history.replaceState(null, '');
    return () => window.removeEventListener('popstate', onPopState);
  }, [view, handleBackToMonth]);

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

  // Logout também limpa a sessão de PIN
  const handleSignOut = useCallback(async () => {
    clearPinSession();
    setPinUnlocked(false);
    await signOut();
  }, [signOut]);

  // ── Guards de renderização ─────────────────────────────────

  // 1. Carregando
  if (isLoading) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-emoji">🌟</div>
          <div className="splash-title">Calendário Mágico</div>
          <div className="splash-dots"><span /><span /><span /></div>
        </div>
      </div>
    );
  }

  // 2. Erro de configuração
  if (error) {
    return (
      <ErrorScreen
        error={error}
        buildApiKey={BUILD_API_KEY}
        buildClientId={BUILD_CLIENT_ID}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // 3. Camada 1 — PIN
  if (!pinUnlocked) {
    return <PinScreen onUnlock={() => setPinUnlocked(true)} />;
  }

  // 4. Camada 2 — E-mail bloqueado
  if (blockedEmail) {
    return <BlockedScreen email={blockedEmail} onSignOut={signOut} />;
  }

  // 5. Login Google ainda não feito
  if (!isSignedIn) {
    return <LoginScreen onLogin={signIn} />;
  }

  // 6. App principal
  return (
    <div className="app-root">
      <div className="floating-layer" aria-hidden="true">
        {floatingEmojis.map((item) => (
          <span
            key={item.id}
            className="floating-emoji"
            style={{
              left: item.left,
              animationDelay: item.delay,
              animationDuration: item.duration,
              fontSize: item.size,
            }}
          >
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
          dayColors={getRawColors()}
          dateKey={dateKey}
        />
      ) : (
        <DayView
          date={selectedDate}
          events={events}
          onBack={handleBackToMonth}
          onAddEvent={() => handleOpenAddModal(selectedDate)}
          onDeleteEvent={deleteEvent}
          dayColor={getColor(selectedDate)}
          onSetDayColor={(val) => setColor(selectedDate, val)}
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
        <button
          className="fab-add"
          onClick={() => handleOpenAddModal(new Date())}
          aria-label="Adicionar compromisso"
        >
          <span className="fab-plus">+</span>
          <span className="fab-label">Novo</span>
        </button>
      )}
    </div>
  );
}

export default App;
