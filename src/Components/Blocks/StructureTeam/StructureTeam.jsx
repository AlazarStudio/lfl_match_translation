import React from "react";
import classes from './StructureTeam.module.css';

function StructureTeam({ children, team, ...props }) {
    return (
        <div className={classes.structureTeam}>
            <div className={classes.structureTeam_header}>
                <div className={classes.structureTeam_header_logo}>
                    <img src="structure_logo.png" alt="" />
                </div>
                <div className={classes.structureTeam_header_sponsors}>
                    <img src="sponsors4.png" alt="" />
                </div>
            </div>
            <div className={classes.structureTeam_main}>
                <div className={classes.structureTeam_main_teamLogo}>
                    <img src={`${team?.logo ? team?.logo : "no_logo.png"}`} alt="" />
                    <div className={classes.structureTeam_main_teamLogo_name}>{`${team?.title ? team?.title : "Название команды"}`}</div>
                </div>
                <div className={classes.structureTeam_main_teamList}>
                    {team?.lineup?.length > 0 ? team?.lineup.map((item) => {
                        <div className={classes.structureTeam_main_teamList_item}>
                            <div className={classes.structureTeam_main_teamList_item_block}>
                                <div className={classes.structureTeam_main_teamList_item_img}><img src="football_team_player_photo.png" alt="" /></div>
                                <div className={classes.structureTeam_main_teamList_item_name}>А. Агержаноков</div>
                            </div>
                            <div className={classes.structureTeam_main_teamList_item_num}>10</div>
                        </div>
                    }) : <div className={classes.structureTeam_main_teamList_item_name}>Список игроков команды {team?.title ?  team?.title : '"Название команды"'} пуст</div>}
                </div>
            </div>
        </div>
    );
}

export default StructureTeam;