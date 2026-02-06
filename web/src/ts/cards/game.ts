type FixedArr<T, L extends number, Acc extends T[] = []> = Acc["length"] extends L ? Acc : FixedArr<T, L, [...Acc, T]>;
type TileBase = {};
type PlayerTile = TileBase & {
	type: "player";
	side: "p1" | "p2";
	moveCount: 1 | 2;
};
type NeutralTile = TileBase & {
	type: "neutral";
};
type EmptyTile = TileBase & {
	type: "empty";
	collectedBy: "p1" | "p2" | null;
	wasPlayer: boolean;
};
type Tile = PlayerTile | NeutralTile | EmptyTile;
type Player = {
	side: "p1" | "p2";
	collected: number;
};

type Field = {
	tiles: FixedArr<FixedArr<Tile, 6>, 6>;
	players: { p1: Player; p2: Player };
	turnOf: "p1" | "p2";
	state: "playing" | "p1-won" | "p2-won" | "tie";
};

export function createField(): Field {
	const p1: Player = { side: "p1", collected: 0 };
	const p2: Player = { side: "p2", collected: 0 };
	const neutralTile: NeutralTile = { type: "neutral" };
	const field: Field = {
		tiles: Array.from({ length: 6 })
			.fill(null)
			.map(() => Array(6).fill(neutralTile)) as FixedArr<FixedArr<Tile, 6>, 6>,
		players: { p1, p2 },
		turnOf: "p1",
		state: "playing",
	};
	field.tiles[1][0] = { type: "player", side: "p1", moveCount: 1 };
	field.tiles[2][0] = { type: "player", side: "p1", moveCount: 2 };
	field.tiles[3][0] = { type: "player", side: "p1", moveCount: 1 };
	field.tiles[4][0] = { type: "player", side: "p1", moveCount: 2 };
	field.tiles[1][5] = { type: "player", side: "p2", moveCount: 1 };
	field.tiles[2][5] = { type: "player", side: "p2", moveCount: 2 };
	field.tiles[3][5] = { type: "player", side: "p2", moveCount: 1 };
	field.tiles[4][5] = { type: "player", side: "p2", moveCount: 2 };
	return field;
}

export function createTileSpan(tile: Tile): HTMLSpanElement {
	const span = document.createElement("span");
	switch (tile.type) {
		case "player":
			const playerIcon = document.createElement("i");
			span.appendChild(playerIcon);
			playerIcon.classList.add("lar");
			if (tile.moveCount === 1) {
				playerIcon.classList.add("la-circle");
			} else {
				playerIcon.classList.add("la-dot-circle");
			}
			if (tile.side === "p1") {
				span.classList.add("text-blue-500");
			} else {
				span.classList.add("text-red-500");
			}
			break;
		case "neutral":
			span.textContent = "#";
			span.classList.add("text-stone-500");
			break;
		case "empty":
			span.textContent = "⋅";	
			if (tile.collectedBy === "p1") {
				span.classList.add("text-blue-800");
			} else if (tile.collectedBy === "p2") {
				span.classList.add("text-red-900");
			} else {
				span.classList.add("text-stone-700");
			}
			break;
	}
	return span;
}

export function renderField(field: Field) {
	const p1score = document.getElementById("p1-score")!;
	p1score.textContent = field.players.p1.collected.toString();
	const p2score = document.getElementById("p2-score")!;
	p2score.textContent = field.players.p2.collected.toString();
	if (field.players.p1.collected > field.players.p2.collected) {
		p1score.classList.add("text-4xl");
		p2score.classList.remove("text-4xl");
	} else if (field.players.p2.collected > field.players.p1.collected) {
		p2score.classList.add("text-4xl");
		p1score.classList.remove("text-4xl");
	} else {
		p1score.classList.remove("text-4xl");
		p2score.classList.remove("text-4xl");
	}
	const turnOf = document.getElementById("turn-of")!;
	if (field.state === "playing") {
		if (field.turnOf === "p1") {
			turnOf.textContent = "Player 1's turn";
			turnOf.classList.add("text-blue-500");
			turnOf.classList.remove("text-red-500");
		} else {
			turnOf.textContent = "Player 2's turn";
			turnOf.classList.add("text-red-500");
			turnOf.classList.remove("text-blue-500");
		}
	} else if (field.state === "p1-won") {
		turnOf.textContent = "Player 1 wins!";
		turnOf.classList.add("text-green-500");
		turnOf.classList.remove("text-blue-500");
		turnOf.classList.remove("text-red-500");
	} else if (field.state === "p2-won") {
		turnOf.textContent = "Player 2 wins!";
		turnOf.classList.add("text-green-500");
		turnOf.classList.remove("text-blue-500");
		turnOf.classList.remove("text-red-500");
	} else if (field.state === "tie") {
		turnOf.textContent = "It's a tie!";
		turnOf.classList.add("text-green-500");
		turnOf.classList.remove("text-blue-500");
		turnOf.classList.remove("text-red-500");
	}

	const fieldEl = document.getElementById("field")!;
	fieldEl.innerHTML = ""; // Clear previous content
	fieldEl.appendChild(document.createElement("span")); // Empty top-left corner
	[1, 2, 3, 4, 5, 6].forEach((i) => {
		const colHeader = document.createElement("span");
		colHeader.textContent = i.toString();
		fieldEl.appendChild(colHeader);
	});
	const rowHeaders = ["A", "B", "C", "D", "E", "F"];
	field.tiles.forEach((row, rowIndex) => {
		const rowHeader = document.createElement("span");
		rowHeader.textContent = rowHeaders[rowIndex];
		fieldEl.appendChild(rowHeader);
		row.forEach((tile) => {
			fieldEl.appendChild(createTileSpan(tile));
		});
	});
}

