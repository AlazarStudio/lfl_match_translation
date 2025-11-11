// src/pages/OverlayPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    connectLive,
    joinRoom,
    onOverlay,
    overlayGet,
    overlaySet,
} from "../../services/liveSocket";
import { useMatchSelection } from "../../state/matchSelection";
import { useMatchEvents } from "../../state/matchEvents";
import { useNavigate } from "react-router-dom";

// какие ключи управляем с пульта (взаимоисключаемые)
const OVERLAY_KEYS = [
    { key: "OpenScore", label: "Счёт + Спонсоры" },
    { key: "OpenWaiting", label: "Экран ожидания" },
    { key: "ShowJudge", label: "Судья матча" },
    { key: "ShowCommentator", label: "Комментатор" },
    { key: "ShowSostavTeam1", label: "Состав команды 1" },
    { key: "ShowSostavTeam2", label: "Состав команды 2" },
    { key: "OpenBreak", label: "Перерыв" },
    { key: "ShowTimeOut", label: "Тайм-аут" },
    { key: "ShowPlug", label: "Заглушка" },
];
// const OVERLAY_KEYS = [
//     { key: "ShowPlug", label: "Заглушка (ShowPlug)" },
//     { key: "OpenWaiting", label: "Экран ожидания (OpenWaiting)" },
//     { key: "ShowSostavTeam1", label: "Состав команды 1 (ShowSostavTeam1)" },
//     { key: "ShowSostavTeam2", label: "Состав команды 2 (ShowSostavTeam2)" },
//     { key: "OpenScore", label: "Счёт + Спонсоры (OpenScore)" },
//     { key: "OpenBreak", label: "Перерыв (OpenBreak)" },

//     // временные ключи на 10 секунд
//     { key: "ShowTimeOut", label: "Тайм-аут (ShowTimeOut)" },
//     { key: "ShowJudge", label: "Судья матча (ShowJudge)" },
//     { key: "ShowCommentator", label: "Комментатор (ShowCommentator)" },
// ];

const EXCLUSIVE_KEYS = OVERLAY_KEYS.map(k => k.key);
// ключи с автотушением
const TIMED_KEYS = ["ShowJudge", "ShowCommentator"]; // можно добавить "ShowTimeOut" при необходимости
const TTL_SEC = 9;

export default function OverlayPanel() {
    const selectedMatchId = useMatchSelection((s) => s.selectedMatchId);
    const initEvents = useMatchEvents((s) => s.init);

    const [matchId, setMatchId] = useState(selectedMatchId || 0);
    const [overlay, setOverlay] = useState(null);
    const [busy, setBusy] = useState(false);

    // локальные таймеры: { [key]: deadlineMs | null }
    const [timers, setTimers] = useState({});
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (selectedMatchId) setMatchId(selectedMatchId);
    }, [selectedMatchId]);

    useEffect(() => {
        if (!selectedMatchId) return;
        initEvents(selectedMatchId);
    }, [selectedMatchId, initEvents]);

    useEffect(() => { connectLive(); }, []);

    useEffect(() => {
        if (!matchId) return;
        joinRoom(`tmatch:${matchId}`);

        const off = onOverlay((state) => {
            const st = state || {};
            setOverlay(st);

            // если ключ с таймером выключили извне — сбрасываем локальный таймер
            setTimers((prev) => {
                const next = { ...prev };
                TIMED_KEYS.forEach(k => {
                    if (!st[k] && next[k]) next[k] = null;
                });
                return next;
            });
        });

        overlayGet(matchId);
        return () => { off && off(); };
    }, [matchId]);

    // тикер для обратного отсчёта (каждую секунду)
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const isOn = (key) => !!(overlay && overlay[key]);

    // helper: запустить таймер на key
    const startTimer = (key, sec = TTL_SEC) => {
        const deadline = Date.now() + sec * 1000;
        setTimers((prev) => ({ ...prev, [key]: deadline }));
    };

    const remainingSec = (key) => {
        const deadline = timers[key];
        if (!deadline) return 0;
        const left = Math.ceil((deadline - now) / 1000);
        return left > 0 ? left : 0;
    };

    // автоотключение по достижении дедлайна
    useEffect(() => {
        if (!matchId || !overlay) return;

        TIMED_KEYS.forEach((key) => {
            const deadline = timers[key];
            if (!deadline) return;
            const left = deadline - now;

            // если уже истёк и всё ещё включено — выключаем
            if (left <= 0 && isOn(key)) {
                overlaySet(matchId, { [key]: false });
                setTimers((prev) => ({ ...prev, [key]: null }));
                // можно дополнительно обновить overlay из бэка
                overlayGet(matchId);
            }
        });
    }, [now, matchId, overlay, timers]);

    // ВЗАИМНОЕ ИСКЛЮЧЕНИЕ + поддержка timed-ключей
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

            // если это timed-ключ и мы его включили — запускаем отсчёт
            if (wantOn && TIMED_KEYS.includes(key)) {
                startTimer(key, TTL_SEC);
            } else if (!wantOn && TIMED_KEYS.includes(key)) {
                // выключили вручную — чистим таймер
                setTimers((prev) => ({ ...prev, [key]: null }));
            }
        } finally {
            setTimeout(() => setBusy(false), 200);
        }
    };

    // пресет “выключить всё”
    const presetOnly = async (keyTrue) => {
        if (!matchId || busy) return;
        setBusy(true);
        try {
            const patch = {};
            EXCLUSIVE_KEYS.forEach(k => { patch[k] = false; });
            if (keyTrue) patch[keyTrue] = true;

            overlaySet(matchId, patch);
            overlayGet(matchId);

            // таймеры сбрасываем, кроме того, который включили
            setTimers((prev) => {
                const next = {};
                TIMED_KEYS.forEach(k => {
                    next[k] = keyTrue === k ? Date.now() + TTL_SEC * 1000 : null;
                });
                return next;
            });
        } finally {
            setTimeout(() => setBusy(false), 200);
        }
    };

    const navigate = useNavigate();

    return (
        <div style={styles.wrap}>
            <div style={styles.card}>
                <button style={styles.backBtn} onClick={() => navigate("/")}>
                    ← Назад
                </button>
                <h2 style={{ marginTop: 0, marginBottom: 20 }}>Пульт управления трансляцией</h2>

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
                        const isTimed = TIMED_KEYS.includes(key);
                        const secLeft = isTimed ? remainingSec(key) : 0;

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
                                {active && isTimed ? ` · ${secLeft}s` : ""}
                            </button>
                        );
                    })}
                </div>

                <div style={styles.row}>
                    <button style={styles.btn} onClick={() => presetOnly(null)} disabled={busy}>
                        Выключить всё
                    </button>
                </div>

                {/* <div style={styles.stateBox}>
                    <div style={styles.stateHeader}>
                        Текущее состояние overlay:
                        <button style={styles.smallBtn} onClick={() => overlayGet(matchId)}>↻</button>
                    </div>
                    <pre style={styles.pre}>
                        {overlay ? JSON.stringify(overlay, null, 2) : "— нет данных —"}
                    </pre>
                </div> */}
            </div>
        </div>
    );
}
const styles = {
    wrap: { minHeight: "100vh", background: "#0f1115", color: "#e6e6e6", padding: 24, boxSizing: "border-box" },
    card: { maxWidth: 960, margin: "0 auto", background: "#181b22", border: "1px solid #2a2f3a", borderRadius: 12, padding: 16, boxSizing: "border-box", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" },
    row: { display: "none", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
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
    backBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 6,
        padding: "4px 10px",
        color: "#fff",
        cursor: "pointer",
        marginBottom: 20
    },
};
