import React, { useEffect, useMemo, useRef, useState } from "react";
import classes from "./SlideInOut.module.css";

function SlideInOut({
    children,
    top, left, right, bottom,
    from = "left",                // 'left' | 'right' | 'top' | 'bottom'

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
    runOnMount = false,
}) {
    const isControlled = typeof controlledOpen === "boolean";
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = isControlled ? controlledOpen : uncontrolledOpen;

    const timerRef = useRef();
    const prevKeyRef = useRef();

    useEffect(() => () => clearTimeout(timerRef.current), []);

    useEffect(() => {
        const isFirstRender = prevKeyRef.current === undefined;
        const keyChanged = prevKeyRef.current !== triggerKey;
        prevKeyRef.current = triggerKey;

        if (isFirstRender && !runOnMount) return;

        if (stick) {
            if (!isControlled) {
                clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => setUncontrolledOpen(true), appearDelayMs);
            }
            return;
        }

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

    const isHorizontal = from === "left" || from === "right";
    const isVertical = from === "top" || from === "bottom";

    const [posStyle, closedTx] = useMemo(() => {
        // трансформация закрытого состояния
        let tx = "translateX(0)";
        if (from === "left") tx = `translateX(calc(-100% - ${extraOffsetPx}px))`;
        if (from === "right") tx = `translateX(calc(100% + ${extraOffsetPx}px))`;
        if (from === "top") tx = `translateY(calc(-100% - ${extraOffsetPx}px))`;
        if (from === "bottom") tx = `translateY(calc(100% + ${extraOffsetPx}px))`;

        // позиционирование
        const styleObj = { position: "fixed", zIndex };

        if (isHorizontal) {
            // горизонтальный выезд — обязательно фиксируем по вертикали
            styleObj.top = top ?? 16;
            if (bottom !== undefined) styleObj.bottom = bottom;
            // и ставим сторону
            if (from === "left") styleObj.left = left ?? 16;
            if (from === "right") styleObj.right = right ?? 16;
        } else {
            // вертикальный выезд — фиксируем по горизонтали
            styleObj.left = left ?? 16;
            if (right !== undefined) styleObj.right = right;
            // и ставим сторону
            if (from === "top") styleObj.top = top ?? 16;
            if (from === "bottom") styleObj.bottom = bottom ?? 16;
        }

        return [styleObj, tx];
    }, [from, top, bottom, left, right, extraOffsetPx, isHorizontal]);

    return (
        <div
            className={[
                classes.container,
                open ? classes.open : classes.closed,
                className
            ].filter(Boolean).join(" ")}
            style={{
                ...posStyle,
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
