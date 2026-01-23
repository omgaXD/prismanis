import { dist as distance, normalizeVec2, rotateVec, TransformedCurve } from "../helpers";
import { AIR_MATERIAL } from "../material";
import { Curve, Vec2 } from "../primitives";
import { ToolHelper } from "../render";
import { Scene } from "../scene";
import { ToolSettingSelect } from "../toolSettings";
import { AbstractTool, BaseToolOptions } from "./tool";

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
};

export type RaycastToolOptions = BaseToolOptions & {
	getTransformedCurves: () => TransformedCurve[];
	hlp: ToolHelper;
	scene: Scene;
};

const SUNLIGHT_RAY_CONFIG = [
	{ wavelength: 380, opacity: 0.05, initialAngle: 0 },
	{ wavelength: 420, opacity: 0.12, initialAngle: 0 },
	{ wavelength: 460, opacity: 0.18, initialAngle: 0 },
	{ wavelength: 500, opacity: 0.2, initialAngle: 0 },
	{ wavelength: 540, opacity: 0.196, initialAngle: 0 },
	{ wavelength: 580, opacity: 0.17, initialAngle: 0 },
	{ wavelength: 620, opacity: 0.12, initialAngle: 0 },
	{ wavelength: 660, opacity: 0.07, initialAngle: 0 },
	{ wavelength: 700, opacity: 0.036, initialAngle: 0 },
	{ wavelength: 740, opacity: 0.01, initialAngle: 0 },
];

const LASER_RAY_CONFIG = [{ wavelength: 700, opacity: 1.0, initialAngle: 0 }];

const FLASHLIGHT_RAY_CONFIG = Array.from({ length: 21 }, (_, i) => {
	// +1 degree to -1 degree spread
	const angle = ((i / 20) * 2 - 1) * (Math.PI / 180);
	return { wavelength: 600, opacity: 0.05, initialAngle: angle };
});

const LAMP_RAY_CONFIG = Array.from({ length: 180 }, (_, i) => {
	const angle = i * 2 * (Math.PI / 180);
	return { wavelength: 600, opacity: 0.04, initialAngle: angle };
});

const configs = {
	sunlight: SUNLIGHT_RAY_CONFIG,
	laser: LASER_RAY_CONFIG,
	flaslight: FLASHLIGHT_RAY_CONFIG,
	lamp: LAMP_RAY_CONFIG,
};

export type RaycastRay = Curve & {
	wavelength: number;
	opacity: number;
};

export class RaycastTool extends AbstractTool {
	rays: RaycastRay[] = [];
	fixedAt: Vec2 | null = null;
	transformedCurves: TransformedCurve[] = [];
	rayConfig: RayOptions[] = [];

	constructor(private o: RaycastToolOptions) {
		super(o);
		this.init();
	}

	init() {
		this.o.hlp.registerMouseDownListener((ev) => {
			if (!this.isEnabled()) {
				return;
			}
			this.fixedAt = this.o.hlp.mpg(ev);
		});

		this.o.hlp.registerMouseUpListener(() => {
			if (!this.isEnabled()) {
				return;
			}
			this.fixedAt = null;
		});

		this.o.hlp.registerMouseMoveListener((ev) => {
			if (!this.isEnabled()) {
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

			for (const o of this.rayConfig) {
				const dir = {
					x: rotateVec(mainDir, o.initialAngle).x,
					y: rotateVec(mainDir, o.initialAngle).y,
				};
				const ray = this.ray(at, dir, o);
				this.rays.push(ray);
			}
		});

		this.o.hlp.registerMouseLeaveListener(() => {
			if (!this.isEnabled()) {
				return;
			}
			this.rays.length = 0;
		});

		this.registerSetting(
			new ToolSettingSelect({
				id: "raycast-type",
				displayName: "Raycast Type",
				options: [
					{ value: "sunlight", displayName: "Sunlight" },
					{ value: "laser", displayName: "Simple Laser" },
					{ value: "flaslight", displayName: "Flashlight" },
					{ value: "lamp", displayName: "Lamp" },
				],
				default: "sunlight",
				value: "sunlight",
			}),
			(newValue) => {
				if (!(newValue in configs)) {
					throw new Error(`Unsupported raycast type: ${newValue}`);
				}
				this.rayConfig = configs[newValue as keyof typeof configs];
			},
		);
	}

	onToggled(enabled: boolean) {
		if (!enabled) {
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
			if (!this.o.scene.isPointInbounds(at)) {
				break;
			}
			const newMedium = this.getMediumAt(at, o.wavelength);
			if (newMedium !== curMedium) {
				const normalCurve = this.findClosestCurve(at);
				if (normalCurve) {
					let normal = this.findReasonableNormal(at, normalCurve.curve, normalCurve.closestPointIndex);

					const n1 = curMedium;
					const n2 = newMedium;

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
				} else {
					// Fallback if no curve found (shouldn't happen if medium changed)
					console.warn("No curve found for medium change at", at);
					curMedium = newMedium;
				}
			}
		}

		return { points, isClosed: false, wavelength: o.wavelength, opacity: o.opacity };
	}

	private findClosestCurve(point: Vec2): { curve: Curve; closestPointIndex: number } | null {
		let closestCurve: Curve | null = null;
		let closestPointIndex = -1;
		let minDistance = Infinity;
		for (const curve of this.transformedCurves) {
			for (let i = 0; i < curve.points.length; i++) {
				const dist = distance(point, curve.points[i]);
				if (dist < minDistance) {
					minDistance = dist;
					closestCurve = curve;
					closestPointIndex = i;
				}
			}
		}
		if (closestCurve === null) {
			return null;
		}
		return { curve: closestCurve, closestPointIndex };
	}

	private findReasonableNormal(point: Vec2, curve: Curve, indexOnCurve?: number): Vec2 {
		if (!indexOnCurve) {
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
			indexOnCurve = curve.points.indexOf(closestVec2);
		}

		// Approximate tangent by looking at neighboring points
		const prevIndex = (indexOnCurve - 1 + curve.points.length) % curve.points.length;
		const nextIndex = (indexOnCurve + 1) % curve.points.length;

		const tangent = {
			x: curve.points[nextIndex].x - curve.points[prevIndex].x,
			y: curve.points[nextIndex].y - curve.points[prevIndex].y,
		};
		// Normal is perpendicular to tangent
		const normal = { x: -tangent.y, y: tangent.x };
		return normalizeVec2(normal);
	}

	private getMediumAt(point: Vec2, forWavelength: number): number {
		const wavelengthSq = forWavelength * forWavelength;
		let n = 0;
		let anyCurves = false;
		for (const curve of this.transformedCurves) {
			if (this.isVec2InCurve(point, curve)) {
				n += curve.material.A + curve.material.B / wavelengthSq;
				anyCurves = true;
			}
		}
		if (!anyCurves) {
			return AIR_MATERIAL.A + AIR_MATERIAL.B / wavelengthSq;
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
