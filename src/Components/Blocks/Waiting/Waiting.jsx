import React from "react";
import classes from './Waiting.module.css';

function Waiting({ children, breakMatch = false, ...props }) {
    return (
        <div className={classes.waiting}>
            <div className={classes.waitingLine}>
                <div className={classes.waitingLine_wait}>
                    {breakMatch ? "перерыв" : "ожидание"}
                </div>
            </div>
            <div className={classes.waitingLine}>
                <div className={classes.waitingLine_logo}>
                    <img src="team1.png" alt="" />
                </div>
                <div className={classes.waitingLine_team}>ФК Ветерок</div>
                <div className={classes.waitingLine_vs}>{breakMatch ? '0-2' : 'VS'}</div>
                <div className={classes.waitingLine_team}>МЕККА</div>
                <div className={classes.waitingLine_logo}>
                    <img src="team2.png" alt="" />
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