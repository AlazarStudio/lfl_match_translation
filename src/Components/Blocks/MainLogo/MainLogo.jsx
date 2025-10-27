import React from "react";
import classes from './MainLogo.module.css';

function MainLogo({ children, ...props }) {
    return ( 
        <div className={classes.mainLogo}>
            <img src="mfl_logo_big.png" alt="" />
        </div>
     );
}

export default MainLogo;