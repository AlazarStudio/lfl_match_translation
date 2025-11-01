import React from "react";
import classes from './PlugBetween.module.css';

function PlugBetween({ children, team1, team2, ...props }) {
    return (
        <div className={classes.plug}>
            <div className={classes.plug_log}>
                <img src="mfl_logo_big.png" alt="" />
            </div>

            <div className={classes.waiting}>
                <div className={classes.waitingLine}>

                </div>
                <div className={classes.waitingLine}>
                    <div className={classes.waitingLine_sponsors}>
                        <img src="sponsors3.png" alt="" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PlugBetween;