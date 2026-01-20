import { Curve, distanceBetween, Point } from "./drawing";

export type LightRaycasterOptions = {
	history: Curve[];
	canvas: HTMLCanvasElement;
};

function normalize(p: Point): Point {
	const length = Math.hypot(p.x, p.y);
	if (length === 0) return { x: 0, y: 0 };
	return { x: p.x / length, y: p.y / length };
}

export class LightRaycaster {
	enabled: boolean = true;
	rays: Curve[] = [];
	fixedAt: Point | null = null;

	constructor(private o: LightRaycasterOptions) {}

	init() {
		this.o.canvas.addEventListener("mousedown", (ev) => {
			if (!this.enabled) {
				return;
			}
			const rect = this.o.canvas.getBoundingClientRect();
			const at: Point = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
			this.fixedAt = at;
		});

		this.o.canvas.addEventListener("mouseup", () => {
			if (!this.enabled) {
				return;
			}
			this.fixedAt = null;
		});

		this.o.canvas.addEventListener("mousemove", (ev) => {
			if (!this.enabled) {
				return;
			}
			const rect = this.o.canvas.getBoundingClientRect();
            const mouse: Point = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
			let at: Point;
			let dir: Point;
			if (this.fixedAt == null) {
                at = mouse;
				dir = { x: 1, y: 0 };
			} else {
                at = this.fixedAt;
				dir = normalize({
					x: mouse.x - this.fixedAt.x,
					y: mouse.y - this.fixedAt.y,
				});
			}
			const rayCurve = this.ray(at, dir);
			this.rays = [rayCurve];
		});
	}

	toggle(enabled: boolean) {
		this.enabled = enabled;
		if (!this.enabled) {
			this.rays = [];
		}
	}

	ray(at: Point, dir: Point): Curve {
		const step = 2;
		const maxLength = 5000;
		const points: Point[] = [];

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

	private findClosestCurve(point: Point): Curve | null {
		let closestCurve: Curve | null = null;
		let minDistance = Infinity;
		for (const curve of this.o.history) {
			for (const p of curve.points) {
				const dist = distanceBetween(point, p);
				if (dist < minDistance) {
					minDistance = dist;
					closestCurve = curve;
				}
			}
		}
		return closestCurve;
	}

	private findReasonableNormal(point: Point, curve: Curve): Point {
		// Find the closest point on the curve to the given point
		let closestPoint: Point | null = null;
		let minDistance = Infinity;
		for (const p of curve.points) {
			const dist = distanceBetween(point, p);
			if (dist < minDistance) {
				minDistance = dist;
				closestPoint = p;
			}
		}
		if (!closestPoint) {
			return { x: 0, y: 0 };
		}

		// Approximate tangent by looking at neighboring points
		const index = curve.points.indexOf(closestPoint);
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

	private getMediumAt(point: Point): number {
		return 1 + this.getCurveCountContaining(point) * 0.3;
	}

	private getCurveCountContaining(point: Point): number {
		let count = 0;
		for (const curve of this.o.history) {
			if (this.isPointInCurve(point, curve)) {
				count++;
			}
		}
		return count;
	}

	private isPointInCurve(point: Point, curve: Curve): boolean {
		// Ray-casting algorithm to determine if point is in polygon
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
