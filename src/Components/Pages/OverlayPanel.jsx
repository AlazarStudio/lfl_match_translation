// src/pages/OverlayPanel.jsx
import React, { useEffect, useState } from "react";
import {
    connectLive,
    joinRoom,
    onOverlay,
    overlayGet,
    overlaySet,
} from "../../services/liveSocket";

// какие ключи управляем с пульта (взаимоисключаемые)
const OVERLAY_KEYS = [
    { key: "OpenScore", label: "Счёт + Спонсоры (OpenScore)" },
    { key: "OpenWaiting", label: "Экран ожидания (OpenWaiting)" },
    { key: "OpenBreak", label: "Перерыв (OpenBreak)" },
    { key: "ShowSostav", label: "Состав (ShowSostav)" },
    { key: "ShowPlug", label: "Заглушка (ShowPlug)" },
];
const EXCLUSIVE_KEYS = OVERLAY_KEYS.map(k => k.key);

export default function OverlayPanel() {
    const [matchId, setMatchId] = useState(7);
    const [overlay, setOverlay] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { connectLive(); }, []);

    useEffect(() => {
        if (!matchId) return;
        joinRoom(`tmatch:${matchId}`);

        const off = onOverlay((state) => setOverlay(state || {}));
        overlayGet(matchId);

        return () => { off && off(); };
    }, [matchId]);

    const isOn = (key) => !!(overlay && overlay[key]);

    // ВЗАИМНОЕ ИСКЛЮЧЕНИЕ:
    // если клик по уже включённой — выключаем все
    // если по выключенной — включаем только её, остальные OFF
    const handleExclusive = async (key) => {
        if (!matchId || busy) return;
        setBusy(true);
        try {
            const wantOn = !isOn(key);
            const patch = {};
            EXCLUSIVE_KEYS.forEach(k => { patch[k] = false; });
            if (wantOn) patch[key] = true;

            overlaySet(matchId, patch);
            overlayGet(matchId);
        } finally {
            setTimeout(() => setBusy(false), 200);
        }
    };

    // пресеты остаются на случай быстрого переключения
    const presetOnly = async (keyTrue) => {
        if (!matchId || busy) return;
        setBusy(true);
        try {
            const patch = {};
            EXCLUSIVE_KEYS.forEach(k => { patch[k] = false; });
            if (keyTrue) patch[keyTrue] = true;
            overlaySet(matchId, patch);
            overlayGet(matchId);
        } finally {
            setTimeout(() => setBusy(false), 200);
        }
    };

    return (
        <div style={styles.wrap}>
            <div style={styles.card}>
                <h2 style={{ marginTop: 0 }}>Пульт управления трансляцией</h2>

                <div style={styles.row}>
                    <label style={styles.label}>Match ID:</label>
                    <input
                        type="number"
                        value={matchId}
                        onChange={(e) => setMatchId(Number(e.target.value) || 0)}
                        style={styles.input}
                    />
                    <button style={styles.btn} onClick={() => overlayGet(matchId)}>
                        Обновить состояние
                    </button>
                </div>

                <div style={styles.pills}>
                    {OVERLAY_KEYS.map(({ key, label }) => {
                        const active = isOn(key);
                        return (
                            <button
                                key={key}
                                onClick={() => handleExclusive(key)}
                                disabled={busy}
                                style={{
                                    ...styles.pill,
                                    ...(active ? styles.pillOn : styles.pillOff),
                                }}
                                title={key}
                            >
                                {active ? "ON" : "OFF"} — {label}
                            </button>
                        );
                    })}
                </div>

                <div style={styles.row}>
                    {/* <button style={styles.btn} onClick={() => presetOnly("OpenScore")} disabled={busy}>
                        Показать только счёт
                    </button>
                    <button style={styles.btn} onClick={() => presetOnly("OpenWaiting")} disabled={busy}>
                        Экран ожидания
                    </button>
                    <button style={styles.btn} onClick={() => presetOnly("OpenBreak")} disabled={busy}>
                        Перерыв
                    </button>
                    <button style={styles.btn} onClick={() => presetOnly("ShowPlug")} disabled={busy}>
                        Заглушка
                    </button> */}
                    <button style={styles.btn} onClick={() => presetOnly(null)} disabled={busy}>
                        Выключить всё
                    </button>
                </div>

                <div style={styles.stateBox}>
                    <div style={styles.stateHeader}>
                        Текущее состояние overlay:
                        <button style={styles.smallBtn} onClick={() => overlayGet(matchId)}>↻</button>
                    </div>
                    <pre style={styles.pre}>
                        {overlay ? JSON.stringify(overlay, null, 2) : "— нет данных —"}
                    </pre>
                </div>
            </div>
        </div>
    );
}

const styles = {
    wrap: { minHeight: "100vh", background: "#0f1115", color: "#e6e6e6", padding: 24, boxSizing: "border-box" },
    card: { maxWidth: 960, margin: "0 auto", background: "#181b22", border: "1px solid #2a2f3a", borderRadius: 12, padding: 16, boxSizing: "border-box", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" },
    row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
    label: { minWidth: 90, opacity: 0.85 },
    input: { width: 120, background: "#0f1115", border: "1px solid #2a2f3a", color: "#e6e6e6", borderRadius: 8, padding: "8px 10px", outline: "none" },
    btn: { background: "#2b8a3e", border: "none", color: "white", borderRadius: 8, padding: "8px 12px", cursor: "pointer" },
    smallBtn: { marginLeft: 8, background: "#3a3f4b", border: "none", color: "white", borderRadius: 6, padding: "4px 8px", cursor: "pointer" },
    pills: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8, marginBottom: 12 },
    pill: { borderRadius: 10, border: "1px solid #2a2f3a", padding: "10px 12px", textAlign: "left", cursor: "pointer", background: "transparent", color: "#e6e6e6" },
    pillOn: { outline: "2px solid #2b8a3e", background: "rgba(43,138,62,0.15)" },
    pillOff: { outline: "2px solid transparent", background: "rgba(255,255,255,0.06)" },
    stateBox: { marginTop: 12, border: "1px solid #2a2f3a", borderRadius: 8, overflow: "hidden" },
    stateHeader: { padding: "8px 10px", background: "#202532", borderBottom: "1px solid #2a2f3a", display: "flex", alignItems: "center" },
    pre: { margin: 0, padding: 12, overflowX: "auto", fontSize: 13, lineHeight: 1.35 },
};
