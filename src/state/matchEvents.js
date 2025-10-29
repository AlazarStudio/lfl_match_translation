import { create } from "zustand";
import {
  connectLive, joinRoom, onLive, emit,
  onOverlay, overlayGet,
  requestLineups, onLineup
} from "../services/liveSocket";

const API_BASE = "https://backend.mlf09.ru";
const API_TM = `${API_BASE}/api/tournament-matches`;

export const useMatchEvents = create((set, get) => ({
  matchId: null,
  // дефолт — чтобы страница не была пустой до прихода состояния
  overlay: { OpenScore: false, OpenWaiting: false, OpenBreak: false, ShowPlug: false, ShowSostav: false },
  // удобные методы для страницы/пульта
  setOverlayKey(key, value) {
    const matchId = get().matchId;
    if (!matchId) return;
    // локально оптимистично обновим
    set({ overlay: { ...(get().overlay || {}), [key]: value } });
    // отправим на бэк
    import("../services/liveSocket").then(({ overlaySet }) => overlaySet(matchId, { [key]: value }));
  },
  toggleOverlayKey(key) {
    const matchId = get().matchId;
    if (!matchId) return;
    import("../services/liveSocket").then(({ overlayToggle }) => overlayToggle(matchId, key));
  },

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
    startedAt: null,        // server timestamp (ms)
    addedSec: 0,
    serverTimestamp: null,  // server "now" (ms)
    formatted: "00:00",
  },
  _clockTimerId: null,      // setInterval id
  _clockOffsetMs: 0,        // Date.now() - serverNow

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

    // 1) Предзагрузка снапшота
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

      if (Array.isArray(snap?.events)) {
        const ids = new Set(snap.events.map(e => e.id));
        set({ _shownEventIds: ids });
      }
    } catch (e) {
      console.warn("Не удалось загрузить снапшот матча", e);
    }

    // 2) SOCKET
    connectLive();
    joinRoom(`tmatch:${matchId}`);
    emit("tmatch:clock:get", { matchId }); // получить снимок часов

    // --- Подписки ---

    const offOverlay = onOverlay((state) => {
      set({ overlay: state || {} })
    });

    overlayGet(matchId);
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
      // if (p?.team1) set({ team1: { ...get().team1, ...normalizeTeam(p.team1) }});
      // if (p?.team2) set({ team2: { ...get().team2, ...normalizeTeam(p.team2) }});
    });

    // Часы: обновляем offset и formatted
    const offClock = onLive("tmatch:clock", (c) => {
      const serverNow = Number(c?.serverTimestamp || 0);
      const offset = serverNow ? (Date.now() - serverNow) : 0; // клиентское - серверное
      const clock = {
        phase: c?.phase ?? null,
        half: c?.half ?? null,
        halfMinutes: c?.halfMinutes ?? null,
        isPaused: !!c?.isPaused,
        baseElapsedSec: Number(c?.baseElapsedSec || 0),
        startedAt: c?.startedAt || null,     // server ms
        addedSec: Number(c?.addedSec || 0),
        serverTimestamp: serverNow || null,
      };

      set({
        _clockOffsetMs: offset,
        clock: { ...clock, formatted: fmtClock(clock, offset) },
      });
    });

    // Локальный «тик», чтобы время бежало между пушами
    const startTick = () => {
      const prev = get()._clockTimerId;
      if (prev) clearInterval(prev);

      const id = setInterval(() => {
        const { clock, _clockOffsetMs } = get();
        if (!clock) return;

        const next = fmtClock(clock, _clockOffsetMs);
        if (next !== clock.formatted) {
          set({ clock: { ...clock, formatted: next } });
        }
      }, 250); // 4 раза в секунду — плавно, без лишних ререндеров

      set({ _clockTimerId: id });
    };
    startTick();

    // События
    const offEvCreated = onLive("tevent:created", (ev) => {
      const seen = get()._shownEventIds;
      if (seen.has(ev.id)) return;
      seen.add(ev.id);

      const ui = normalizeEvent(ev);
      const q = get()._eventQueue.slice();
      q.push({ ev, ui });
      set({ _eventQueue: q });
      get()._drainQueue();
    });

    const offEvUpdated = onLive("tevent:updated", (ev) => {
      const last = get().lastEventRaw;
      if (last && last.id === ev.id) {
        set({ lastEventRaw: ev, lastEventUi: normalizeEvent(ev) });
      }
    });

    const offEvDeleted = onLive("tevent:deleted", (ev) => {
      const last = get().lastEventRaw;
      if (last && last.id === ev.id) set({ lastEventRaw: null, lastEventUi: null });
    });

    // 6) НОВОЕ: Составы (по сокету)
    const offLineup = onLineup(({ team1, team2 }) => {
      // ожидается структура от бэка: { team1: { title, list: [...] }, team2: { title, list: [...] } }
      const t1 = normalizeIncomingTeam(team1);
      const t2 = normalizeIncomingTeam(team2);

      set((st) => ({
        team1: { ...(st.team1 || {}), ...t1 },
        team2: { ...(st.team2 || {}), ...t2 },
      }));
    });

    // сразу попросим сервер прислать составы
    requestLineups(matchId);
    // cleanup
    return () => {
      offScore(); offUpdate(); offClock(); offEvCreated(); offEvUpdated(); offEvDeleted(); offOverlay && offOverlay();
      const id = get()._clockTimerId;
      if (id) { clearInterval(id); set({ _clockTimerId: null }); }
    };
  },

  // ручной показ события (например, с пульта)
  showEventManually(evPayload) {
    const ev = evPayload?.raw ? evPayload.raw : evPayload;
    const ui = evPayload?.ui ? evPayload.ui : normalizeEvent(ev);
    const q = get()._eventQueue.slice();
    q.push({ ev, ui });
    set({ _eventQueue: q });
    get()._drainQueue();
  },

  // режим трансляции на основе статуса
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

        set((st) => ({
          lastEventRaw: ev,
          lastEventUi: ui,
          eventKey: st.eventKey + 1,
        }));

        await sleep(5800); // showForMs(5000) + exitDelayMs(500) + запас

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

// учитываем смещение времени между клиентом и сервером
function fmtClock(c, offsetMs = 0) {
  const base = Number(c.baseElapsedSec || 0);
  const added = Number(c.addedSec || 0);

  let runningSec = 0;
  if (!c.isPaused && c.startedAt) {
    // «серверное сейчас» = Date.now() - offset
    const serverNow = Date.now() - offsetMs;
    runningSec = Math.max(0, Math.floor((serverNow - Number(c.startedAt)) / 1000));
  }

  const total = base + runningSec + added;
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalizeIncomingTeam(raw) {
  if (!raw) return { title: "", lineup: [] };
  const title = raw.title ?? "";
  const list = Array.isArray(raw.list) ? raw.list : [];

  const lineup = list.map((p) => ({
    id: p.id ?? `${p.playerId || ""}-${p.number || ""}`,
    num: p.number ?? p.num ?? null,
    name: p.name || p.player?.name || "",
    short: shortName(p.name || p.player?.name || ""),
    photo: abs(p.photo || p.player?.images?.[0]),
    pos: p.position || p.player?.position || null,
  }));

  return { title, lineup };
}

function shortName(name) {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
  return name;
}
