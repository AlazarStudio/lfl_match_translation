import { create } from "zustand";
import { connectLive, joinRoom, onLive, emit } from "../services/liveSocket";

const API_BASE = "https://backend.mlf09.ru";
const API_TM = `${API_BASE}/api/tournament-matches`;

export const useMatchEvents = create((set, get) => ({
  matchId: null,

  // данные команд
  team1: null, // { title, logo }
  team2: null, // { title, logo }

  // статус/таймер
  status: null,             // "SCHEDULED" | "LIVE" | "BREAK" | "FINISHED" ...
  clock: {
    phase: null,            // "H1" | "H2" | "HT" | ...
    half: null,             // 1 | 2
    halfMinutes: null,      // 15, 20, 45 ...
    isPaused: true,
    baseElapsedSec: 0,
    startedAt: null,        // timestamp (ms)
    addedSec: 0,
    serverTimestamp: null,
    formatted: "00:00",     // вычисляемая строка mm:ss
  },

  // счёт
  score1: 0,
  score2: 0,

  // последний показанный ивент + очередь
  lastEventRaw: null,
  lastEventUi: null,
  eventKey: 0,
  _eventQueue: [],
  _shownEventIds: new Set(),  // антидубликаты
  _queueLock: false,

  // ----------- ПУБЛИЧНЫЕ API стора -----------

  async init(matchId) {
    set({ matchId });

    // 1) Предзагрузка названий/логотипов + текущих значений счёта/событий (снапшот)
    try {
      const snap = await fetch(
        `${API_TM}/${matchId}?include=team1,team2,events`
      ).then((r) => r.json());
      const t1 = snap?.team1TT?.team;
      const t2 = snap?.team2TT?.team;

      set({
        team1: t1 ? { title: t1.title, logo: abs(t1.logo?.[0]) } : { title: "Команда 1", logo: null },
        team2: t2 ? { title: t2.title, logo: abs(t2.logo?.[0]) } : { title: "Команда 2", logo: null },
        score1: Number(snap?.team1Score || 0),
        score2: Number(snap?.team2Score || 0),
        status: snap?.status ?? null,
      });

      // заранее заполним антидубликаты уже существующими событиями
      if (Array.isArray(snap?.events)) {
        const ids = new Set(snap.events.map(e => e.id));
        set({ _shownEventIds: ids });
      }
    } catch (e) {
      console.warn("Не удалось загрузить снапшот матча", e);
    }

    // 2) SOCKET: подключение и вход в комнату
    const s = connectLive();
    joinRoom(`tmatch:${matchId}`);
    emit("tmatch:clock:get", { matchId }); // получить снимок часов

    // --- Подписки ---

    // Счёт
    const offScore = onLive("tmatch:score", (p) => {
      set({
        score1: Number(p?.team1Score || 0),
        score2: Number(p?.team2Score || 0),
      });
    });

    // Статус/частичные апдейты
    const offUpdate = onLive("tmatch:update", (p) => {
      if (p?.status) set({ status: p.status });
      if (typeof p?.team1Score !== "undefined") set({ score1: Number(p.team1Score) });
      if (typeof p?.team2Score !== "undefined") set({ score2: Number(p.team2Score) });
      // если бэк начнёт слать team1/team2 тут — можно обновлять:
      // if (p?.team1?.title || p?.team1?.logo) set({ team1: {...get().team1, ...normalizeTeam(p.team1)} });
      // if (p?.team2?.title || p?.team2?.logo) set({ team2: {...get().team2, ...normalizeTeam(p.team2)} });
    });

    // Часы
    const offClock = onLive("tmatch:clock", (c) => {
      const clock = {
        phase: c?.phase ?? null,
        half: c?.half ?? null,
        halfMinutes: c?.halfMinutes ?? null,
        isPaused: !!c?.isPaused,
        baseElapsedSec: Number(c?.baseElapsedSec || 0),
        startedAt: c?.startedAt || null,
        addedSec: Number(c?.addedSec || 0),
        serverTimestamp: c?.serverTimestamp || null,
      };
      set({ clock: { ...clock, formatted: fmtClock(clock) } });
    });

    // События
    const offEvCreated = onLive("tevent:created", (ev) => {
      // антидубликат
      const seen = get()._shownEventIds;
      if (seen.has(ev.id)) return;
      seen.add(ev.id);

      // положим в очередь
      const ui = normalizeEvent(ev);
      const q = get()._eventQueue.slice();
      q.push({ ev, ui });
      set({ _eventQueue: q });

      // запустим обработку очереди
      get()._drainQueue();
    });

    const offEvUpdated = onLive("tevent:updated", (ev) => {
      // если обновили последний — перегенерим UI
      const last = get().lastEventRaw;
      if (last && last.id === ev.id) {
        set({ lastEventRaw: ev, lastEventUi: normalizeEvent(ev) });
      }
    });

    const offEvDeleted = onLive("tevent:deleted", (ev) => {
      const last = get().lastEventRaw;
      if (last && last.id === ev.id) {
        set({ lastEventRaw: null, lastEventUi: null });
      }
    });

    // вернём функцию очистки (на случай ручного dispose)
    return () => { offScore(); offUpdate(); offClock(); offEvCreated(); offEvUpdated(); offEvDeleted(); };
  },

  // ручной показ события (можно вызывать из пульта, если потребуется)
  showEventManually(evPayload) {
    const ev = evPayload?.raw ? evPayload.raw : evPayload;
    const ui = evPayload?.ui ? evPayload.ui : normalizeEvent(ev);
    const q = get()._eventQueue.slice();
    q.push({ ev, ui });
    set({ _eventQueue: q });
    get()._drainQueue();
  },

  // вспомогательное: отдать текущий "режим" трансляции на основе статуса
  getModeFromStatus() {
    const st = get().status;
    if (st === "LIVE") return "score";
    if (st === "BREAK" || st === "HALF_TIME" || st === "PAUSED") return "break";
    if (st === "SCHEDULED" || st === "PENDING") return "waiting";
    if (st === "FINISHED") return "plug";
    return "none";
  },

  // ----------- приватные помощники стора -----------

  _drainQueue: async () => {
    if (get()._queueLock) return;
    set({ _queueLock: true });

    try {
      while (get()._eventQueue.length > 0) {
        const { ev, ui } = get()._eventQueue[0];

        // показать текущий элемент
        set((st) => ({
          lastEventRaw: ev,
          lastEventUi: ui,
          eventKey: st.eventKey + 1, // триггерим анимацию InfoBlockBottom
        }));

        // ждём пока SlideInOut покажет/спрячет (showForMs + выход)
        // подстрой под твой Timing: 5000ms + 500ms = 5500ms (запасом 5800)
        await sleep(5800);

        // убрать из очереди
        const rest = get()._eventQueue.slice(1);
        set({ _eventQueue: rest });
      }
    } finally {
      set({ _queueLock: false });
    }
  },
}));

