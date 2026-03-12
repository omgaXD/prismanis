const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
const sizeInput = document.getElementById("size-input") as HTMLInputElement;

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let size = 6;

function resizeCanvas() {
	canvas.width = canvas.parentElement?.clientWidth || 800;
	canvas.height = canvas.width;
}

const dirs: Dir[] = [
	[0, 1],
	[0, -1],
	[1, 0],
	[-1, 0],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1],
];
type Dir = [0, 1] | [0, -1] | [1, 0] | [-1, 0] | [1, 1] | [1, -1] | [-1, 1] | [-1, -1];
type DirSeq = Dir[];
type DirValidationResult =
	| "valid"
	| "out-of-bounds"
	| "self-intersection"
	| "diag-intersection"
	| "not-closed"
	| "too-short"
	| "repetitve"
	| "start-unreachable"
	| "produces-orphans";

const cardinalDirs = [
	[0, 1],
	[0, -1],
	[1, 0],
	[-1, 0],
] as const;

/**
 * Returns true if any connected component of unvisited cells has no cardinal
 * neighbour equal to the current path head (value `pathLength + 1`), meaning
 * the path can never reach those cells regardless of future moves.
 */
function hasOrphanChunks(visited: number[], pathLength: number): boolean {
	const total = (size + 1) * (size + 1);
	const currentHead = pathLength + 1;
	const seen = new Uint8Array(total);

	for (let start = 0; start < total; start++) {
		if (visited[start] !== 0 || seen[start]) continue;

		// BFS over this connected chunk of unvisited cells
		const queue: number[] = [start];
		seen[start] = 1;
		let touchesHead = false;

		for (let qi = 0; qi < queue.length; qi++) {
			const cell = queue[qi];
			const cy = Math.floor(cell / (size + 1));
			const cx = cell % (size + 1);

			for (const [dx, dy] of cardinalDirs) {
				const nx = cx + dx;
				const ny = cy + dy;
				if (nx < 0 || nx > size || ny < 0 || ny > size) continue;
				const nIdx = ny * (size + 1) + nx;
				if (visited[nIdx] === 0) {
					if (!seen[nIdx]) {
						seen[nIdx] = 1;
						queue.push(nIdx);
					}
				} else if (visited[nIdx] === currentHead) {
					touchesHead = true;
				}
			}
		}

		if (!touchesHead) return true;
	}

	return false;
}

function validateDirSeq(seq: DirSeq): DirValidationResult {
	const visited = Array.from({ length: (size + 1) * (size + 1) }, () => 0);
	let x = 0;
	let y = 0;
	visited[0] = 1;
	for (let i = 0; i < seq.length; i++) {
		const [dx, dy] = seq[i];
		x += dx;
		y += dy;
		if (x < 0 || x > size || y < 0 || y > size) {
			return "out-of-bounds";
		}
		if (visited[y * (size + 1) + x] && !(i === (size + 1) * (size + 1) - 1 && x === 0 && y === 0)) {
			return "self-intersection";
		}
		if (i != 0 && seq[i][0] === seq[i - 1][0] && seq[i][1] === seq[i - 1][1]) {
			return "repetitve";
		}
		if (dx !== 0 && dy !== 0) {
			const other1 = (y - dy) * (size + 1) + x;
			const other2 = y * (size + 1) + (x - dx);
			if (Math.abs(visited[other1] - visited[other2]) === 1) {
				return "diag-intersection";
			}
		}
		visited[y * (size + 1) + x] = i + 2;
	}
	const tail = (size + 1) * (size + 1);
	if (visited[1] !== tail && visited[1] !== 0 && visited[size + 1] !== tail && visited[size + 1] !== 0) {
		return "start-unreachable";
	}
	if (hasOrphanChunks(visited, seq.length)) {
		return "produces-orphans";
	}
	if (seq.length < (size + 1) * (size + 1)) {
		return "too-short";
	}
	// pretty sure it's emergent
	// if (x !== 0 || y !== 0) {
	//     return 'not-closed';
	// }
	return "valid";
}

const PADDING = 20;
function background() {
	ctx.fillStyle = "#0f0f2f";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	// dotted grid
	ctx.fillStyle = "#888888";
	for (let i = 0; i <= size; i++) {
		for (let j = 0; j <= size; j++) {
			ctx.beginPath();
			const x = PADDING + (i * (canvas.width - 2 * PADDING)) / size;
			const y = PADDING + (j * (canvas.height - 2 * PADDING)) / size;
			ctx.arc(x, y, 3, 0, 2 * Math.PI);
			ctx.fill();
		}
	}
}

function drawPath(seq: DirSeq, valid: boolean) {
	// draws path, including invalid paths that go out of bounds or intersect themselves
	ctx.strokeStyle = valid ? "#00ff00" : "#ff0000";
	ctx.setLineDash(valid ? [10, 10] : []);
	ctx.lineWidth = 2;
	ctx.beginPath();
	let x = 0;
	let y = 0;
	ctx.moveTo(
		PADDING + (x * (canvas.width - 2 * PADDING)) / size,
		PADDING + (y * (canvas.height - 2 * PADDING)) / size,
	);
	for (const [dx, dy] of seq) {
		x += dx;
		y += dy;
		ctx.lineTo(
			PADDING + (x * (canvas.width - 2 * PADDING)) / size,
			PADDING + (y * (canvas.height - 2 * PADDING)) / size,
		);
	}
	ctx.stroke();
}

// Shared state read by renderLoop, written by the dfs generator
let renderSeq: DirSeq = [];
let renderVal: DirValidationResult = "too-short";
let lastValidSeq: DirSeq = [];

function* dfs(seq: DirSeq, val: DirValidationResult): Generator<void> {
	renderSeq = [...seq];
	renderVal = val;
	if (val === "valid") {
		lastValidSeq = [...seq];
	}
	yield;

	if (val === "too-short") {
		for (const dir of dirs) {
			seq.push(dir);
			const nextVal = validateDirSeq(seq);
			if (nextVal === "too-short" || nextVal === "valid") {
				yield* dfs(seq, nextVal);
			}
			seq.pop();
		}
	}
}

// Render loop: runs every animation frame, reads shared state
function renderLoop() {
	background();
	drawPath(renderSeq, renderVal === "valid");
	if (renderVal !== "valid") {
		drawPath(lastValidSeq, true);
	}
	requestAnimationFrame(renderLoop);
}

// Compute loop: advances DFS in ~10ms time slices
// A generation counter allows to cancel stale loops.
let computeGeneration = 0;

function startGeneration() {
	computeGeneration++;
	const myGeneration = computeGeneration;
	renderSeq = [];
	renderVal = "too-short";
	lastValidSeq = [];
	const gen = dfs([], "too-short");

	function computeLoop() {
		if (myGeneration !== computeGeneration) return; // stale — a newer run has started
		const deadline = performance.now() + 10;
		while (performance.now() < deadline) {
			if (gen.next().done) return;
		}
		setTimeout(computeLoop, 0);
	}
	computeLoop();
}

sizeInput.addEventListener("change", () => {
	const newSize = parseInt(sizeInput.value, 10);
	if (isNaN(newSize) || newSize < 2 || newSize > 12) return;
	size = newSize;
	startGeneration();
});

requestAnimationFrame(renderLoop);
startGeneration();
