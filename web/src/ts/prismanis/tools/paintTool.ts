import { dist } from "../math/geometry";
import { Curve } from "../primitives";
import { CanvasInteractionHelper } from "../render";
import { GLOBAL_MATERIAL_TOOL_SETTING, ToolSettingSlider } from "../entities/toolSettings";
import { AbstractTool, BaseToolOptions } from "./tool";
import { Material } from "../entities/material";
import { CurveAdder } from "../entities/sceneObjects";

export type PaintToolOptions = BaseToolOptions & {
	hlp: CanvasInteractionHelper;
	addCurve: CurveAdder;
};

export class PaintTool extends AbstractTool {
	cur: Curve | null = null;
	closedDistanceThreshold: number | null = null;
	drawingThreshold: number | null = null;
	material: Material | null = null;

	constructor(private o: PaintToolOptions) {
		super(o);
		this.init();
	}

	init() {
		this.o.hlp.registerMouseDownListener(this.startPath.bind(this));
		this.o.hlp.registerMouseMoveListener(this.addPoint.bind(this));
		this.o.hlp.registerMouseUpListener((ev) => {
			if (!this.cur) {
				return;
			}
			this.addPoint(ev);

			if (this.cur.points.length > 2) {
				recognizeCurveClosedness(this.cur, this.closedDistanceThreshold!);
			}

			if (this.cur.isClosed) {
				this.o.addCurve(this.cur, this.material || undefined);
			}

			this.cur = null;
		});
		// this.registerSetting(new ToolSettingNumber({
		// 	id: "paint-closed-threshold",
		// 	displayName: "Closed Distance Threshold",
		// 	default: 15,
		// 	value: 15,
		// 	min: 1,
		// 	max: 300
		// }), (newVal) => {
		// 	this.closedDistanceThreshold = newVal;
		// })
		this.closedDistanceThreshold = 30;

		this.registerSetting(
			new ToolSettingSlider({
				id: "paint-drawing-threshold",
				displayName: "Drawing Optimization",
				default: 20,
				value: 20,
				min: 1,
				max: 100,
				step: 1,
			}),
			(newVal) => {
				this.drawingThreshold = newVal;
			},
		);

		this.registerSetting(GLOBAL_MATERIAL_TOOL_SETTING, (val) => {
			this.material = val;
		});
	}

	clear() {
		this.cur = null;
	}

	onToggled(enabled: boolean) {
		if (!enabled) {
			this.cur = null;
		}
	}

	startPath(event: MouseEvent) {
		if (!this.isEnabled()) return;

		this.cur = { points: [], isClosed: false };
		this.addPoint(event);
	}

	addPoint(event: MouseEvent) {
		if (!this.isEnabled()) return;
		if (!this.cur) return;
		const point = this.o.hlp.getMousePosition(event);
		if (this.cur.points.length === 0) {
			this.cur.points.push(point);
			return;
		}

		const lastPoint = this.cur.points[this.cur.points.length - 1];
		const distance = dist(lastPoint, point);

		if (distance > this.drawingThreshold!) {
			// Interpolate points between lastPoint and point
			const numSegments = Math.ceil(distance / this.drawingThreshold!);
			for (let i = 1; i <= numSegments; i++) {
				const t = i / numSegments;
				const interpolated = {
					x: lastPoint.x + (point.x - lastPoint.x) * t,
					y: lastPoint.y + (point.y - lastPoint.y) * t,
				};
				this.cur.points.push(interpolated);
			}
		}
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
		return;
	}

	// Step 2: accounting for early closing - find last point in second half within threshold to first
	const midpoint = Math.floor(curve.points.length / 2);
	for (let i = curve.points.length - 1; i >= midpoint; i--) {
		if (dist(curve.points[i], first) <= threshold) {
			curve.points = curve.points.slice(0, i + 1);
			curve.isClosed = true;
			return;
		}
	}

	// Step 3: accounting for closing elsewhere - find earliest point in first half within threshold to last
	for (let i = 0; i < midpoint; i++) {
		if (dist(curve.points[i], last) <= threshold) {
			curve.points = curve.points.slice(i);
			curve.isClosed = true;
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
		return;
	}
}
