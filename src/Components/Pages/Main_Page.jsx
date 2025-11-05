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

    // console.log(lastEvent)

    const overlay = useMatchEvents((s) => s.overlay);
    const setOverlayKey = useMatchEvents((s) => s.setOverlayKey);
    const toggleOverlayKey = useMatchEvents((s) => s.toggleOverlayKey);

    // локальные состояния для управления другими блоками (ожидание, состав и т.д.)
    const [openScore, setOpenScore] = React.useState(true);
    const [openWaiting, setOpenWaiting] = React.useState(false);
    const [openBreak, setOpenBreak] = React.useState(false);
    const [showSostav, setShowSostav] = React.useState(false);
    const [showPlug, setShowPlug] = React.useState(false);

    // useEffect(() => {
    //     initEvents(MATCH_ID); // подключаемся к матчу
    // }, [initEvents]);

    const isScoreOpen = overlay?.OpenScore ?? true;

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
                showForMs={5000}
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
