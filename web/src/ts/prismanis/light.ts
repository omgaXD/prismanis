import { Curve } from "./painting";
import { dist as distance, rotateVec } from "./helpers";
import { Vec2 } from "./primitives";
import { ToolHelper } from "./render";

export type LightRaycasterOptions = {
	getTransformedCurves: () => Curve[];
	hlp: ToolHelper;
	/**
	 * radians from the right (0 rad) going counter-clockwise
	 */
	lightSourceAngles?: number[];
};

function normalize(p: Vec2): Vec2 {
	const length = Math.hypot(p.x, p.y);
	if (length === 0) return { x: 0, y: 0 };
	return { x: p.x / length, y: p.y / length };
}

export class LightRaycaster {
	enabled: boolean = true;
	rays: Curve[] = [];
	fixedAt: Vec2 | null = null;
	transformedCurves: Curve[] = [];

	constructor(private o: LightRaycasterOptions) {}

	init() {
		this.o.hlp.registerMouseDownListener((ev) => {
			if (!this.enabled) {
				return;
			}
			this.fixedAt = this.o.hlp.mpg(ev);
		});

		this.o.hlp.registerMouseUpListener(() => {
			if (!this.enabled) {
				return;
			}
			this.fixedAt = null;
		});

		this.o.hlp.registerMouseMoveListener((ev) => {
			if (!this.enabled) {
				return;
			}
			const mouse = this.o.hlp.mpg(ev);
			let at: Vec2;
			let mainDir: Vec2;
			if (this.fixedAt == null) {
				at = mouse;
				mainDir = { x: 1, y: 0 };
			} else {
				at = this.fixedAt;
				mainDir = normalize({
					x: mouse.x - this.fixedAt.x,
					y: mouse.y - this.fixedAt.y,
				});
			}
			this.transformedCurves = this.o.getTransformedCurves();

			this.rays = [];
			const angles = this.o.lightSourceAngles || [
				0,
				Math.PI / 100,
				-Math.PI / 100,
				Math.PI / 200,
				-Math.PI / 200,
			];
			for (const angle of angles) {
				const dir = {
					x: rotateVec(mainDir, angle).x,
					y: rotateVec(mainDir, angle).y,
				};
				const ray = this.ray(at, dir);
				this.rays.push(ray);
			}
		});

		this.o.hlp.registerMouseLeaveListener(() => {
			if (!this.enabled) {
				return;
			}
			this.rays.length = 0;
		});
	}

	toggle(enabled: boolean) {
		this.enabled = enabled;
		if (!this.enabled) {
			this.rays = [];
		}
	}

	ray(at: Vec2, dir: Vec2): Curve {
		const step = 2;
		const maxLength = 5000;
		const points: Vec2[] = [];

		let curMedium = this.getMediumAt(at);

		for (let i = 0; i < maxLength; i += step) {
			points.push(at);
			at = { x: at.x + dir.x * step, y: at.y + dir.y * step };
			if (this.getMediumAt(at) !== curMedium) {
				const normalCurve = this.findClosestCurve(at);
				if (normalCurve) {
					let normal = this.findReasonableNormal(at, normalCurve);

					const n1 = curMedium;
					const n2 = this.getMediumAt(at);

					// Ensure normal points against the ray (towards the incident medium)
					const dotProduct = normal.x * dir.x + normal.y * dir.y;
					if (dotProduct > 0) {
						normal = { x: -normal.x, y: -normal.y };
					}

					const cosI = -(normal.x * dir.x + normal.y * dir.y);
					const sinI = Math.sqrt(1 - cosI * cosI);
					const incidentAngle = Math.asin(sinI);
					const criticalAngle = Math.asin(Math.min(1, n2 / n1));
					if (incidentAngle > criticalAngle) {
						// Total internal reflection
						dir = {
							x: dir.x + 2 * cosI * normal.x,
							y: dir.y + 2 * cosI * normal.y,
						};
						// Keep curMedium as n1, ray reflected back
					} else {
						const sinT = (n1 / n2) * sinI;
						const cosT = Math.sqrt(1 - sinT * sinT);
						dir = {
							x: (n1 / n2) * dir.x + ((n1 / n2) * cosI - cosT) * normal.x,
							y: (n1 / n2) * dir.y + ((n1 / n2) * cosI - cosT) * normal.y,
						};
						curMedium = n2;
					}
					dir = normalize(dir);
				} else {
					// Fallback if no curve found (shouldn't happen if medium changed)
					curMedium = this.getMediumAt(at);
				}
			}
		}

		return { points, isClosed: false };
	}

	private findClosestCurve(point: Vec2): Curve | null {
		let closestCurve: Curve | null = null;
		let minDistance = Infinity;
		for (const curve of this.transformedCurves) {
			for (const p of curve.points) {
				const dist = distance(point, p);
				if (dist < minDistance) {
					minDistance = dist;
					closestCurve = curve;
				}
			}
		}
		return closestCurve;
	}

	private findReasonableNormal(point: Vec2, curve: Curve): Vec2 {
		// Find the closest Vec2 on the curve to the given Vec2
		let closestVec2: Vec2 | null = null;
		let minDistance = Infinity;
		for (const p of curve.points) {
			const dist = distance(point, p);
			if (dist < minDistance) {
				minDistance = dist;
				closestVec2 = p;
			}
		}
		if (!closestVec2) {
			return { x: 0, y: 0 };
		}

		// Approximate tangent by looking at neighboring points
		const index = curve.points.indexOf(closestVec2);
		const prevIndex = (index - 1 + curve.points.length) % curve.points.length;
		const nextIndex = (index + 1) % curve.points.length;

		const tangent = {
			x: curve.points[nextIndex].x - curve.points[prevIndex].x,
			y: curve.points[nextIndex].y - curve.points[prevIndex].y,
		};
		// Normal is perpendicular to tangent
		const normal = { x: -tangent.y, y: tangent.x };
		return normalize(normal);
	}

	private getMediumAt(point: Vec2): number {
		return 1 + this.getCurveCountContaining(point) * 0.3;
	}

	private getCurveCountContaining(point: Vec2): number {
		let count = 0;
		for (const curve of this.transformedCurves) {
			if (this.isVec2InCurve(point, curve)) {
				count++;
			}
		}
		return count;
	}

	private isVec2InCurve(point: Vec2, curve: Curve): boolean {
		// Ray-casting algorithm to determine if Vec2 is in polygon
		let inside = false;
		const n = curve.points.length;
		for (let i = 0, j = n - 1; i < n; j = i++) {
			const xi = curve.points[i].x,
				yi = curve.points[i].y;
			const xj = curve.points[j].x,
				yj = curve.points[j].y;

			const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
			if (intersect) inside = !inside;
		}
		return inside;
	}
}
