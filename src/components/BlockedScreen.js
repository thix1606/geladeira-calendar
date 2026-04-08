import React from "react";

const BlockedScreen = ({ email, onSignOut }) => {
  return (
    <div className="blocked-screen">
      <div className="blocked-mascot">🚫</div>
      <div className="blocked-title">Acesso negado</div>
      <p className="blocked-msg">
        A conta <strong>{email}</strong> não tem permissão para usar este app.
      </p>
      <p className="blocked-hint">
        Peça ao responsável para adicionar seu e-mail na lista de autorizados.
      </p>
      <button className="login-btn" style={{ marginTop: 8 }} onClick={onSignOut}>
        <span>↩️</span> Trocar de conta
      </button>
    </div>
  );
};

export default BlockedScreen;
