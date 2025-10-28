import React from "react";
import classes from './Plug.module.css';

function Plug({ children, ...props }) {
    return (
        <div className={classes.plug}>
            <div className={classes.plug_log}>
                <img src="mfl_logo_big.png" alt="" />
            </div>
            <div className={classes.plug_name}>ЗИМНИЙ КУБОК <br /> 5Х5</div>

            <div className={classes.waiting}>
                <div className={classes.waitingLine}>
                    <div className={classes.waitingLine_logo}>
                        <img src="team1.png" alt="" />
                    </div>
                    <div className={classes.waitingLine_team}>ФК Ветерок</div>
                    <div className={classes.waitingLine_vs}>VS</div>
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
        </div>
    );
}

export default Plug;