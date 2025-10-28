import React from "react";
import { useMatchEvents } from "../../state/matchEvents";

export default function MatchClock() {
    const clock = useMatchEvents((s) => s.clock);
    if (!clock) return null;

    const label = getLabel(clock);
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,.65)",
            color: "#fff", fontWeight: 600, fontFamily: "monospace", fontSize: 24, minWidth: 90
        }}>
            {label}
        </div>
    );
}

function getLabel(c) {
    if (c.phase === "HT") return "Перерыв";
    if (c.phase === "FT") return "Окончен";
    let prefix = "";
    if (c.phase === "H1" || c.half === 1) prefix = "1 тайм ";
    else if (c.phase === "H2" || c.half === 2) prefix = "2 тайм ";
    const time = c.formatted || "00:00";
    return `${prefix}${time}${c.isPaused ? " ⏸" : ""}`;
}
