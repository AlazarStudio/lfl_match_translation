import React from "react";
import classes from './SponsorsTop.module.css';

function SponsorsTop({ children, ...props }) {
    return (
        <div className={classes.sponsorsTop}>
            <div className={classes.sponsorsTop_logo}>
                <img src="sponsors.png" alt="" />
            </div>
            <div className={classes.sponsorsTop_live}>ПРЯМОЙ ЭФИР</div>
        </div>
    );
}

export default SponsorsTop;