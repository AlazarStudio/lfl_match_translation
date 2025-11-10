import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMatchSelection } from "../../state/matchSelection";
import { connectLive, joinRoomMulti, onLive } from "../../services/liveSocket";

const API_BASE = "https://backend.mlf09.ru";
const LS_KEY = "selectedTournamentId";

export default function MatchList() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [tournaments, setTournaments] = useState([]);
    const [view, setView] = useState("tournaments"); // "tournaments" | "matches"
    const [selectedTournament, setSelectedTournament] = useState(null);

    const [matches, setMatches] = useState([]);
    const [query, setQuery] = useState("");

    const setSelectedMatchId = useMatchSelection((s) => s.setSelectedMatchId);
    const navigate = useNavigate();

    // функция загрузки матчей конкретного турнира
    const loadMatchesForTournament = async (tournament) => {
        setSelectedTournament(tournament);
        setView("matches");
        setLoading(true);
        setError(null);

        // сохраняем выбор
        localStorage.setItem(LS_KEY, String(tournament.id));

        try {
            const res = await fetch(
                `${API_BASE}/api/tournaments/${tournament.id}/matches`
            );
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.rows || [];

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const prepared = list
                .filter((m) => {
                    if (m.status === "live") return true;
                    if (!m.date) return false;
                    const d = new Date(m.date);
                    d.setHours(0, 0, 0, 0);
                    return d >= today;
                })
                .sort((a, b) => {
                    // live вверх
                    if (a.status === "live" && b.status !== "live") return -1;
                    if (a.status !== "live" && b.status === "live") return 1;

                    // по дате
                    const da = a.date ? new Date(a.date) : new Date(9000, 0, 1);
                    const db = b.date ? new Date(b.date) : new Date(9000, 0, 1);
                    if (da < db) return -1;
                    if (da > db) return 1;

                    // по id (на всякий)
                    return Number(a.id) - Number(b.id);
                });

            prepared.forEach((m) => {
                joinRoomMulti(`tmatch:${m.id}`);
            });

            setMatches((prev) => {
                // если состав не изменился — не перерендериваем
                const prevStr = JSON.stringify(prev);
                const nextStr = JSON.stringify(prepared);
                if (prevStr === nextStr) return prev; // без изменений

                return prepared;
            });

        } catch (e) {
            setError(e.message || "Ошибка загрузки матчей");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedTournament) return;

        const interval = setInterval(() => {
            loadMatchesForTournament(selectedTournament);
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedTournament]);


    // 1) грузим турниры
    useEffect(() => {
        let cancelled = false;

        async function loadTournaments() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/api/tournaments`);
                const data = await res.json();
                const list = Array.isArray(data) ? data : data.rows || [];

                if (cancelled) return;

                setTournaments(list);

                // пробуем восстановить выбранный турнир
                const savedId = localStorage.getItem(LS_KEY);
                if (savedId) {
                    const found = list.find((t) => String(t.id) === savedId);
                    if (found) {
                        // сразу открываем его
                        loadMatchesForTournament(found);
                        return;
                    }
                }

                // если не было сохранённого — просто показываем список
                setView("tournaments");
            } catch (e) {
                if (!cancelled) setError(e.message || "Ошибка загрузки турниров");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadTournaments();
        return () => {
            cancelled = true;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const goBack = () => {
        setView("tournaments");
        setSelectedTournament(null);
        setMatches([]);
        setQuery("");
        // можно не чистить localStorage — пусть помнит, что последний турнир был этот
        // если хочешь чистить — раскомментируй:
        localStorage.removeItem(LS_KEY);
    };

    const handleConnect = (matchId) => {
        // localStorage.setItem("matchId", matchId);
        setSelectedMatchId(matchId);
        navigate("/live");
    };

    const handleManage = (matchId) => {
        // localStorage.setItem("matchId", matchId);
        setSelectedMatchId(matchId);
        navigate("/overlay");
    };


    // поиск по матчам
    const filteredMatches =
        view === "matches"
            ? matches.filter((m) => {
                if (!query) return true;
                const t1 = m?.team1TT?.team?.title || "";
                const t2 = m?.team2TT?.team?.title || "";
                const q = query.toLowerCase();
                return (
                    t1.toLowerCase().includes(q) ||
                    t2.toLowerCase().includes(q) ||
                    String(m.status || "").toLowerCase().includes(q)
                );
            })
            : [];

    // группировка по дате
    const groupedByDate =
        view === "matches"
            ? filteredMatches.reduce((acc, match) => {
                const dateStr = match.date
                    ? new Date(match.date).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                    })
                    : "Без даты";
                if (!acc[dateStr]) acc[dateStr] = [];
                acc[dateStr].push(match);
                return acc;
            }, {})
            : {};

    return (
        <div style={styles.wrap}>
            <div style={styles.card}>
                {view === "tournaments" && (
                    <>
                        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Выберите турнир</h2>
                        {/* {loading && <div>Загружаю турниры…</div>} */}
                        {error && <div style={{ color: "tomato" }}>{error}</div>}
                        {!error && tournaments.length === 0 && (
                            <div>Турниров нет</div>
                        )}

                        <div style={styles.tournamentList}>
                            {tournaments.map((t) => (
                                <div key={t.id} style={styles.tournamentItem}>
                                    <div>
                                        <div style={styles.tournamentTitle}>
                                            {t.title || `Турнир ${t.id}`}
                                        </div>
                                        {t.description ? (
                                            <div style={styles.tournamentDesc}>{t.description}</div>
                                        ) : null}
                                    </div>
                                    <button
                                        style={styles.btn}
                                        onClick={() => loadMatchesForTournament(t)}
                                    >
                                        Открыть
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {view === "matches" && (
                    <>
                        <div style={styles.topRow}>
                            <button style={styles.backBtn} onClick={goBack}>
                                ← Назад
                            </button>
                            <h2 style={{ margin: 0 }}>
                                {selectedTournament?.title ||
                                    `Турнир ${selectedTournament?.id || ""}`}
                            </h2>
                        </div>

                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Поиск по команде или статусу..."
                            style={styles.search}
                        />

                        {/* {loading && <div>Загружаю матчи…</div>} */}
                        {error && <div style={{ color: "tomato" }}>{error}</div>}
                        {!error && filteredMatches.length === 0 && (
                            <div>Матчей нет</div>
                        )}

                        <div style={styles.list}>
                            {Object.entries(groupedByDate).map(([date, items]) => (
                                <div key={date}>
                                    <div style={styles.dateHeader}>{date}</div>
                                    {items.map((m) => {
                                        const t1 = m?.team1TT?.team;
                                        const t2 = m?.team2TT?.team;
                                        const isLive =
                                            (m.status || "").toLowerCase() === "live" ||
                                            (m.status || "").toLowerCase() === "live ";
                                        return (
                                            <div key={m.id} style={styles.item}>
                                                <div>
                                                    <div style={styles.title}>
                                                        <span style={styles.team}>
                                                            {t1?.title || "Команда 1"}
                                                        </span>{" "}
                                                        —{" "}
                                                        <span style={styles.team}>
                                                            {t2?.title || "Команда 2"}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            ...styles.status,
                                                        }}
                                                    >
                                                        {/* ID: {m.id} ·  */}
                                                        статус: <span style={{ ...(isLive ? styles.statusLive : {}) }}>{m.status || "—"}</span>
                                                    </div>
                                                </div>

                                                <div style={{ ...styles.lineJC, ...(window.innerWidth > 768 ? {} : styles.btnWidth) }}>
                                                    {/* {window.innerWidth > 768 &&
                                                        <button
                                                            style={styles.btn}
                                                            onClick={() => handleConnect(m.id)}
                                                            disabled={window.innerWidth > 768 ? false : true}
                                                        >
                                                            Подключиться
                                                        </button>
                                                    } */}
                                                    <button
                                                        style={styles.btn}
                                                        // onClick={() => handleManage(69)}
                                                        onClick={() => handleManage(m.id)}
                                                    >
                                                        Управление
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    wrap: {
        minHeight: "100vh",
        background: "#0f1115",
        color: "#fff",
        padding: 24,
        boxSizing: "border-box",
    },
    card: {
        maxWidth: 960,
        margin: "0 auto",
        background: "#181b22",
        border: "1px solid #2a2f3a",
        borderRadius: 12,
        padding: 16,
    },
    tournamentList: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    tournamentItem: {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: 10,
        padding: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    tournamentTitle: {
        fontWeight: 500,
    },
    tournamentDesc: {
        opacity: 0.6,
        fontSize: 12,
        marginTop: 4,
    },
    topRow: {
        display: "flex",
        gap: 12,
        alignItems: "center",
        marginBottom: 12,
    },
    backBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 6,
        padding: "4px 10px",
        color: "#fff",
        cursor: "pointer",
    },
    search: {
        width: "100%",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.2)",
        color: "#fff",
        marginBottom: 14,
        outline: "none",
    },
    list: {
        display: "flex",
        flexDirection: "column",
        // gap: 12,
    },
    dateHeader: {
        fontWeight: 600,
        fontSize: 14,
        opacity: 0.8,
        margin: "15px 0 6px 2px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        paddingBottom: 10,
    },
    item: {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: 10,
        padding: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 10
    },
    title: {
        fontWeight: 500,
    },
    team: {
        color: "#fff",
    },
    status: {
        opacity: 0.7,
        fontSize: 12,
        marginTop: 8,
    },
    statusLive: {
        opacity: 1,
        color: "#ff5252",
        fontWeight: 600,
    },
    lineJC: {
        display: "flex",
        alignItems: "center",
        gap: 12,
    },
    btn: {
        background: "#2b8a3e",
        border: "none",
        color: "#fff",
        borderRadius: 8,
        padding: "6px 12px",
        cursor: "pointer",
    },
    btnWidth: {
        width: '250px'
    },
};
