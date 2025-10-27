import React, { useState } from "react";
import ScoreTop from "../Blocks/ScoreTop/ScoreTop";
import SponsorsTop from "../Blocks/SponsorsTop/SponsorsTop";
import SlideInOut from "../Blocks/SlideInOut/SlideInOut";
import InfoBlockBottom from "../Blocks/InfoBlockBottom/InfoBlockBottom";
import Waiting from "../Blocks/Waiting/Waiting";
import MainLogo from "../Blocks/MainLogo/MainLogo";

function Main_Page({ children, ...props }) {
    const [event, setEvent] = useState("yellow");
    const [openScore, setOpenScore] = useState(false);
    const [openWating, setOpenWating] = useState(false);
    const [openBreak, setOpenBreak] = useState(false);
    const [showEvent, setshowEvent] = useState(0);
    const [isChange, setIsChange] = useState(false);

    let player = {
        name: "А. Агержаноков",
        teamName: "ФК Ветерок",
        photo: "football_team_player_photo.png",
        teamLogo: "football_team_logo.png"
    }

    return (
        <>
            <SlideInOut
                isOpen={openScore}
                from="left"
                top={64}
                left={86}
                durationMs={500}
            >
                <ScoreTop />
            </SlideInOut>

            <SlideInOut
                isOpen={openScore}
                from="right"
                top={47}
                right={86}
                durationMs={500}
            >
                <SponsorsTop />
            </SlideInOut>

            <SlideInOut
                from="left"
                bottom={86}
                left={86}
                showForMs={5000}
                durationMs={500}
                appearDelayMs={0}
                exitDelayMs={500}
                triggerKey={showEvent}
            >
                <InfoBlockBottom
                    eventType={event}
                    player={player}
                />
            </SlideInOut>

            <SlideInOut
                isOpen={openWating}
                from="top"
                top={64}
                left={"50%"}
                durationMs={500}
            >
                <MainLogo />
            </SlideInOut>


            <SlideInOut
                isOpen={openWating}
                from="bottom"
                bottom={64}
                left={"50%"}
                durationMs={500}
            >
                <Waiting />
            </SlideInOut>

            <SlideInOut
                isOpen={openBreak}
                from="top"
                top={64}
                left={"50%"}
                durationMs={500}
            >
                <MainLogo />
            </SlideInOut>


            <SlideInOut
                isOpen={openBreak}
                from="bottom"
                bottom={64}
                left={"50%"}
                durationMs={500}
            >
                <Waiting breakMatch={true} />
            </SlideInOut>

            <button onClick={() => {
                setOpenWating(false)
                setOpenBreak(false)

                setTimeout(() => {
                    setOpenScore(o => !o)
                }, 500)
            }}>
                {openScore ? 'Скрыть' : "Показать"} счет и спонсоров
            </button>

            <button onClick={() => {
                setOpenScore(true)
                setOpenWating(false)
                setOpenBreak(false)

                setTimeout(() => {
                    setshowEvent(k => k + 1)
                }, 500)
            }}>
                Событие
            </button>

            <button onClick={() => {
                setOpenScore(false)
                setOpenBreak(false)

                setTimeout(() => {
                    setOpenWating(o => !o);
                }, 500)

            }}>
                Ожидание
            </button>

            <button onClick={() => {
                setOpenWating(false);
                setOpenScore(false)

                setTimeout(() => {
                    setOpenBreak(o => !o);
                }, 500)
            }}>
                Перерыв
            </button>

        </>
    );
}

export default Main_Page;