import React from "react";

const BUILD_SHA  = process.env.REACT_APP_BUILD_SHA  ? process.env.REACT_APP_BUILD_SHA.slice(0, 7)  : 'dev';
const BUILD_DATE = process.env.REACT_APP_BUILD_DATE
  ? new Date(process.env.REACT_APP_BUILD_DATE).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
  : 'local';

const LoginScreen = ({ onLogin }) => {
  return (
    <div className="login-screen">
      <div className="login-mascot">🦄</div>
      <div className="login-title">
        Meu Calendário<br />Mágico ✨
      </div>
      <p className="login-subtitle">
        Aqui você organiza<br />
        seus dias mais especiais! 🌈
      </p>
      <button className="login-btn" onClick={onLogin}>
        <span className="login-btn-icon">🚀</span>
        Entrar com Google
      </button>
      <p style={{
        marginTop: '2rem',
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.04em',
        userSelect: 'none',
      }}>
        build {BUILD_SHA} · {BUILD_DATE}
      </p>
    </div>
  );
};

export default LoginScreen;
