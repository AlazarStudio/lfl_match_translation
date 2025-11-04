import React from "react";
import classes from './Plug.module.css';

function Plug({ children, team1, team2, ...props }) {
    return (
        <div className={classes.plug}>
            <div className={classes.plug_log}>
                <img src="mfl_logo_big.png" alt="" />
            </div>
            <div className={classes.plug_name}>ЗИМНИЙ КУБОК <br /> 5Х5</div>

            <div className={classes.waiting}>
                <div className={classes.waitingLine}>
                    <div className={classes.waitingLine_logo}>
                        <img src={team1?.logo} alt="" />
                    </div>
                    <div className={classes.waitingLine_team}>{team1?.title}</div>
                    <div className={classes.waitingLine_vs}>VS</div>
                    <div className={classes.waitingLine_team}>{team2?.title}</div>
                    <div className={classes.waitingLine_logo}>
                        <img src={team2?.logo} alt="" />
                    </div>
                </div>
                <div className={classes.waitingLine}>
                    <div className={classes.waitingLine_sponsors}>
                        <img src="sponsorsNew.png" alt="" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Plug;