// --- helpers ---

function abs(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE}${url}`;
}

function normalizeTeam(t) {
  if (!t) return {};
  return {
    title: t.title ?? undefined,
    logo: t.logo ? abs(Array.isArray(t.logo) ? t.logo[0] : t.logo) : undefined,
  };
}

function normalizeEvent(ev) {
  if (!ev) return null;
  const typeMap = {
    GOAL: "goal",
    YELLOW_CARD: "yellow",
    RED_CARD: "red",
    PENALTY: "penalty",
    PENALTY_MISSED: "penalty_missed",
    OWN_GOAL: "own_goal",
    ASSIST: "assist",
    SUBSTITUTION: "substitution",
  };
  const kind = typeMap[ev.type] || ev.type?.toLowerCase();

  return {
    kind,
    minute: ev.minute ?? null,
    teamTitle: ev?.tournamentTeam?.team?.title || "",
    teamLogo: abs(ev?.tournamentTeam?.team?.logo?.[0]),
    playerName: ev?.rosterItem?.player?.name || "",
    playerPhoto: abs(ev?.rosterItem?.player?.images?.[0]),
    assistName: ev?.assistRosterItem?.player?.name || null,
    raw: ev,
  };
}

function fmtClock(c) {
  // форматируем «бегущий» таймер, если не пауза
  const now = Date.now();
  const base = Number(c.baseElapsedSec || 0);
  const delta = !c.isPaused && c.startedAt ? Math.max(0, Math.floor((now - c.startedAt) / 1000)) : 0;
  const total = base + delta + Number(c.addedSec || 0);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