type Position = `${"a" | "b" | "c" | "d" | "e" | "f"}${1 | 2 | 3 | 4 | 5 | 6}`;
type Vec2 = { x: number; y: number };
function getTileAt(field: Field, pos: Position) {
	const vec = posToVec2(pos);
	return field.tiles[vec.y][vec.x];
}

export function parsePosition(input: string): Position | null {
	const posRegex = /^([a-f])([1-6])$/;
	const match = input.match(posRegex);
	if (!match) {
		return null;
	}
	const row = match[1] as Position[0];
	const col = match[2] as Position[1];
	return `${row}${col}` as Position;
}

export function posToVec2(pos: Position): Vec2 {
	const row = pos.charCodeAt(0) - "a".charCodeAt(0);
	const col = parseInt(pos[1]) - 1;
	return { x: col, y: row };
}

function vec2PlusDir(vec: Vec2, dir: MoveDir): Vec2 {
	switch (dir) {
		case "u":
			return { x: vec.x, y: vec.y - 1 };
		case "d":
			return { x: vec.x, y: vec.y + 1 };
		case "l":
			return { x: vec.x - 1, y: vec.y };
		case "r":
			return { x: vec.x + 1, y: vec.y };
	}
}

type MoveDir = "u" | "d" | "l" | "r";
type Move = `${Position}${MoveDir}${MoveDir | ""}`;
type MoveResultBase = {};
type ValidMoveResult = MoveResultBase & {
	valid: true;
};
type InvalidMoveResult = MoveResultBase & {
	valid: false;
	reason: string;
};
type MoveResult = ValidMoveResult | InvalidMoveResult;

export function parseMove(input: string): Move | null {
	const moveRegex = /^([a-f][1-6])([udlr])([udlr]?)$/;
	const match = input.match(moveRegex);
	if (!match) {
		return null;
	}
	const pos = match[1] as Position;
	const dir1 = match[2] as MoveDir;
	const dir2 = match[3] as MoveDir | "";
	return `${pos}${dir1}${dir2}`;
}

export function getMoveDestination(move: Move): Vec2 {
	const pos = move.slice(0, 2) as Position;
	const dir1 = move[2] as MoveDir;
	const dir2: MoveDir | "" = (move[3] as MoveDir) || "";
	const vecPos = posToVec2(pos);

	const pos1 = vec2PlusDir(vecPos, dir1);
	if (dir2) {
		return vec2PlusDir(pos1, dir2);
	} else {
		return pos1;
	}
}

export function highlightTileAt(field: Field, pos: Position | Vec2 | null) {
	const vec = typeof pos === "string" ? posToVec2(pos) : pos;
	const fieldEl = document.getElementById("field")!;
	// Remove highlight for all other tiles
	for (let i = 0; i < fieldEl.children.length; i++) {
		(fieldEl.children[i] as HTMLElement).classList.remove("text-yellow-300");
	}
	if (vec) {
		// +7 to account for row/column headers and 0-based indexing
		const index = (vec.y + 1) * 7 + (vec.x + 1);
		const tileEl = fieldEl.children[index] as HTMLElement;
		tileEl.classList.add("text-yellow-300");
	}
}

export function doMove(field: Field, move: Move): MoveResult {
	const pos = move.slice(0, 2) as Position;
	const dir1 = move[2] as MoveDir;
	const dir2: MoveDir | "" = (move[3] as MoveDir) || "";
	const vec = posToVec2(pos);

	const validateResult = validateMove(field, vec, dir1, dir2);
	if (validateResult !== null) {
		return validateResult;
	}

	const playerTile = getTileAt(field, pos) as PlayerTile;
	field.tiles[vec.y][vec.x] = { type: "empty", collectedBy: field.turnOf, wasPlayer: false };

	const newPos1 = vec2PlusDir(vec, dir1);
	if (dir2) {
		field.tiles[newPos1.y][newPos1.x] = { type: "empty", collectedBy: field.turnOf, wasPlayer: false };
		const newPos2 = vec2PlusDir(newPos1, dir2);
		field.tiles[newPos2.y][newPos2.x] = playerTile;
		field.players[playerTile.side].collected += 2;
	} else {
		field.tiles[newPos1.y][newPos1.x] = playerTile;
		field.players[playerTile.side].collected += 1;
	}

	// Kill all player tiles that have no valid moves
	for (let y = 0; y < 6; y++) {
		for (let x = 0; x < 6; x++) {
			const tile = field.tiles[y][x];
			if (tile.type === "player") {
				if (!hasValidMoves(field, { x, y })) {
					field.tiles[y][x] = { type: "empty", collectedBy: field.turnOf, wasPlayer: true };
					field.players[field.turnOf].collected += 1;
				}
			}
		}
	}

	// Change turn only if the other player still has player tiles
	const otherPlayerSide = field.turnOf === "p1" ? "p2" : "p1";
	const playersWithTiles = whichPlayersHaveTiles(field);
	const thisPlayerHasTiles = playersWithTiles[field.turnOf];
	const otherPlayerHasTiles = playersWithTiles[otherPlayerSide];
	if (otherPlayerHasTiles) {
		field.turnOf = field.turnOf === "p1" ? "p2" : "p1";
	}
	if (!thisPlayerHasTiles && !otherPlayerHasTiles) {
		endGame(field);
	}
	return { valid: true };
}

