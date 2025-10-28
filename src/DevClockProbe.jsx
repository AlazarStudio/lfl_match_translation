import React, { useEffect, useState } from "react";
import { connectLive, joinRoom, onLive, requestClock } from "./services/liveSocket";

// ВРЕМЕННЫЙ ПРОБНИК. Открой /clock?matchId=7
export default function DevClockProbe() {
  const params = new URLSearchParams(location.search);
  const matchId = Number(params.get("matchId") || 7);

  const [lastClock, setLastClock] = useState(null);
  const [label, setLabel] = useState("00:00");

  useEffect(() => {
    // 1) подключаем сокет
    connectLive();

    // 2) заходим в комнату матча
    joinRoom(`tmatch:${matchId}`);

    // 3) слушаем clock
    const off = onLive("tmatch:clock", (c) => {
      // Сохраним сырые данные и пересчитаем красивую строку времени
      setLastClock(c);
      setLabel(formatClock(c));
      console.log("CLOCK EVENT:", c);
    });

    // 4) запросим снимок часов у бэка
    requestClock(matchId);

    return () => off();
  }, [matchId]);

  return (
    <div style={{ padding: 16, fontFamily: "ui-monospace, monospace" }}>
      <h3>Clock probe · match #{matchId}</h3>
      <div style={{ fontSize: 28, fontWeight: 700, margin: "10px 0" }}>
        {prettyPhase(lastClock)} {label} {lastClock?.isPaused ? "⏸" : ""}
      </div>
      <pre style={{ whiteSpace: "pre-wrap", color: "#666" }}>
        {lastClock ? JSON.stringify(lastClock, null, 2) : "Жду clock…"}
      </pre>
      <div style={{marginTop:8}}>
        <button onClick={() => requestClock(matchId)}>Request clock</button>
      </div>
    </div>
  );
}

// --- помощники ---

function formatClock(c) {
  if (!c) return "00:00";
  const now = Date.now();
  const base = Number(c.baseElapsedSec || 0);
  const runningSec = (!c.isPaused && c.startedAt) ? Math.max(0, Math.floor((now - c.startedAt) / 1000)) : 0;
  const total = base + runningSec + Number(c.addedSec || 0);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function prettyPhase(c) {
  if (!c) return "";
  if (c.phase === "HT") return "Перерыв";
  if (c.phase === "FT") return "Окончен";
  if (c.phase === "H1" || c.half === 1) return "1 тайм";
  if (c.phase === "H2" || c.half === 2) return "2 тайм";
  return "";
}
