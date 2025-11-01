// src/services/matches.js
const API_BASE = "https://backend.mlf09.ru";

export async function fetchAllMatchesFromAllTournaments() {
    // 1. берём список турниров
    const res = await fetch(`${API_BASE}/api/tournaments`);
    const data = await res.json();
    const tournaments = Array.isArray(data) ? data : data.rows || [];

    const allMatches = [];

    // 2. для каждого турнира запрашиваем его матчи
    for (const t of tournaments) {
        try {
            const r = await fetch(`${API_BASE}/api/tournaments/${t.id}/matches`);
            const mData = await r.json();
            // бэк иногда шлёт массив, иногда { rows: [] }
            const matches = Array.isArray(mData) ? mData : mData.rows || [];

            // 3. докладываем в общий список + приклеиваем инфу о турнире
            matches.forEach((m) => {
                allMatches.push({
                    ...m,
                    _tournament: {
                        id: t.id,
                        title: t.title,
                    },
                });
            });
        } catch (e) {
            console.warn("Не смогли загрузить матчи турнира", t.id, e);
        }
    }

    return allMatches;
}
