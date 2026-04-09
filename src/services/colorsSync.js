// ============================================================
// colorsSync — sincroniza configuração de cores no Google Calendar
// ============================================================
// Estratégia: evento especial com título fixo "__colors_config__"
// A configuração é armazenada na description do evento como JSON.
// O evento é marcado como dia inteiro em 1970-01-01 (invisível na prática).
// ============================================================

const CONFIG_EVENT_TITLE = "__colors_config__";
const CONFIG_EVENT_DATE  = "1970-01-01"; // data fixa, não aparece no calendário normal

// Busca o evento de config no calendário
async function findConfigEvent(calendarId) {
  try {
    const res = await window.gapi.client.calendar.events.list({
      calendarId,
      q: CONFIG_EVENT_TITLE,
      showDeleted: false,
      singleEvents: true,
      maxResults: 5,
    });
    const items = res.result.items || [];
    return items.find((ev) => ev.summary === CONFIG_EVENT_TITLE) ?? null;
  } catch {
    return null;
  }
}

// Lê as cores do Google Calendar (retorna array ou null se não encontrado)
export async function loadColorsFromServer(calendarId) {
  if (!calendarId) return null;
  const ev = await findConfigEvent(calendarId);
  if (!ev) return null;
  try {
    return JSON.parse(ev.description || "[]");
  } catch {
    return null;
  }
}

// Salva as cores no Google Calendar (cria ou atualiza o evento de config)
export async function saveColorsToServer(calendarId, colorsConfig) {
  if (!calendarId) return;
  const ev = await findConfigEvent(calendarId);
  const resource = {
    summary:     CONFIG_EVENT_TITLE,
    description: JSON.stringify(colorsConfig),
    start:       { date: CONFIG_EVENT_DATE },
    end:         { date: CONFIG_EVENT_DATE },
    visibility:  "private",
  };

  if (ev) {
    await window.gapi.client.calendar.events.update({
      calendarId,
      eventId: ev.id,
      resource,
    });
  } else {
    await window.gapi.client.calendar.events.insert({
      calendarId,
      resource,
    });
  }
}
