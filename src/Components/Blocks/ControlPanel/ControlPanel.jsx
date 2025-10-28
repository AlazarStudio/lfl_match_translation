import React, { useEffect } from "react";
import s from "./ControlPanel.module.css";

const MODES = [
    { id: "score", label: "Счёт & Спонсоры", key: "1" },
    { id: "event", label: "Событие", key: "E" },
    { id: "waiting", label: "Ожидание", key: "2" },
    { id: "break", label: "Перерыв", key: "3" },
    { id: "lineup", label: "Состав", key: "4" },
    { id: "plug", label: "Заглушка", key: "5" },
];

export default function ControlPanel({
    mode,                    // текущий режим
    onSwitch,                // (nextMode:string) => void
    eventType,               // 'yellow' | 'red' | 'goal' | ...
    onChangeEventType,       // (type:string) => void
    className,
    style
}) {
    // Хоткеи
    useEffect(() => {
        const onKey = (e) => {
            const k = e.key.toLowerCase();
            if (k === "e") { onSwitch("event"); return; }
            const m = { "1": "score", "2": "waiting", "3": "break", "4": "lineup", "5": "plug", "0": "none" }[k];
            if (m) onSwitch(m);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onSwitch]);

    return (
        <div className={`${s.panel} ${className ?? ""}`} style={style}>
            <div className={s.header}>
                <span className={s.dot} />
                <span className={s.title}>Пульт трансляции</span>
                <span className={s.sub}>горячие клавиши: 1–5, E, 0</span>
            </div>

            <div className={s.group}>
                {MODES.map(({ id, label, key }) => (
                    <button
                        key={id}
                        className={`${s.btn} ${mode === id ? s.active : ""}`}
                        onClick={() => onSwitch(id)}
                        title={`Клавиша: ${key}`}
                    >
                        <span className={s.btnLabel}>{label}</span>
                        <kbd className={s.kbd}>{key}</kbd>
                    </button>
                ))}

                <button
                    className={s.btnGhost}
                    onClick={() => onSwitch("none")}
                    title="Клавиша: 0"
                >
                    Скрыть всё <kbd className={s.kbd}>0</kbd>
                </button>
            </div>

            <div className={s.groupRow}>
                <label className={s.label}>Тип события:</label>
                <div className={s.segment}>
                    {["goal", "yellow", "red", "penalty"].map(t => (
                        <button
                            key={t}
                            className={`${s.segBtn} ${eventType === t ? s.segActive : ""}`}
                            onClick={() => onChangeEventType(t)}
                        >
                            {iconFor(t)}
                            <span className={s.segText}>{nice(t)}</span>
                        </button>
                    ))}
                </div>

                <button className={s.btnPrimary} onClick={() => onSwitch("event")}>
                    Показать событие <kbd className={s.kbd}>E</kbd>
                </button>
            </div>
        </div>
    );
}

function nice(t) {
    return ({
        goal: "Гол",
        yellow: "Жёлтая",
        red: "Красная",
        penalty: "Пенальти"
    }[t] || t);
}

// простые inline-иконки (без зависимостей)
function iconFor(t) {
    if (t === "goal") return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm0 3a7 7 0 110 14 7 7 0 010-14Zm0 3a4 4 0 100 8 4 4 0 000-8Z" />
        </svg>
    );
    if (t === "yellow") return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <rect x="6" y="3" width="12" height="18" rx="2" />
        </svg>
    );
    if (t === "red") return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <rect x="5" y="2" width="14" height="20" rx="2" />
        </svg>
    );
    if (t === "penalty") return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M3 21h18M7 21V9l10-3v12" />
        </svg>
    );
    return null;
}
