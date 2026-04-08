import React from "react";

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
    </div>
  );
};

export default LoginScreen;
