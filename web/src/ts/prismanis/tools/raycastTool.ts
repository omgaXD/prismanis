import { dist as distance, normalizeVec2, rotateVec, TransformedCurve } from "../helpers";
import { calculateWidth, intersectLensWith } from "../lensHelpers";
import { AIR_MATERIAL, Material } from "../material";
import { Curve, Vec2 } from "../primitives";
import { ToolHelper } from "../render";
import { Scene, SceneObject } from "../scene";
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
	/**
	 * applied before rotation
	 */
	startPosOffset?: Vec2;
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

const FLASHLIGHT_RAY_CONFIG = Array.from({ length: 41 }, (_, i) => {
	// +1 degree to -1 degree spread
	const angle = ((i / 20) * 2 - 1) * (Math.PI / 180);
	return { wavelength: 600, opacity: 0.05, initialAngle: angle };
});

const LAMP_RAY_CONFIG = Array.from({ length: 360 }, (_, i) => {
	const angle = (i) * (Math.PI / 180);
	return { wavelength: 600, opacity: 0.08, initialAngle: angle };
});

const FLOOD_LIGHT = Array.from({ length: 81 }, (_, i) => {
	// no spread, but starting offset
	const offsetY = (i - 40) * 3;
	return { wavelength: 600, opacity: 0.05, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } };
});

