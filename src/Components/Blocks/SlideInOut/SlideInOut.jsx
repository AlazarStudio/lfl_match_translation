import React, { useEffect, useMemo, useRef, useState } from "react";
import classes from "./SlideInOut.module.css";

function SlideInOut({
    children,
    top, left, right, bottom,
    from = "left",

    isOpen: controlledOpen,
    stick = false,
    showForMs,
    triggerKey,

    appearDelayMs = 0,
    exitDelayMs = 0,
    durationMs = 350,

    extraOffsetPx = 500,
    zIndex = 1000,

    onEntered,
    onExited,

    className,
    style,

    // <- новое: хотим ли запускать авто-анимацию прямо на маунте
    runOnMount = false,
}) {
    const isControlled = typeof controlledOpen === "boolean";
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = isControlled ? controlledOpen : uncontrolledOpen;

    const timerRef = useRef();
    const prevKeyRef = useRef(); // undefined на самом первом рендере

    useEffect(() => () => clearTimeout(timerRef.current), []);

    useEffect(() => {
        const isFirstRender = prevKeyRef.current === undefined;
        const keyChanged = prevKeyRef.current !== triggerKey;
        // запомним текущее значение для следующего раза
        prevKeyRef.current = triggerKey;

        // --- не делаем ничего на первом рендере, если явно не просили
        if (isFirstRender && !runOnMount) return;

        // --- персистентный режим
        if (stick) {
            if (!isControlled) {
                clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => setUncontrolledOpen(true), appearDelayMs);
            }
            return;
        }

        // --- авто-режим: стартуем только если ключ ИЗМЕНИЛСЯ
        if (typeof showForMs === "number" && (runOnMount ? true : keyChanged)) {
            if (!isControlled) {
                clearTimeout(timerRef.current);
                setUncontrolledOpen(false);
                timerRef.current = setTimeout(() => {
                    setUncontrolledOpen(true);
                    onEntered?.();
                    timerRef.current = setTimeout(() => {
                        setUncontrolledOpen(false);
                        setTimeout(() => onExited?.(), durationMs + 5);
                    }, showForMs + exitDelayMs);
                }, appearDelayMs);
            }
        }
    }, [
        triggerKey, stick, showForMs, appearDelayMs, exitDelayMs,
        durationMs, isControlled, runOnMount, onEntered, onExited
    ]);

    const [sideStyle, closedTx] = useMemo(() => {
        const side = from === "right" ? "right" : "left";
        const posSide = side === "left" ? { left } : { right };
        const tx = from === "right"
            ? `translateX(calc(100% + ${extraOffsetPx}px))`
            : `translateX(calc(-100% - ${extraOffsetPx}px))`;
        return [{
            position: "fixed",
            top, bottom,
            ...(posSide[side] !== undefined ? posSide : { [side]: 16 }),
            zIndex
        }, tx];
    }, [from, top, bottom, left, right, extraOffsetPx, zIndex]);

    return (
        <div
            className={[
                classes.container,
                open ? classes.open : classes.closed,
                from === "right" ? classes.fromRight : classes.fromLeft,
                className
            ].filter(Boolean).join(" ")}
            style={{
                ...sideStyle,
                "--slide-duration": `${durationMs}ms`,
                "--closed-tx": closedTx,
                ...style
            }}
            onTransitionEnd={(e) => {
                if (e.propertyName === "transform") {
                    if (open) onEntered?.();
                    else onExited?.();
                }
            }}
        >
            {children}
        </div>
    );
}

export default SlideInOut;
