import React from "react";
import classes from './InfoBlockBottom.module.css';

function InfoBlockBottom({ children, eventType, player, commentator, ...props }) {
    let shortName = player?.name

    if (player?.name?.includes("-")) {
        shortName = player?.name?.split("-")[0] + '-' + player?.name?.split("-")[1][0]
    }

    return (
        <div className={classes.infoBlockBottom}>
            <div className={classes.infoBlockBottom_left}>
                <div className={classes.infoBlockBottom_logoTeam}>
                    <img src={`${player.teamLogo}`} alt="" />
                </div>

                {!commentator ?
                    <div className={classes.infoBlockBottom_player}>
                        <div className={classes.infoBlockBottom_player_photo}>
                            <img src={`${player.photo ? player.photo : "no-img.webp"}`} alt="" />
                        </div>
                        <div className={classes.infoBlockBottom_player_info}>
                            {/* <div className={classes.infoBlockBottom_player_info_name}>{player?.name?.split("-")[0]+'-'+player?.name?.split("-")[1][0]}</div> */}
                            <div className={classes.infoBlockBottom_player_info_name} >{shortName}</div>
                            <div className={classes.infoBlockBottom_player_info_teamName}>{player?.teamName}</div>
                        </div>
                    </div>
                    :
                    <div className={classes.infoBlockBottom_player}>
                        {/* <div className={classes.infoBlockBottom_player_photo}>
                            <img src={`${player.photo ? player.photo : "no-img.webp"}`} alt="" />
                        </div> */}
                        <div className={classes.infoBlockBottom_player_info}>
                            <div className={classes.infoBlockBottom_player_info_commentators}>
                                {commentator.map((item, index) => (
                                    <div
                                        key={index}
                                        className={classes.infoBlockBottom_player_info_name}
                                    >
                                        {commentator.length == index+1 ? item.commentator.name : item.commentator.name + ','}
                                    </div>
                                ))}
                            </div>

                            <div className={classes.infoBlockBottom_player_info_teamName}>{commentator.length >= 2 ? 'Комментаторы матча' : 'Комментатор матча'}</div>
                        </div>
                    </div>
                }

            </div>
            <div className={classes.infoBlockBottom_event}>
                <div className={classes.infoBlockBottom_event_img}>
                    {eventType == 'yellow' && <img src="yellow.png" alt="" />}
                    {eventType == 'red' && <img src="red.png" alt="" />}
                    {eventType == 'goal' && <img src="ball.png" alt="" />}
                    {eventType == 'judge' && <img src="judge.png" alt="" />}
                    {eventType == 'commentator' && <img src="commentator.png" alt="" />}
                </div>
                <div className={classes.infoBlockBottom_event_time}>{player.minute ? player.minute + " ’" : ''}</div>
            </div>
        </div>
    );
}

export default InfoBlockBottom;