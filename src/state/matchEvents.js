import { create } from "zustand";
import { connectLive, joinRoom, onLive, emit } from "../services/liveSocket";

const API_BASE = "https://backend.mlf09.ru";

export const useMatchEvents = create((set, get) => ({
    matchId: null,

    // счёт
    score1: 0,
    score2: 0,

    // последний пришедший евент (raw) и нормализованная версия для UI
    lastEventRaw: null,
    lastEventUi: null,

    // триггер для SlideInOut
    eventKey: 0,

    // инициализация подписки
    init(matchId) {
        set({ matchId });

        const s = connectLive();
        joinRoom(`tmatch:${matchId}`);

        // запросим часы на старте (не обязательно, но пусть будет)
        emit("tmatch:clock:get", { matchId });

        // Счёт
        const offScore = onLive("tmatch:score", (p) => {
            set({
                score1: Number(p?.team1Score || 0),
                score2: Number(p?.team2Score || 0),
            });
        });

        // Любой созданный евент
        const offEvCreated = onLive("tevent:created", (ev) => {
            const ui = normalizeEvent(ev);
            set((st) => ({
                lastEventRaw: ev,
                lastEventUi: ui,
                eventKey: st.eventKey + 1,   // <-- дёргаем анимацию
            }));
        });

        // Можно подписать и на обновление/удаление, если надо
        const offEvUpdated = onLive("tevent:updated", (ev) => {
            // если обновили последний показанный — перегенерим UI
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

        // вернём функцию очистки (если понадобится)
        return () => { offScore(); offEvCreated(); offEvUpdated(); offEvDeleted(); };
    },
}));

function abs(url) {
    if (!url) return null;
    if (/^https?:\/\//.test(url)) return url;
    return `${API_BASE}${url}`;
}

// Преобразуем payload бэка в компактную модель для InfoBlockBottom
function normalizeEvent(ev) {
    if (!ev) return null;

    const typeMap = {
        GOAL: "goal",
        YELLOW_CARD: "yellow",
        RED_CARD: "red",
        PENALTY: "penalty",
        PENALTY_MISSED: "penalty_missed",
    };

    const kind = typeMap[ev.type] || ev.type?.toLowerCase();
    const minute = ev.minute ?? null;

    const teamTitle = ev?.tournamentTeam?.team?.title || "";
    const teamLogo = abs(ev?.tournamentTeam?.team?.logo?.[0]);
    const playerName = ev?.rosterItem?.player?.name || "";
    const playerPhoto = abs(ev?.rosterItem?.player?.images?.[0]);
    const assistName = ev?.assistRosterItem?.player?.name || null;

    return {
        kind,                 // 'goal' | 'yellow' | 'red' | 'penalty' | 'penalty_missed' | ...
        minute,               // число
        teamTitle,            // "ФК Ветерок"
        teamLogo,             // абсолютный url
        playerName,           // "Агержаноков Азамат"
        playerPhoto,          // абсолютный url
        assistName,           // если есть
        raw: ev,              // если где-то понадобится
    };
}
