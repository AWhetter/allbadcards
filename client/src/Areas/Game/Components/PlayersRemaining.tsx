import Chip from "@material-ui/core/Chip";
import {AiFillCrown} from "react-icons/all";
import {ClockLoader} from "react-spinners";
import {Typography} from "@material-ui/core";
import * as React from "react";
import {useDataStore} from "../../../Global/Utils/HookUtils";
import {GameDataStore} from "../../../Global/DataStore/GameDataStore";
import {UserDataStore} from "../../../Global/DataStore/UserDataStore";

export const PlayersRemaining = () =>
{
	const gameData = useDataStore(GameDataStore);
	const userData = useDataStore(UserDataStore);

	if (!gameData.game)
	{
		return null;
	}

	const {
		players,
		roundCards,
		chooserGuid,
		roundStarted
	} = gameData.game;

	const remainingPlayerGuids = Object.keys(players ?? {})
		.filter(pg => !(pg in (roundCards ?? {})) && pg !== chooserGuid);

	const remainingPlayers = remainingPlayerGuids.map(pg => players?.[pg]?.nickname);
	const chooserIsMe = userData.playerGuid === chooserGuid;
	const chooser = chooserIsMe ? "You!" : players?.[chooserGuid!]?.nickname;

	const hasWinner = !!gameData.game?.lastWinner;

	return (
		<>
			<Chip
				color={"primary"}
				icon={<AiFillCrown/>}
				label={chooser}
			/>
			{roundStarted && remainingPlayers.map(player => (
				<Chip
					style={{marginLeft: 3, marginBottom: 3, paddingLeft: 8}}
					avatar={<ClockLoader size={15}/>}
					label={player}
				/>
			))}
			{!hasWinner && remainingPlayers.length === 0 && (
				<Typography variant={"body1"} style={{marginTop: "0.5rem"}}>
					{`Waiting for ${players?.[chooserGuid ?? ""]?.nickname} to pick the winner.`}
				</Typography>
			)}
		</>
	);
};