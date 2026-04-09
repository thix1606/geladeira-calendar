import React from "react";

export const BUILD_SHA  = process.env.REACT_APP_BUILD_SHA
  ? process.env.REACT_APP_BUILD_SHA.slice(0, 7)
  : 'dev';

export const BUILD_DATE = process.env.REACT_APP_BUILD_DATE
  ? new Date(process.env.REACT_APP_BUILD_DATE).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
  : 'local';

// dark=true para telas com fundo claro (ErrorScreen)
const BuildVersion = ({ dark = false, style = {} }) => (
  <div style={{
    textAlign: 'center',
    fontSize: '0.65rem',
    color: dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)',
    letterSpacing: '0.04em',
    userSelect: 'none',
    padding: '6px 0 4px',
    ...style,
  }}>
    build {BUILD_SHA} · {BUILD_DATE}
  </div>
);

export default BuildVersion;
