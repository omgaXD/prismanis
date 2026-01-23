import { dist } from "./helpers";
import { Vec2 } from "./primitives";
import { SceneCurveObject } from "./scene";

export type Curve = {
	points: Vec2[];
	isClosed: boolean;
	thickness?: number;
	color?: string;
};

const DEFAULT_THICKNESS = 8;
const DEFAULT_STROKE_COLOR = "#ffffff";
const DEFAULT_FILL_COLOR = "#ffffff88";

export type PaintOptions = {
	closedDistanceThreshold: number;
	canvas: HTMLCanvasElement;
	onCurveClosed?: (curve: Curve) => void;
};

export class Paint {
	cur: Curve | null = null;

	enabled: boolean = true;

	constructor(private o: PaintOptions) {}

	init() {
		this.o.canvas.addEventListener("mousedown", this.startPath.bind(this));
		this.o.canvas.addEventListener("mousemove", this.addPoint.bind(this));
		this.o.canvas.addEventListener("mouseup", (ev) => {
			if (!this.cur) {
				return;
			}
			this.addPoint(ev);

			if (this.cur.points.length > 2) {
				recognizeCurveClosedness(this.cur, this.o.closedDistanceThreshold);
			}

			if (this.cur.isClosed) {
				this.o.onCurveClosed?.(this.cur);
			}

			this.cur = null;
		});
	}

	clear() {
		this.cur = null;
	}

	toggle(enabled: boolean) {
		this.enabled = enabled;

		if (!this.enabled) {
			this.cur = null;
		}
	}

	startPath(event: MouseEvent) {
		if (!this.enabled) return;

		this.cur = { points: [], isClosed: false };
		this.addPoint(event);
	}

	addPoint(event: MouseEvent) {
		if (!this.enabled) return;
		if (!this.cur) return;
		const rect = this.o.canvas.getBoundingClientRect();
		const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
		this.cur.points.push(point);
	}
}

function recognizeCurveClosedness(curve: Curve, threshold: number): void {
	if (curve.points.length <= 2) {
		return;
	}

	const first = curve.points[0];
	const last = curve.points[curve.points.length - 1];

	// Step 1: naive - check if last and first point are within threshold
	if (dist(last, first) <= threshold) {
		curve.isClosed = true;
		console.log("Curve closed: Step 1 (naive)");
		return;
	}

	// Step 2: accounting for early closing - find last point in second half within threshold to first
	const midpoint = Math.floor(curve.points.length / 2);
	for (let i = curve.points.length - 1; i >= midpoint; i--) {
		if (dist(curve.points[i], first) <= threshold) {
			curve.points = curve.points.slice(0, i + 1);
			curve.isClosed = true;
			console.log("Curve closed: Step 2 (early closing)");
			return;
		}
	}

	// Step 3: accounting for closing elsewhere - find earliest point in first half within threshold to last
	for (let i = 0; i < midpoint; i++) {
		if (dist(curve.points[i], last) <= threshold) {
			curve.points = curve.points.slice(i);
			curve.isClosed = true;
			console.log("Curve closed: Step 3 (closing elsewhere)");
			return;
		}
	}

	// Step 4: finding most massive intersection - find i, j with minimal combined arc length
	let bestI = -1;
	let bestJ = -1;
	let minArcLength = Infinity;

	const minDistance = Math.floor(curve.points.length / 3);

	for (let i = 0; i < curve.points.length; i++) {
		for (let j = i; j < curve.points.length; j++) {
			// Ensure i and j are at least 1/3 of array size away from each other
			if (j - i < minDistance) {
				continue;
			}

			if (dist(curve.points[i], curve.points[j]) <= threshold) {
				// Count points from 0 to i + points from j to end
				const arcLength = i + (curve.points.length - 1 - j);
				if (arcLength < minArcLength) {
					minArcLength = arcLength;
					bestI = i;
					bestJ = j;
				}
			}
		}
	}

	if (bestI >= 0 && bestJ >= 0) {
		curve.points = curve.points.slice(bestI, bestJ + 1);
		curve.isClosed = true;
		console.log("Curve closed: Step 4 (massive intersection)");
		return;
	}

	// Step 5: give up - don't close the curve
	console.log("Curve not closed: Step 5 (give up)");
}

export function drawCurveObject(ctx: CanvasRenderingContext2D, curveObj: SceneCurveObject) {
	const curve = curveObj.curve;
	if (curve.points.length === 0) return;

	const thickness = curve.thickness ?? DEFAULT_THICKNESS;
	const color = curve.color ?? DEFAULT_STROKE_COLOR;

	ctx.save();
	ctx.lineWidth = thickness;
	ctx.strokeStyle = color;
	ctx.fillStyle = DEFAULT_FILL_COLOR;

	const pos = curveObj.transform.getPosition();
	const rot = curveObj.transform.getRotation();
	ctx.translate(pos.x, pos.y);
	ctx.rotate(rot);
	ctx.beginPath();
	ctx.moveTo(curve.points[0].x, curve.points[0].y);
	for (let i = 1; i < curve.points.length; i++) {
		ctx.lineTo(curve.points[i].x, curve.points[i].y);
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

export function drawCurve(ctx: CanvasRenderingContext2D, curve: Curve) {
	if (curve.points.length === 0) return;

	const thickness = curve.thickness ?? DEFAULT_THICKNESS;
	const color = curve.color ?? DEFAULT_STROKE_COLOR;

	ctx.save();
	ctx.lineWidth = thickness;
	ctx.strokeStyle = color;

	ctx.beginPath();
	ctx.moveTo(curve.points[0].x, curve.points[0].y);
	for (let i = 1; i < curve.points.length; i++) {
		ctx.lineTo(curve.points[i].x, curve.points[i].y);
	}
	if (curve.isClosed) {
		ctx.closePath();
		ctx.fillStyle = DEFAULT_FILL_COLOR;
		ctx.fill();
	}
	ctx.stroke();
	ctx.restore();
}
