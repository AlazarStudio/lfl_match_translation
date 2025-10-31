import React from "react";
import classes from './InfoBlockBottom.module.css';

function InfoBlockBottom({ children, eventType, player, ...props }) {
    return (
        <div className={classes.infoBlockBottom}>
            <div className={classes.infoBlockBottom_left}>
                <div className={classes.infoBlockBottom_logoTeam}>
                    <img src={`${player.teamLogo}`} alt="" />
                </div>
                <div className={classes.infoBlockBottom_player}>
                    <div className={classes.infoBlockBottom_player_photo}>
                        <img src={`${player.photo ? player.photo : "no-img.webp"}`} alt="" />
                    </div>
                    <div className={classes.infoBlockBottom_player_info}>
                        <div className={classes.infoBlockBottom_player_info_name}>{player.name}</div>
                        <div className={classes.infoBlockBottom_player_info_teamName}>{player.teamName}</div>
                    </div>
                </div>
            </div>
            <div className={classes.infoBlockBottom_event}>
                <div className={classes.infoBlockBottom_event_img}>
                    {eventType == 'yellow' && <img src="yellow.png" alt="" />}
                    {eventType == 'red' && <img src="red.png" alt="" />}
                    {eventType == 'goal' && <img src="ball.png" alt="" />}
                </div>
                <div className={classes.infoBlockBottom_event_time}>{player.minute}’</div>
            </div>
        </div>
    );
}

export default InfoBlockBottom;