import React from "react";
import classes from './ScoreTop.module.css';
import { useMatchEvents } from "../../../state/matchEvents";

function ScoreTop({ children, team1Score, team2Score, team1, team2, ...props }) {
    const clock = useMatchEvents((s) => s.clock);
    const timeText = clock?.formatted;
    return (
        <div className={classes.scoreTop}>
            <div className={classes.scoreTop_logo}>
                <img src="/lfl_logo.png" alt="" />
            </div>

            <div className={classes.scoreTop_info}>
                <div className={classes.scoreTop_info_top}>
                    <div className={classes.scoreTop_info_top_left}>
                        {/* <div className={classes.scoreTop_info_top_left_color}></div> */}
                        <div className={classes.scoreTop_info_top_left_team}>{team1?.title}</div>
                    </div>

                    <div className={classes.scoreTop_info_top_center}>
                        <div className={classes.scoreTop_info_top_center_score}>{team1Score} - {team2Score}</div>
                    </div>

                    <div className={classes.scoreTop_info_top_right}>
                        <div className={classes.scoreTop_info_top_right_team}>{team2?.title}</div>
                        {/* <div className={classes.scoreTop_info_top_right_color}></div> */}
                    </div>
                </div>

                <div className={classes.scoreTop_info_bottom}>
                    <div className={classes.scoreTop_info_bottom_time}>
                        {/* {clock?.phase === "H1" ? "Т1" : clock?.phase === "H2" ? "Т2s" : ""} -  */}
                        {timeText}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ScoreTop;