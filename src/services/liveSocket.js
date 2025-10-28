// src/services/liveSocket.js
import { io } from "socket.io-client";

let socket = null;
let currentRoom = null;

export function connectLive(url = "https://backend.mlf09.ru", path = "/socket.io") {
    if (socket) return socket;
    socket = io(url, { path, transports: ["websocket", "polling"], withCredentials: true });

    socket.on("connect", () => console.log("[live] connected", socket.id));
    socket.on("disconnect", (r) => console.log("[live] disconnected:", r));
    socket.on("connect_error", (e) => console.log("[live] connect_error:", e?.message || e));
    socket.on("error", (e) => console.log("[live] error:", e));

    // полный лог всех событий (временно)
    socket.onAny((event, ...args) => {
        if (event.startsWith("pong")) return;
        console.log("[live] ANY:", event, args?.[0]);
    });

    return socket;
}

export function joinRoom(room) {
    if (!socket || !room) return;
    if (currentRoom && currentRoom !== room) socket.emit("room:leave", currentRoom);
    socket.emit("room:join", room);
    currentRoom = room;
}

export function onLive(event, cb) {
    if (!socket) return () => { };
    socket.on(event, cb);
    return () => socket.off(event, cb);
}

export function emit(event, payload) {
    socket?.emit(event, payload);
}

export function requestClock(matchId) {
    emit("tmatch:clock:get", { matchId }); // именно так в примере бэка :contentReference[oaicite:0]{index=0}
}
