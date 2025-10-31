// src/pages/LineupTest.jsx
import React, { useEffect, useState } from "react";
import {
  connectLive,
  joinRoom,
  requestLineups,
  onLineup,
} from "../../services/liveSocket"; // поправь путь

export default function LineupTest({MATCH_ID}) {
  const [matchId, setMatchId] = useState(MATCH_ID);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    // 1) коннектимся
    connectLive();
  }, []);

  useEffect(() => {
    if (!matchId) return;

    
    // 2) заходим в комнату матча (если это у вас обязательно)
    joinRoom(`tmatch:${matchId}`);
    
    // 3) подписка именно в ЭТОЙ компоненте
    const off = onLineup((lu) => {
      console.log("[LineupTest] got lineup:", lu);
      setPayload(lu);
    });

    // 4) и ТУТ ЖЕ просим сервер прислать состав
    requestLineups(matchId);

    return () => {
      off && off();
    };
  }, [matchId]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Проверка составов (tmatch:lineup)</h2>

      <label>
        Match ID:{" "}
        <input
          type="number"
          value={matchId}
          onChange={(e) => setMatchId(Number(e.target.value) || 0)}
        />
      </label>
      <button onClick={() => requestLineups(matchId)} style={{ marginLeft: 8 }}>
        Запросить ещё раз
      </button>

      <pre style={{ background: "#111", color: "#fff", padding: 12, marginTop: 20 }}>
        {payload ? JSON.stringify(payload, null, 2) : "— пока ничего не пришло —"}
      </pre>

      {payload?.team1 ? (
        <>
          <h3>Team1 (ttId: {payload.team1.ttId})</h3>
          <ul>
            {(payload.team1.list || []).map((p) => (
              <li key={p.rosterItemId || p.playerId || p.number}>
                #{p.number} {p.name} ({p.role}) {p.isCaptain ? "C" : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {payload?.team2 ? (
        <>
          <h3>Team2 (ttId: {payload.team2.ttId})</h3>
          <ul>
            {(payload.team2.list || []).map((p) => (
              <li key={p.rosterItemId || p.playerId || p.number}>
                #{p.number} {p.name} ({p.role}) {p.isCaptain ? "C" : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
