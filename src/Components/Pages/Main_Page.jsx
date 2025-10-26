import React, { useState } from "react";
import ScoreTop from "../Blocks/ScoreTop/ScoreTop";
import SponsorsTop from "../Blocks/SponsorsTop/SponsorsTop";
import SlideInOut from "../Blocks/SlideInOut/SlideInOut";
import InfoBlockBottom from "../Blocks/InfoBlockBottom/InfoBlockBottom";

function Main_Page({ children, ...props }) {
    const [event, setEvent] = useState("yellow");
    const [openScore, setOpenScore] = useState(false);
    const [openSponsorTop, setOpenSponsorTop] = useState(false);
    const [showEvent, setshowEvent] = useState(0);

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
                bottom={113}
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



            <button onClick={() => setOpenScore(o => !o)}>
                {openScore ? 'Скрыть' : "Показать"} счет и спонсоров
            </button>
            <button onClick={() => setshowEvent(k => k + 1)}>Событие</button>

        </>
    );
}

export default Main_Page;