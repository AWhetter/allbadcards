import {DataStore} from "./DataStore";
import {GameItem, IBlackCard, IPackDef, IWhiteCard, Platform} from "../Platform/platform";
import {UserDataStore} from "./UserDataStore";
import deepEqual from "deep-equal";
import {ArrayFlatten} from "../Utils/ArrayUtils";

export type WhiteCardMap = { [cardId: number]: IWhiteCard | undefined };

export interface IGameDataStorePayload
{
	game: GameItem | null;
	packs: IPackDef[];
	includedPacks: string[];
	includedCardcastPacks: string[];
	roundCardDefs: WhiteCardMap;
	playerCardDefs: WhiteCardMap;
	blackCardDef: IBlackCard | null;
}

class _GameDataStore extends DataStore<IGameDataStorePayload>
{
	public static Instance = new _GameDataStore({
		game: null,
		packs: [],
		roundCardDefs: {},
		playerCardDefs: {},
		includedPacks: [],
		includedCardcastPacks: [],
		blackCardDef: null
	});

	private ws: WebSocket | null = null;

	public initialize()
	{
		const isLocal = !!location.hostname.match("local");
		const url = isLocal ? `ws://${location.hostname}:8080` : `wss://${location.hostname}`;
		this.ws = new WebSocket(url);

		this.ws.onopen = (e) =>
		{
			console.log(e);
			this.ws?.send(JSON.stringify(UserDataStore.state));
		};

		this.ws.onmessage = (e) =>
		{
			const data = JSON.parse(e.data);
			this.update(data);
		};

		this.ws.onclose = () => {
			alert("You've lost your connection to the server - please try refreshing! If this continues happening, the server is probably under load. Sorry about that!");
		};

		Platform.getPacks()
			.then(data => this.update({
				packs: data,
				includedPacks: data.slice(0, 19).map(p => p.packId)
			}));
	}

	protected update(data: Partial<IGameDataStorePayload>)
	{
		let prev = {...this.state};

		super.update(data);

		console.groupCollapsed("[GameDataStore] Update...");
		console.log("New: ", data);
		console.log("Prev: ", prev);
		console.log("Result:", this.state);
		console.groupEnd();

		const meGuid = UserDataStore.state.playerGuid;

		if (!deepEqual(prev.game?.roundCards, this.state.game?.roundCards))
		{
			this.loadRoundCards();
		}

		if (!deepEqual(prev.game?.players[meGuid], this.state.game?.players[meGuid]))
		{
			this.loadPlayerCards(meGuid);
		}

		if (prev.game?.blackCard !== this.state.game?.blackCard)
		{
			this.loadBlackCard();
		}
	}

	private loadRoundCards()
	{
		const toLoad = this.state.game?.roundCards ?? [];

		const cardIds = ArrayFlatten<number>(Object.values(toLoad));

		return this.loadWhiteCardMap(cardIds)
			.then(roundCardDefs => this.update({
				roundCardDefs
			}));
	}

	private loadPlayerCards(playerGuid: string)
	{
		const toLoad = this.state.game?.players[playerGuid].whiteCards;
		if (!toLoad)
		{
			return;
		}

		const cardIds = Object.values(toLoad);

		return this.loadWhiteCardMap(cardIds)
			.then(playerCardDefs => this.update({
				playerCardDefs
			}));
	}

	private loadBlackCard()
	{
		return Platform.getBlackCard(this.state.game?.blackCard!)
			.then(blackCardDef => this.update({
				blackCardDef
			}));
	}

	private async loadWhiteCardMap(cardIds: number[]): Promise<WhiteCardMap>
	{
		const data = await Platform.getWhiteCards(cardIds);
		const map = cardIds.reduce((acc, cardId, i) =>
		{
			acc[cardId] = data[i];
			return acc;
		}, {} as WhiteCardMap);

		return map;
	}

	public hydrate(gameId: string)
	{
		console.log("[GameDataStore] Hydrating...", gameId);

		return Platform.getGame(gameId)
			.then(data =>
			{
				this.update({
					game: data
				});
			})
			.catch(e => console.error(e));
	}

	public playWhiteCards(cardIds: number[] | undefined, userGuid: string)
	{
		console.log("[GameDataStore] Played white cards...", cardIds, userGuid);

		if (!this.state.game || !cardIds)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.playCards(this.state.game.id, userGuid, cardIds)
			.catch(e => console.error(e));
	}

	public chooseWinner(chooserGuid: string, winningPlayerGuid: string)
	{
		if (!this.state.game || !chooserGuid)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.selectWinnerCard(this.state.game.id, chooserGuid, winningPlayerGuid)
			.catch(e => console.error(e));
	}

	public revealNext(userGuid: string)
	{
		if (!this.state.game)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.revealNext(this.state.game.id, userGuid)
			.catch(e => console.error(e));
	}

	public startRound(userGuid: string)
	{
		if (!this.state.game)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.startRound(this.state.game.id, userGuid)
			.catch(e => console.error(e));
	}

	public setIncludedPacks(includedPacks: string[])
	{
		this.update({
			includedPacks
		});
	}

	public setIncludedCardcastPacks(includedCardcastPacks: string[])
	{
		this.update({
			includedCardcastPacks
		});
	}

	public forfeit(playerGuid: string, cardsNeeded: number)
	{
		const game = this.state.game;
		if (!game)
		{
			throw new Error("Invalid card or game!");
		}

		const toPlay: number[] = [];
		const myCards = game.players[playerGuid].whiteCards;
		while(toPlay.length < cardsNeeded)
		{
			let cardIndex = Math.floor(Math.random() * myCards.length);
			const card = myCards[cardIndex];
			if(!toPlay.includes(card))
			{
				toPlay.push(card);
			}
		}

		this.playWhiteCards(toPlay, playerGuid)
			.then(() => {
				Platform.forfeit(game.id, playerGuid, toPlay);
			});
	}
}

export const GameDataStore = _GameDataStore.Instance;