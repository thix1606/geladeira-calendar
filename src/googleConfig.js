// =============================================================
// CONFIGURAÇÃO DO GOOGLE CALENDAR API
// =============================================================
// As credenciais são lidas do arquivo .env na raiz do projeto.
// NUNCA coloque valores reais diretamente aqui.
// Copie .env.example para .env e preencha com suas credenciais.
// =============================================================

const GOOGLE_CONFIG = {
  API_KEY:   process.env.REACT_APP_API_KEY,
  CLIENT_ID: process.env.REACT_APP_CLIENT_ID,

  CALENDAR_NAME: "Calendário Mágico ⭐",
  TIMEZONE:      "America/Sao_Paulo",
  SCOPES:        "https://www.googleapis.com/auth/calendar",
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
