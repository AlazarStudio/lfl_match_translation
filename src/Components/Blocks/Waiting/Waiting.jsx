import React from "react";
import classes from './Waiting.module.css';

function Waiting({ children, breakMatch = false, team1, team2, team1Score, team2Score, ...props }) {
    return (
        <div className={classes.waiting}>
            <div className={classes.waitingLine}>
                <div className={classes.waitingLine_wait}>
                    {breakMatch ? "перерыв" : "ожидание"}
                </div>
            </div>
            <div className={classes.waitingLine}>
                <div className={classes.waitingLine_logo}>
                    <img src={team1?.logo} alt="" />
                </div>
                <div className={classes.waitingLine_team}>{team1?.title}</div>
                <div className={classes.waitingLine_vs}>{breakMatch ? `${team1Score} - ${team2Score}` : 'VS'}</div>
                <div className={classes.waitingLine_team}>{team2?.title}</div>
                <div className={classes.waitingLine_logo}>
                    <img src={team2?.logo} alt="" />
                </div>
            </div>
            <div className={classes.waitingLine}>
                <div className={classes.waitingLine_sponsors}>
                    <img src="sponsors3.png" alt="" />
                </div>
            </div>
        </div>
    );
}

export default Waiting;