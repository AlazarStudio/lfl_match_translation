// src/DevLiveProbe.jsx
import React, { useEffect, useState } from "react";
import { connectLive, joinRoom, onLive, requestClock, emit } from "./services/liveSocket";

export default function DevLiveProbe() {
    const params = new URLSearchParams(location.search);
    const matchId = Number(params.get("matchId") || 5);

    const [log, setLog] = useState(["init…"]);
    const push = (line) => setLog((p) => [ts() + " " + line, ...p].slice(0, 120));

    useEffect(() => {
        const s = connectLive();
        push("connecting…");

        const off = [
            onLive("tmatch:clock", (st) => push("clock " + j(st))),
            onLive("tmatch:update", (p) => push("update " + j(p))),
            onLive("tmatch:status", (p) => push("status " + j(p))),
            onLive("tmatch:score", (p) => push("score " + j(p))),
            onLive("tevent:created", (e) => push("event+ " + j(e))),
            onLive("tevent:updated", (e) => push("event~ " + j(e))),
            onLive("tevent:deleted", (e) => push("event- " + j(e))),
            onLive("tparticipants:updated", (rows) => push("participants " + (rows?.length ?? 0))),
            onLive("treferees:updated", (rows) => push("referees " + (rows?.length ?? 0))),
        ];

        s.on("connect", () => push("socket connected"));
        s.on("connect_error", (e) => push("connect_error " + (e?.message || e)));
        s.on("disconnect", (r) => push("socket disconnected " + r));

        return () => off.forEach(fn => fn());
    }, []);

    const join = () => {
        joinRoom(`tmatch:${matchId}`);
        push(`join room tmatch:${matchId}`);
        requestClock(matchId);
        push("emit tmatch:clock:get");
    };

    return (
        <div style={{ padding: 12, fontFamily: "ui-monospace, monospace" }}>
            <b>Live probe for match #{matchId}</b>
            <div style={{ margin: "8px 0", display: "flex", gap: 8 }}>
                <button onClick={join}>Join room</button>
                <button onClick={() => { requestClock(matchId); push("emit tmatch:clock:get"); }}>
                    Request clock
                </button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap" }}>{log.join("\n")}</pre>
            <p style={{ color: "#888" }}>Подсказка: DevTools → Console покажет «[live] ANY: …»</p>
        </div>
    );
}

function j(v) { try { return JSON.stringify(v); } catch { return String(v); } }
function ts() { return new Date().toLocaleTimeString(); }
