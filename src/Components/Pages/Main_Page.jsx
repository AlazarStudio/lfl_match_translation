import React, { useEffect, useState } from "react";

// ===== твои готовые блоки =====
import ScoreTop from "../Blocks/ScoreTop/ScoreTop";
import SponsorsTop from "../Blocks/SponsorsTop/SponsorsTop";
import SlideInOut from "../Blocks/SlideInOut/SlideInOut";
import InfoBlockBottom from "../Blocks/InfoBlockBottom/InfoBlockBottom";
import Waiting from "../Blocks/Waiting/Waiting";
import MainLogo from "../Blocks/MainLogo/MainLogo";
import StructureTeam from "../Blocks/StructureTeam/StructureTeam";
import Plug from "../Blocks/Plug/Plug";

// ===== стор событий =====
import { useMatchEvents } from "../../state/matchEvents";
import { useMatchSelection } from "../../state/matchSelection";

import { fetchAllMatchesFromAllTournaments } from "../../services/matches";
import PlugBetween from "../Blocks/PlugBetween/PlugBetween";

// id матча, можно потом получать из URL или пропсов
const API_BASE = "https://backend.mlf09.ru";
const API_TM = `${API_BASE}/api/tournament-matches`;

function Main_Page() {
    // инициализация сокета и слушателей
    const initEvents = useMatchEvents((s) => s.init);
    const [currentMatchId, setCurrentMatchId] = useState(null);
    const [noMatch, setNoMatch] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const all = await fetchAllMatchesFromAllTournaments();
            if (cancelled) return;
            // сначала ищем live
            const live = all.find(
                (m) => (m.status || "").trim().toLowerCase() === "live"
            );
            // если нет live — возьмём просто первый
            const chosen = live;
            if (chosen) {
                setCurrentMatchId(chosen.id);
                setNoMatch(false);
            } else {
                // setCurrentMatchId(69);
                // setNoMatch(false);
                setNoMatch(true);
            }
        }
        // если надо периодически проверять — можно тут setInterval
        const interval = setInterval(load, 1000);
        return () => clearInterval(interval);
    }, []);

    // console.log(currentMatchId)

    // const selectedMatchId = useMatchSelection((s) => s.selectedMatchId);

    useEffect(() => {
        if (!currentMatchId) return;
        initEvents(currentMatchId);
    }, [currentMatchId, initEvents]);

    // if (!selectedMatchId) {
    //     return (
    //         <div style={{ color: "#000", padding: 24 }}>
    //             Матч не выбран. Сначала выбери матч на главной.
    //         </div>
    //     );
    // }

    // данные из стора
    const eventKey = useMatchEvents((s) => s.eventKey);
    const lastEvent = useMatchEvents((s) => s.lastEventUi);
    const score1 = useMatchEvents((s) => s.score1);
    const score2 = useMatchEvents((s) => s.score2);
    const team1 = useMatchEvents((s) => s.team1);
    const team2 = useMatchEvents((s) => s.team2);
    const referee = useMatchEvents((s) => s.referee);

    const overlay = useMatchEvents((s) => s.overlay);
    const setOverlayKey = useMatchEvents((s) => s.setOverlayKey);
    const toggleOverlayKey = useMatchEvents((s) => s.toggleOverlayKey);

    // локальные состояния для управления другими блоками (ожидание, состав и т.д.)
    const [openScore, setOpenScore] = React.useState(true);
    const [openWaiting, setOpenWaiting] = React.useState(false);
    const [openBreak, setOpenBreak] = React.useState(false);
    const [showSostav, setShowSostav] = React.useState(false);
    const [showPlug, setShowPlug] = React.useState(false);
    const [showTimeOut, setShowTimeOut] = React.useState(false);

    const [initReferee, setInitReferee] = useState();
    const [showReferee, setShowReferee] = useState(false);
    const [showCommentator, setShowCommentator] = useState(false);

    // useEffect(() => {
    //     initEvents(MATCH_ID); // подключаемся к матчу
    // }, [initEvents]);

    const isScoreOpen = overlay?.OpenScore ?? true;

    async function fetchReferee(matchId) {
        try {
            const snap = await fetch(`${API_TM}/${matchId}`).then(r => r.json());
            // бэк мог вернуть либо referees (массив), либо referee (один объект)
            const referee = Array.isArray(snap?.referees) ? snap.referees[0] : snap?.referee || null;
            return referee;
        } catch (e) {
            console.warn("Не удалось загрузить снапшот матча", e);
            return null;
        }
    }

    useEffect(() => {
        let cancelled = false;

        if (overlay?.ShowJudge) {
            (async () => {
                const ref = await fetchReferee(currentMatchId);
                if (cancelled) return;

                setInitReferee(ref.referee);        // null если нет судьи
                setShowReferee(true);
            })();
        } else {
            // скрываем блок и чистим данные
            setInitReferee(null);
            setShowReferee(false);
        }

        return () => { cancelled = true; };
    }, [overlay?.ShowJudge, currentMatchId]);

    return (
        <>
            <SlideInOut
                isOpen={noMatch}
                from="top"
                top={0}
                left={0}
                bottom={0}
                right={0}
                durationMs={500}
            >
                <PlugBetween
                    team1={team1}
                    team2={team2}
                />
            </SlideInOut>

            <SlideInOut isOpen={noMatch ? false : overlay?.ShowTimeOut ?? false} from="top" top={64} left="50%" durationMs={500}>
                <MainLogo />
            </SlideInOut>
            <SlideInOut isOpen={noMatch ? false : overlay?.ShowTimeOut ?? false} from="bottom" bottom={64} left="50%" durationMs={500}>
                <Waiting
                    timeOut={true}
                    team1={team1}
                    team2={team2}
                    team1Score={score1}
                    team2Score={score2}
                />
            </SlideInOut>

            {/* ======= ВЕРХНИЙ СЧЁТ ======= */}
            <SlideInOut isOpen={noMatch ? false : overlay?.OpenScore ?? false} from="left" top={64} left={86} durationMs={500}>
                <ScoreTop
                    team1Score={score1}
                    team2Score={score2}
                    team1={team1}
                    team2={team2}
                />
            </SlideInOut>

            {/* ======= СПОНСОРЫ СПРАВА ======= */}
            <SlideInOut isOpen={noMatch ? false : overlay?.OpenScore ?? false} from="right" top={47} right={86} durationMs={500}>
                <SponsorsTop />
            </SlideInOut>

            {/* ======= НИЖНИЙ ВСПЛЫВАЮЩИЙ ИНФОБЛОК ======= */}
            <SlideInOut
                from="left"
                bottom={86}
                left={86}
                showForMs={10000}
                durationMs={500}
                appearDelayMs={0}
                exitDelayMs={500}
                triggerKey={eventKey} // триггерит появление на каждый event+
            >
                {lastEvent && (
                    <InfoBlockBottom
                        eventType={lastEvent.kind} // goal, yellow, red, penalty, penalty_missed
                        player={{
                            name: lastEvent.playerName,
                            teamName: lastEvent.teamTitle,
                            photo: lastEvent.playerPhoto,
                            teamLogo: lastEvent.teamLogo,
                            minute: lastEvent.minute,
                            assistName: lastEvent.assistName,
                        }}
                    />
                )}
            </SlideInOut>

            <SlideInOut
                from="left"
                bottom={86}
                left={86}
                showForMs={10000}
                durationMs={500}
                appearDelayMs={0}
                exitDelayMs={500}
                triggerKey={showReferee} // триггерит появление на каждый event+
            >
                {initReferee && (
                    <InfoBlockBottom
                        eventType={"judge"}
                        player={{
                            name: initReferee.name,
                            teamName: "Судья матча",
                            photo: initReferee.images[0],
                            teamLogo: "lfl_logo_big.png",
                            minute: initReferee.minute,
                            assistName: initReferee.assistName,
                        }}
                    />
                )}
            </SlideInOut>

            <SlideInOut
                from="left"
                bottom={86}
                left={86}
                showForMs={10000}
                durationMs={500}
                appearDelayMs={0}
                exitDelayMs={500}
                triggerKey={overlay?.ShowCommentator} // триггерит появление на каждый event+
            >
                {overlay?.ShowCommentator && (
                    <InfoBlockBottom
                        eventType={"commentator"}
                        player={{
                            name: "Хубиев Мурат",
                            teamName: "Комментатор матча",
                            photo: "",
                            teamLogo: "lfl_logo_big.png",
                            minute: "",
                            assistName: "",
                        }}
                    />
                )}
            </SlideInOut>


            {/* ======= ЭКРАН ОЖИДАНИЯ ======= */}
            <SlideInOut isOpen={noMatch ? false : overlay?.OpenWaiting ?? false} from="top" top={64} left="50%" durationMs={500}>
                <MainLogo />
            </SlideInOut>
            <SlideInOut isOpen={noMatch ? false : overlay?.OpenWaiting ?? false} from="bottom" bottom={64} left="50%" durationMs={500}>
                <Waiting
                    team1={team1}
                    team2={team2}
                />
            </SlideInOut>

            {/* ======= ЭКРАН ПЕРЕРЫВА ======= */}
            <SlideInOut isOpen={noMatch ? false : overlay?.OpenBreak ?? false} from="top" top={64} left="50%" durationMs={500}>
                <MainLogo />
            </SlideInOut>
            <SlideInOut isOpen={noMatch ? false : overlay?.OpenBreak ?? false} from="bottom" bottom={64} left="50%" durationMs={500}>
                <Waiting
                    breakMatch={true}
                    team1={team1}
                    team2={team2}
                    team1Score={score1}
                    team2Score={score2}
                />
            </SlideInOut>

            {/* ======= СОСТАВ КОМАНД ======= */}
            <SlideInOut isOpen={noMatch ? false : overlay?.ShowSostavTeam1 ?? false} from="bottom" bottom="50%" left="50%" durationMs={500}>
                <StructureTeam team={team1} />
            </SlideInOut>

            <SlideInOut isOpen={noMatch ? false : overlay?.ShowSostavTeam2 ?? false} from="bottom" bottom="50%" left="50%" durationMs={500}>
                <StructureTeam team={team2} />
            </SlideInOut>

            {/* ======= ЗАГЛУШКА ======= */}
            <SlideInOut
                isOpen={noMatch ? false : overlay?.ShowPlug ?? false}
                from="top"
                top={0}
                left={0}
                bottom={0}
                right={0}
                durationMs={500}
            >
                <Plug
                    team1={team1}
                    team2={team2}
                />
            </SlideInOut>

            {/* ======= КНОПКИ УПРАВЛЕНИЯ ======= */}
            {/* <div style={{ position: "fixed", top: 20, left: 20, zIndex: 2000, display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => setOpenScore((o) => !o)}>
                    {openScore ? "Скрыть" : "Показать"} счёт
                </button>
                <button onClick={() => setOpenWaiting((o) => !o)}>Ожидание</button>
                <button onClick={() => setOpenBreak((o) => !o)}>Перерыв</button>
                <button onClick={() => setShowSostav((o) => !o)}>Состав</button>
                <button onClick={() => setShowPlug((o) => !o)}>Заглушка</button>
            </div> */}

            {/* Временные кнопки — удобно проверить, что всё ездит */}
            {/* <div style={{ position: "fixed", right: 12, bottom: 12, zIndex: 3000, display: "grid", gap: 6 }}>
                <button onClick={() => setOverlayKey("OpenScore", !(overlay?.OpenScore))}>
                    {overlay?.OpenScore ? "Скрыть" : "Показать"} счёт
                </button>
                <button onClick={() => setOverlayKey("OpenWaiting", !(overlay?.OpenWaiting))}>
                    Toggle Ожидание
                </button>
                <button onClick={() => setOverlayKey("OpenBreak", !(overlay?.OpenBreak))}>
                    Toggle Перерыв
                </button>
                <button onClick={() => toggleOverlayKey("ShowPlug")}>Toggle Заглушка</button>
                <button onClick={() => toggleOverlayKey("ShowSostav")}>Toggle Состав</button>
            </div> */}
        </>
    );
}

export default Main_Page;