const FLOOD_SUNLIGHT = Array.from({ length: 41 }, (_, i) => {
	const offsetY = (i - 20) * 1;
	return [{ wavelength: 380, opacity: 0.4* 0.05, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
		{ wavelength: 420, opacity: 0.4* 0.12, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
		{ wavelength: 460, opacity: 0.4* 0.18, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
		{ wavelength: 500, opacity: 0.4* 0.2, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
		{ wavelength: 540, opacity: 0.4* 0.196, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
		{ wavelength: 580, opacity: 0.4* 0.17, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
		{ wavelength: 620, opacity: 0.4* 0.12, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
		{ wavelength: 660, opacity: 0.4* 0.07, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
		{ wavelength: 700, opacity: 0.4* 0.036, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } },
		{ wavelength: 740, opacity: 0.4* 0.01, initialAngle: 0, startPosOffset: { x: 0, y: offsetY } }];
}).flat();


const configs = {
	sunlight: SUNLIGHT_RAY_CONFIG,
	laser: LASER_RAY_CONFIG,
	flashlight: FLASHLIGHT_RAY_CONFIG,
	lamp: LAMP_RAY_CONFIG,
	floodlight: FLOOD_LIGHT,
	floodsunlight: FLOOD_SUNLIGHT,
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
				let customAt = {... at};
				if (o.startPosOffset) {
					// Usually dir is facing {1, 0}; in that situation, offset is applied directly
					// but if dir is rotated, offset needs to be rotated as well
					const offsetRotated = rotateVec(o.startPosOffset, Math.atan2(mainDir.y, mainDir.x));
					customAt = {
						x: at.x + offsetRotated.x,
						y: at.y + offsetRotated.y,
					};
				}

				const dir = {
					x: rotateVec(mainDir, o.initialAngle).x,
					y: rotateVec(mainDir, o.initialAngle).y,
				};
				const ray = this.ray(customAt, dir, o);
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
					{ value: "flashlight", displayName: "Flashlight" },
					{ value: "lamp", displayName: "Lamp" },
					{ value: "floodlight", displayName: "Flood Light" },
					{ value: "floodsunlight", displayName: "Flood Sunlight" },
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

	// new logic - will use formulas
	ray(at: Vec2, dir: Vec2, o: RayOptions): RaycastRay {
		const points: Vec2[] = [at];

		const insideObjects: Map<string, Material> = new Map();
		for (const obj of this.o.scene.getObjects()) {
			if (this.isVec2InObject(at, obj)) {
				insideObjects.set(obj.id, obj.material);
			}
		}

		let curAt = at;
		let curDir = dir;
		let depth = 50; // Max number of interactions
		while (depth--) {
			curAt = { x: curAt.x + curDir.x * 0.01, y: curAt.y + curDir.y * 0.01 }; // small nudge to avoid self-intersection
			const best = this.o.scene.getObjects().reduce(
				(best, obj) => {
					const result = this.intersect(curAt, curDir, obj);
					if (result && result.lambda < best.lambda) {
						return result;
					}
					return best;
				},
				{ lambda: Infinity, normal: { x: 0, y: 0 }, material: null as Material | null, id: "" },
			);

			if (best.lambda === Infinity) {
				// No intersection
				points.push({
					x: curAt.x + curDir.x * 5000,
					y: curAt.y + curDir.y * 5000,
				});
				break;
			}

			points.push({
				x: curAt.x + curDir.x * best.lambda,
				y: curAt.y + curDir.y * best.lambda,
			});

			curAt = points[points.length - 1];

			if (!best.material) {
				best.material = AIR_MATERIAL;
			}

			let n2;
			if (insideObjects.has(best.id)) {
				// get everything except for this object's material
				const materials = Array.from(insideObjects.values()).filter((m) => m !== best.material);
				const A = materials.reduce((sum, m) => sum + m.A, AIR_MATERIAL.A);
				const B = materials.reduce((sum, m) => sum + m.B, AIR_MATERIAL.B);
				n2 = A + B / (o.wavelength * o.wavelength);
			} else {
				n2 = best.material.A + best.material.B / (o.wavelength * o.wavelength);
			}
			// alter direction based on refraction
			const A =
				insideObjects.size === 0
					? AIR_MATERIAL.A
					: Array.from(insideObjects.values()).reduce((sum, m) => sum + m.A, 0);
			const B =
				insideObjects.size === 0
					? AIR_MATERIAL.B
					: Array.from(insideObjects.values()).reduce((sum, m) => sum + m.B, 0);
			const n1 = A + B / (o.wavelength * o.wavelength);
			// Ensure normal points against the ray (towards the incident medium)
			const dotProduct = best.normal.x * curDir.x + best.normal.y * curDir.y;
			let normal = normalizeVec2(best.normal); // Ensure normal is normalized
			if (dotProduct > 0) {
				normal = { x: -normal.x, y: -normal.y };
			}

			// Ensure curDir is normalized
			curDir = normalizeVec2(curDir);

			const cosI = Math.max(-1, Math.min(1, -(normal.x * curDir.x + normal.y * curDir.y))); // Clamp to [-1, 1]
			const sinI = Math.sqrt(Math.max(0, 1 - cosI * cosI)); // Ensure non-negative
			const incidentAngle = Math.asin(sinI);
			const criticalAngle = Math.asin(Math.min(1, n2 / n1));
			if (incidentAngle > criticalAngle) {
				// Total internal reflection
				curDir = {
					x: curDir.x + 2 * cosI * normal.x,
					y: curDir.y + 2 * cosI * normal.y,
				};
				// Keep curMedium as n1, ray reflected back
			} else {
				const sinT = (n1 / n2) * sinI;
				// Guard against numerical precision issues
				if (sinT > 1) {
					// Should have been caught by critical angle check, but numerical precision
					// Force total internal reflection
					curDir = {
						x: curDir.x + 2 * cosI * normal.x,
						y: curDir.y + 2 * cosI * normal.y,
					};
				} else {
					const cosT = Math.sqrt(1 - sinT * sinT);
					curDir = {
						x: (n1 / n2) * curDir.x + ((n1 / n2) * cosI - cosT) * normal.x,
						y: (n1 / n2) * curDir.y + ((n1 / n2) * cosI - cosT) * normal.y,
					};
					if (insideObjects.has(best.id)) {
						insideObjects.delete(best.id);
					} else {
						insideObjects.set(best.id, best.material);
					}
				}
			}
		}

		return { points, isClosed: false, wavelength: o.wavelength, opacity: o.opacity };
	}

	private intersect(
		at: Vec2,
		dir: Vec2,
		obj: SceneObject,
	): { lambda: number; normal: Vec2; material: Material; id: string } | null {
		let minPosLambda: number = Infinity;
		let normal: Vec2 = { x: 0, y: 0 };
		if (obj.type === "curve") {
			for (let i = 0; i < obj.curve.points.length; i++) {
				const p1raw = obj.curve.points[i];
				const p2raw = obj.curve.points[(i + 1) % obj.curve.points.length];
				const p1 = obj.transform.apply(p1raw);
				const p2 = obj.transform.apply(p2raw);

				const denom = (p2.y - p1.y) * dir.x - (p2.x - p1.x) * dir.y;
				if (denom === 0) {
					continue; // Parallel lines
				}
				const t = ((p2.x - p1.x) * (at.y - p1.y) - (p2.y - p1.y) * (at.x - p1.x)) / denom;
				const u = (dir.x * (at.y - p1.y) - dir.y * (at.x - p1.x)) / denom;

				if (t >= 0 && u >= 0 && u <= 1) {
					if (t < minPosLambda) {
						minPosLambda = t;
						// Calculate normal (normalized)
						const edgeDir = { x: p2.x - p1.x, y: p2.y - p1.y };
						normal = normalizeVec2({ x: -edgeDir.y, y: edgeDir.x });
					}
				}
			}
		} else if (obj.type == "lens") {
			const {lambda, normal: candidateNormal} = intersectLensWith(at, dir, obj) ?? {lambda: Infinity, normal: {x:0,y:0}};
			if (lambda < minPosLambda) {
				minPosLambda = lambda;
				normal = candidateNormal;
			}
		}
		return { lambda: minPosLambda, normal, material: obj.material, id: obj.id };
	}

	private isVec2InObject(point: Vec2, obj: SceneObject): boolean {
		if (obj.type === "curve") {
			// Ray-casting algorithm to determine if Vec2 is in polygon
			let inside = false;
			const n = obj.curve.points.length;
			for (let i = 0, j = n - 1; i < n; j = i++) {
				const xiraw = obj.curve.points[i].x,
					yiraw = obj.curve.points[i].y;
				const xjraw = obj.curve.points[j].x,
					yjraw = obj.curve.points[j].y;

				const xi = obj.transform.apply({ x: xiraw, y: yiraw }).x;
				const yi = obj.transform.apply({ x: xiraw, y: yiraw }).y;
				const xj = obj.transform.apply({ x: xjraw, y: yjraw }).x;
				const yj = obj.transform.apply({ x: xjraw, y: yjraw }).y;

				const intersect =
					yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
				if (intersect) inside = !inside;
			}
			return inside;
		} else if (obj.type === "lens") {
			return false;
		} else {
			return false;
		}
	}
}
