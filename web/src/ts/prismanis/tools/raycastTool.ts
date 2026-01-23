
import { dist as distance, normalizeVec2, rotateVec, TransformedCurve } from "../helpers";
import { AIR_MATERIAL } from "../material";
import { Curve, Vec2 } from "../primitives";
import { ToolHelper } from "../render";

export type RayOptions = {
	/**
	 * nanometers
	 */
	wavelength: number;
	/**
	 * 0 to 1
	 */
	opacity: number;
	/**
	 * radians. 0 for right. counter-clockwise.
	 */
	initialAngle: number;
}

export type RaycastToolOptions = {
	getTransformedCurves: () => TransformedCurve[];
	hlp: ToolHelper;
	/**
	 * radians from the right (0 rad) going counter-clockwise
	 */
	rayConfig: RayOptions[];
};

export type RaycastRay = Curve & {
	wavelength: number;
	opacity: number;
};

export class RaycastTool {
	enabled: boolean = true;
	rays: RaycastRay[] = [];
	fixedAt: Vec2 | null = null;
	transformedCurves: TransformedCurve[] = [];

	constructor(private o: RaycastToolOptions) {
		this.init();
	}

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
				mainDir = normalizeVec2({
					x: mouse.x - this.fixedAt.x,
					y: mouse.y - this.fixedAt.y,
				});
			}
			this.transformedCurves = this.o.getTransformedCurves();

			this.rays = [];
			
			for (const o of this.o.rayConfig) {
				const dir = {
					x: rotateVec(mainDir, o.initialAngle).x,
					y: rotateVec(mainDir, o.initialAngle).y,
				};
				const ray = this.ray(at, dir, o);
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

	ray(at: Vec2, dir: Vec2, o: RayOptions): RaycastRay {
		const step = 2;
		const maxLength = 5000;
		const points: Vec2[] = [];

		let curMedium = this.getMediumAt(at, o.wavelength);

		for (let i = 0; i < maxLength; i += step) {
			points.push(at);
			at = { x: at.x + dir.x * step, y: at.y + dir.y * step };
			const newMedium = this.getMediumAt(at, o.wavelength);
			if (newMedium !== curMedium) {
				const normalCurve = this.findClosestCurve(at);
				if (normalCurve) {
					let normal = this.findReasonableNormal(at, normalCurve);

					const n1 = curMedium;
					const n2 = newMedium

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
					dir = normalizeVec2(dir);
				} else {
					// Fallback if no curve found (shouldn't happen if medium changed)
					console.warn("No curve found for medium change at", at);
					curMedium = newMedium;
				}
			}
		}

		return { points, isClosed: false, wavelength: o.wavelength, opacity: o.opacity };
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
		return normalizeVec2(normal);
	}

	private getMediumAt(point: Vec2, forWavelength: number): number {
		let n = 0;
		let anyCurves = false;
		for (const curve of this.transformedCurves) {
			if (this.isVec2InCurve(point, curve)) {
				n += curve.material.A + curve.material.B / (forWavelength * forWavelength);
				anyCurves = true;
			}
		}
		if (!anyCurves) {
			return AIR_MATERIAL.A + AIR_MATERIAL.B / (forWavelength * forWavelength);
		}
		return n;
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
