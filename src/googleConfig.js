// =============================================================
// CONFIGURAÇÃO DO GOOGLE CALENDAR API
// =============================================================
// As credenciais são lidas do arquivo .env na raiz do projeto.
// NUNCA coloque valores reais diretamente aqui.
// Copie .env.example para .env e preencha com suas credenciais.
// =============================================================

// Credenciais do build (injetadas pelo CI)
export const BUILD_API_KEY   = process.env.REACT_APP_GOOGLE_API_KEY   || process.env.REACT_APP_API_KEY   || null;
export const BUILD_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.REACT_APP_CLIENT_ID || null;

// Override manual salvo pelo usuário via ErrorScreen tem prioridade
const GOOGLE_CONFIG = {
  API_KEY:   (typeof localStorage !== 'undefined' && localStorage.getItem('gc_override_api_key'))   || BUILD_API_KEY,
  CLIENT_ID: (typeof localStorage !== 'undefined' && localStorage.getItem('gc_override_client_id')) || BUILD_CLIENT_ID,

  CALENDAR_NAME: "Calendário Mágico ⭐",
  TIMEZONE:      "America/Sao_Paulo",
  SCOPES:        "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
  DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],

  PIN:               process.env.REACT_APP_PIN,
  PIN_SESSION_HOURS: 12,

  // Suporta múltiplos e-mails separados por vírgula no .env
  // Ex: REACT_APP_ALLOWED_EMAILS=a@gmail.com,b@gmail.com
  ALLOWED_EMAILS: (process.env.REACT_APP_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean),
};

export default GOOGLE_CONFIG;