function whichPlayersHaveTiles(field: Field): { p1: boolean; p2: boolean } {
	let p1has = false;
	let p2has = false;
	for (let y = 0; y < 6; y++) {
		for (let x = 0; x < 6; x++) {
			const tile = field.tiles[y][x];
			if (tile.type === "player") {
				if (tile.side === "p1") {
					p1has = true;
				} else if (tile.side === "p2") {
					p2has = true;
				}
			}
		}
	}
	return { p1: p1has, p2: p2has };
}

function endGame(field: Field) {
	const p1score = field.players.p1.collected;
	const p2score = field.players.p2.collected;
	if (p1score > p2score) {
		field.state = "p1-won";
	} else if (p2score > p1score) {
		field.state = "p2-won";
	} else {
		field.state = "tie";
	}
}

function validateMove(field: Field, vecPos: Vec2, dir1: MoveDir, dir2: MoveDir | ""): InvalidMoveResult | null {
	// Check bounds of starting position
	if (vecPos.x < 0 || vecPos.x >= 6 || vecPos.y < 0 || vecPos.y >= 6) {
		return { valid: false, reason: "Starting position out of bounds" };
	}

	// Check starting tile
	const tile = field.tiles[vecPos.y][vecPos.x];
	if (tile.type !== "player") {
		return { valid: false, reason: "No player tile at the starting position" };
	}

	const pos1 = vec2PlusDir(vecPos, dir1);
	const pos2 = dir2 ? vec2PlusDir(pos1, dir2) : null;

	// Check bounds
	if (pos1.x < 0 || pos1.x >= 6 || pos1.y < 0 || pos1.y >= 6) {
		return { valid: false, reason: "First move goes out of bounds" };
	}
	if (pos2 && (pos2.x < 0 || pos2.x >= 6 || pos2.y < 0 || pos2.y >= 6)) {
		return { valid: false, reason: "Second move goes out of bounds" };
	}

	// Check first move tile
	const tile1 = field.tiles[pos1.y][pos1.x];
	if (tile1.type === "player") {
		return { valid: false, reason: "First move lands on another player tile" };
	}
	if (tile1.type === "empty") {
		return { valid: false, reason: "First move lands on an empty tile" };
	}

	// Check second move tile if applicable
	if (dir2) {
		const tile2 = field.tiles[pos2!.y][pos2!.x];
		if (tile2.type === "player") {
			return { valid: false, reason: "Second move lands on another player tile" };
		}
		if (tile2.type === "empty") {
			return { valid: false, reason: "Second move lands on an empty tile" };
		}
	}

	// Check move length vs player's move count
	const moveLength = dir2 ? 2 : 1;
	if (moveLength !== tile.moveCount) {
		return { valid: false, reason: "Move length does not match player's move count" };
	}

	// Check turn
	if (field.turnOf !== tile.side) {
		return { valid: false, reason: "It's not this player's turn" };
	}

	return null;
}

function hasValidMoves(field: Field, vecPos: Vec2): boolean {
	const tile = field.tiles[vecPos.y][vecPos.x];
	if (tile.type !== "player") {
		return false;
	}

	// If all neighboring tiles are oob, empty, or player, return false
	const directions: MoveDir[] = ["u", "d", "l", "r"];
	for (const dir1 of directions) {
		const pos1 = vec2PlusDir(vecPos, dir1);
		if (pos1.x < 0 || pos1.x >= 6 || pos1.y < 0 || pos1.y >= 6) {
			continue;
		}
		const tile1 = field.tiles[pos1.y][pos1.x];
		if (tile1.type === "neutral") {
			if (tile.moveCount === 1) {
				return true;
			} else {
				for (const dir2 of directions) {
					const pos2 = vec2PlusDir(pos1, dir2);
					if (pos2.x < 0 || pos2.x >= 6 || pos2.y < 0 || pos2.y >= 6) {
						continue;
					}
					if (pos2.x === vecPos.x && pos2.y === vecPos.y) {
						continue; // Can't move back to original position
					}
					const tile2 = field.tiles[pos2.y][pos2.x];
					if (tile2.type === "neutral") {
						return true;
					}
				}
			}
		}
	}
	return false;
}
