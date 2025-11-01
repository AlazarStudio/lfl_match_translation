// src/services/liveSocket.js
import { io } from "socket.io-client";

let socket = null;
let currentRoom = null;

export function connectLive(
    url = "https://backend.mlf09.ru",
    path = "/socket.io"
) {
    if (socket) return socket;
    socket = io(url, {
        path,
        transports: ["websocket", "polling"],
        withCredentials: true
    });

    // socket.on("connect", () => console.log("[live] connected", socket.id));
    // socket.on("disconnect", (r) => console.log("[live] disconnected:", r));
    // socket.on("connect_error", (e) =>
    //     console.log("[live] connect_error:", e?.message || e)
    // );
    // socket.on("error", (e) => console.log("[live] error:", e));

    // полный лог всех событий (временно)
    // socket.onAny((event, ...args) => {
    //     if (event.startsWith("pong")) return;
    //     if (event === "tmatch:lineup") {
    //         console.log("[live] LINEUP RAW:", args[0]);
    //     } else if (event === "tmatch:clock") {
    //         console.log("[live] CLOCK:", args[0]);
    //     } else if (event === "tmatch:overlay") {
    //         console.log("[live] OVERLAY:", args[0]);
    //     } else {
    //         console.log("[live] ANY:", event, args?.[0]);
    //     }
    // });

    return socket;
}

/** Вступить в комнату (с ACK) */
export function joinRoom(room, ackCb) {
    if (!socket || !room) return;
    if (currentRoom && currentRoom !== room) {
        socket.emit("room:leave", currentRoom)
    };
    // socket.emit("room:join", room);
    // currentRoom = room;
    socket.emit("room:join", room, (ack) => {
        if (ack?.ok) currentRoom = room;
        ackCb && ackCb(ack);
    });
}

/** Покинуть текущую комнату */
export function leaveCurrentRoom() {
    if (!socket || !currentRoom) return;
    socket.emit("room:leave", currentRoom);
    currentRoom = null;
}

/** Подписка на событие (возвращает off) */
export function onLive(event, cb) {
    if (!socket) return () => { };
    socket.on(event, cb);
    return () => socket.off(event, cb);
}

// export function emit(event, payload) {
//     socket?.emit(event, payload);
// }
export function emit(event, payload, ack) {
    if (!socket) return;
    if (typeof ack === "function") socket.emit(event, payload, ack);
    else socket.emit(event, payload);
}

/* ===================== CLOCK ===================== */

export function requestClock(matchId) {
    emit("tmatch:clock:get", { matchId }); // именно так в примере бэка :contentReference[oaicite:0]{index=0}
}

export function onClock(cb) {
    return onLive("tmatch:clock", cb);
}

/* ===================== OVERLAY ===================== */

// === НОВОЕ: управление overlay ===
export function overlayGet(matchId, ack) {
    emit("tmatch:overlay:get", { matchId }, ack);
}
export function overlaySet(matchId, patch, ack) {
    // пример бэка: socket.emit('tmatch:overlay:set', { matchId, OpenScore: true })
    emit("tmatch:overlay:set", { matchId, ...patch }, ack);
}
export function overlayToggle(matchId, key) {
    // пример бэка: socket.emit('tmatch:overlay:toggle', { matchId, key: 'ShowPlug' })
    // emit("tmatch:overlay:toggle", { matchId, key });
    overlayGet(matchId, (state) => {
        const next = { [key]: !state?.[key] };
        overlaySet(matchId, next);
    });
}
export function onOverlay(cb) {
    // пример бэка: socket.on('tmatch:overlay', (state) => ...)
    return onLive("tmatch:overlay", cb);
}

/* ===== LINEUPS ===== */

// сервер ожидает: socket.emit("join", { matchId });
export function requestLineups(matchId) {
    // joinRoom(`tmatch:${matchId}`);
    emit("tmatch:lineup:get", { matchId });
}

// сервер шлёт: socket.on("tmatch:lineup", ({ team1, team2 }) => { ... })
export function onLineup(cb) {
    return onLive("tmatch:lineup", cb);
}

export function getSocket() {
    return socket;
}

export function currentRoomId() {
    return currentRoom;
}

const joinedRooms = new Set();

export function joinRoomMulti(room) {
    if (!socket || !room) return;
    if (joinedRooms.has(room)) return;
    socket.emit("room:join", room, (ack) => {
        // можно проверить ack
    });
    joinedRooms.add(room);
}