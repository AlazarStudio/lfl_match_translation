// src/state/matchEvents.js
import { create } from "zustand";
import {
  connectLive,
  joinRoom,
  onLive,
  emit,
  onOverlay,
  overlayGet,
  requestLineups,
  onLineup,
} from "../services/liveSocket";

const API_BASE = "https://backend.mlf09.ru";
const API_TM = `${API_BASE}/api/tournament-matches`;

export const useMatchEvents = create((set, get) => ({
  matchId: null,
  overlay: null,

  // команды
  team1: null, // { title, logo, lineup? }
  team2: null, // { title, logo, lineup? }

  // статус/таймер
  status: null,
  clock: {
    phase: null,
    half: null,
    halfMinutes: null,
    isPaused: true,
    baseElapsedSec: 0,
    startedAt: null,
    addedSec: 0,
    serverTimestamp: null,
    formatted: "00:00",
  },
  _clockTimerId: null,
  _clockOffsetMs: 0,

  // счёт
  score1: 0,
  score2: 0,

  // события
  lastEventRaw: null,
  lastEventUi: null,
  eventKey: 0,
  _eventQueue: [],
  _shownEventIds: new Set(),
  _queueLock: false,

  // ==== ИНИТ =====
  async init(matchId) {
    set({ matchId });

    // 1) снапшот по REST
    try {
      const snap = await fetch(
        `${API_TM}/${matchId}?include=team1,team2,events`
      ).then((r) => r.json());
      const t1 = snap?.team1TT?.team;
      const t2 = snap?.team2TT?.team;

      set({
        team1: t1
          ? { title: t1.title, logo: abs(t1.logo?.[0]) }
          : { title: "Команда 1", logo: null },
        team2: t2
          ? { title: t2.title, logo: abs(t2.logo?.[0]) }
          : { title: "Команда 2", logo: null },
        score1: Number(snap?.team1Score || 0),
        score2: Number(snap?.team2Score || 0),
        status: snap?.status ?? null,
      });

      if (Array.isArray(snap?.events)) {
        const ids = new Set(snap.events.map((e) => e.id));
        set({ _shownEventIds: ids });
      }
    } catch (e) {
      console.warn("Не удалось загрузить снапшот матча", e);
    }

    // 2) сокеты
    connectLive();
    joinRoom(`tmatch:${matchId}`);
    emit("tmatch:clock:get", { matchId });
    overlayGet(matchId);

    // overlay
    const offOverlay = onOverlay((state) => {
      set({ overlay: state || {} });
    });

    // счёт
    const offScore = onLive("tmatch:score", (p) => {
      set({
        score1: Number(p?.team1Score || 0),
        score2: Number(p?.team2Score || 0),
      });
    });

    // обновление матча
    const offUpdate = onLive("tmatch:update", (p) => {
      if (p?.status) set({ status: p.status });
      if (typeof p?.team1Score !== "undefined")
        set({ score1: Number(p.team1Score) });
      if (typeof p?.team2Score !== "undefined")
        set({ score2: Number(p.team2Score) });
    });

    // clock
    const offClock = onLive("tmatch:clock", (c) => {
      const serverNow = Number(c?.serverTimestamp || 0);
      const offset = serverNow ? Date.now() - serverNow : 0;
      const clock = {
        phase: c?.phase ?? null,
        half: c?.half ?? null,
        halfMinutes: c?.halfMinutes ?? null,
        isPaused: !!c?.isPaused,
        baseElapsedSec: Number(c?.baseElapsedSec || 0),
        startedAt: c?.startedAt || null,
        addedSec: Number(c?.addedSec || 0),
        serverTimestamp: serverNow || null,
      };
      set({
        _clockOffsetMs: offset,
        clock: { ...clock, formatted: fmtClock(clock, offset) },
      });
    });

    // локальный тик
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
      }, 250);
      set({ _clockTimerId: id });
    };
    startTick();

    // события
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
      if (last && last.id === ev.id)
        set({ lastEventRaw: null, lastEventUi: null });
    });

    // ===== НОВОЕ: составы =====
    // 1. подписываемся
    const offLineup = onLineup((lu) => {
      // lu: { matchId, team1: { ttId, list: [...] }, team2: { ... } }
      const st = get();
      const t1 = st.team1 || { title: "Команда 1", logo: null };
      const t2 = st.team2 || { title: "Команда 2", logo: null };

      const lineup1 = Array.isArray(lu?.team1?.list)
        ? lu.team1.list.map(toPlayer)
        : [];
      const lineup2 = Array.isArray(lu?.team2?.list)
        ? lu.team2.list.map(toPlayer)
        : [];

      set({
        team1: { ...t1, lineup: lineup1 },
        team2: { ...t2, lineup: lineup2 },
      });
    });

    // 2. сразу попросим у сервера состав
    requestLineups(matchId);

    // cleanup
    return () => {
      offOverlay && offOverlay();
      offScore && offScore();
      offUpdate && offUpdate();
      offClock && offClock();
      offEvCreated && offEvCreated();
      offEvUpdated && offEvUpdated();
      offEvDeleted && offEvDeleted();
      offLineup && offLineup();
      const id = get()._clockTimerId;
      if (id) {
        clearInterval(id);
        set({ _clockTimerId: null });
      }
    };
  },

  // локальное изменение overlay (если надо)
  setOverlayKey(key, val) {
    set((st) => ({
      overlay: { ...(st.overlay || {}), [key]: val },
    }));
  },
  toggleOverlayKey(key) {
    set((st) => {
      const cur = st.overlay?.[key];
      return {
        overlay: { ...(st.overlay || {}), [key]: !cur },
      };
    });
  },

  // очередь
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
        await sleep(5800);
        const rest = get()._eventQueue.slice(1);
        set({ _eventQueue: rest });
      }
    } finally {
      set({ _queueLock: false });
    }
  },
}));

// helpers
function abs(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE}${url}`;
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

function fmtClock(c, offsetMs = 0) {
  const base = Number(c.baseElapsedSec || 0);
  const added = Number(c.addedSec || 0);
  let runningSec = 0;
  if (!c.isPaused && c.startedAt) {
    const serverNow = Date.now() - offsetMs;
    runningSec = Math.max(
      0,
      Math.floor((serverNow - Number(c.startedAt)) / 1000)
    );
  }
  const total = base + runningSec + added;
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** переводим то, что прислал сокет по lineup, в то, что ждёт компонент */
function toPlayer(p) {
  // console.log(p)
  return {
    id: p.rosterItemId ?? p.playerId ?? Math.random(),
    num: p.number ?? "",
    name: p.name ?? "",
    short: shortName(p.name ?? ""),
    pos: p.position ?? "",
    role: p.role ?? "",
    isCaptain: !!p.isCaptain,
    photo: p.photo, // пока бэк фото сюда не кладёт
  };
}

function shortName(name) {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}. ${parts[1]}`;
  return name;
}
