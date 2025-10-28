import React, { useState, useCallback } from "react";
import ScoreTop from "../Blocks/ScoreTop/ScoreTop";
import SponsorsTop from "../Blocks/SponsorsTop/SponsorsTop";
import SlideInOut from "../Blocks/SlideInOut/SlideInOut";
import InfoBlockBottom from "../Blocks/InfoBlockBottom/InfoBlockBottom";
import Waiting from "../Blocks/Waiting/Waiting";
import MainLogo from "../Blocks/MainLogo/MainLogo";
import StructureTeam from "../Blocks/StructureTeam/StructureTeam";
import Plug from "../Blocks/Plug/Plug";
import ControlPanel from "../Blocks/ControlPanel/ControlPanel";

const TRANSITION_MS = 500;

const player = {
    name: "А. Агержаноков",
    teamName: "ФК Ветерок",
    photo: "football_team_player_photo.png",
    teamLogo: "football_team_logo.png",
};

function Main_Page() {
    const [mode, setMode] = useState("none");
    const [eventType, setEventType] = useState("yellow");
    const [eventKey, setEventKey] = useState(0);

    const is = {
        score: mode === "score",
        waiting: mode === "waiting",
        break: mode === "break",
        lineup: mode === "lineup",
        plug: mode === "plug",
    };

    const switchMode = useCallback((next) => {
        if (next === "event") {
            if (mode !== "score") {
                setMode("none");
                setTimeout(() => setMode("score"), TRANSITION_MS);
            }
            setTimeout(() => setEventKey((k) => k + 1), TRANSITION_MS);
            return;
        }
        if (next === "none" || mode === next) {
            setMode("none");
            return;
        }
        setMode("none");
        setTimeout(() => setMode(next), TRANSITION_MS);
    }, [mode]);

    return (
        <>
            {/* ЛЕВЫЙ СЧЁТ */}
            <SlideInOut isOpen={is.score} from="left" top={64} left={86} durationMs={500}>
                <ScoreTop />
            </SlideInOut>

            {/* ПРАВЫЕ СПОНСОРЫ */}
            <SlideInOut isOpen={is.score} from="right" top={47} right={86} durationMs={500}>
                <SponsorsTop />
            </SlideInOut>

            {/* СОБЫТИЕ */}
            <SlideInOut
                from="left"
                bottom={86}
                left={86}
                showForMs={5000}
                durationMs={500}
                appearDelayMs={0}
                exitDelayMs={500}
                triggerKey={eventKey}
            >
                <InfoBlockBottom eventType={eventType} player={player} />
            </SlideInOut>

            {/* ОЖИДАНИЕ */}
            <SlideInOut isOpen={is.waiting} from="top" top={64} left="50%" durationMs={500}>
                <MainLogo />
            </SlideInOut>
            <SlideInOut isOpen={is.waiting} from="bottom" bottom={64} left="50%" durationMs={500}>
                <Waiting />
            </SlideInOut>

            {/* ПЕРЕРЫВ */}
            <SlideInOut isOpen={is.break} from="top" top={64} left="50%" durationMs={500}>
                <MainLogo />
            </SlideInOut>
            <SlideInOut isOpen={is.break} from="bottom" bottom={64} left="50%" durationMs={500}>
                <Waiting breakMatch />
            </SlideInOut>

            {/* СОСТАВ */}
            <SlideInOut isOpen={is.lineup} from="bottom" bottom="50%" left="50%" durationMs={500}>
                <StructureTeam />
            </SlideInOut>

            {/* ЗАГЛУШКА */}
            <SlideInOut
                isOpen={is.plug}
                from="top"
                top={0}
                left={0}
                bottom={0}
                right={0}
                durationMs={500}
            >
                <Plug />
            </SlideInOut>

            {/* ПУЛЬТ УПРАВЛЕНИЯ */}
            <ControlPanel
                mode={mode}
                onSwitch={switchMode}
                eventType={eventType}
                onChangeEventType={setEventType}
            />
        </>
    );
}

export default Main_Page;
