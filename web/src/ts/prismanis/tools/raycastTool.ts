import { dist as distance, normalizeVec2, rotateVec, TransformedCurve } from "../helpers";
import { calculateWidth } from "../lensHelpers";
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
			type Circle = { center: Vec2; radius: number };
			const circles: Circle[] = [];
			const height = obj.transform.getSize().y;
			const thick = obj.lens.middleExtraThickness;
			const pos = obj.transform.getPosition();
			const rot = obj.transform.getRotation();

			const { leftArc, rightArc } = calculateWidth(obj.lens, height);

			// Left arc circle
			const leftCenterLocal: Vec2 = {
				x: -thick / 2 + (obj.lens.r1 >= 0 ? obj.lens.r1 - leftArc : -obj.lens.r1 + leftArc),
				y: 0,
			};
			const leftCenterWorld = {
				x: pos.x + (Math.cos(rot) * leftCenterLocal.x - Math.sin(rot) * leftCenterLocal.y),
				y: pos.y + (Math.sin(rot) * leftCenterLocal.x + Math.cos(rot) * leftCenterLocal.y),
			};
			circles.push({ center: leftCenterWorld, radius: Math.abs(obj.lens.r1) });

			// Right arc circle
			const rightCenterLocal: Vec2 = {
				x: thick / 2 + (obj.lens.r2 >= 0 ? -obj.lens.r2 + rightArc : obj.lens.r2 - rightArc),
				y: 0,
			};
			const rightCenterWorld = {
				x: pos.x + (Math.cos(rot) * rightCenterLocal.x - Math.sin(rot) * rightCenterLocal.y),
				y: pos.y + (Math.sin(rot) * rightCenterLocal.x + Math.cos(rot) * rightCenterLocal.y),
			};
			circles.push({ center: rightCenterWorld, radius: Math.abs(obj.lens.r2) });

			// Check ray-circle intersections
			for (const circle of circles) {
				const f: Vec2 = { x: at.x - circle.center.x, y: at.y - circle.center.y };

				const a = dir.x * dir.x + dir.y * dir.y;
				const b = 2 * (f.x * dir.x + f.y * dir.y);
				const c = f.x * f.x + f.y * f.y - circle.radius * circle.radius;

				const discriminant = b * b - 4 * a * c;
				if (discriminant < 0) {
					continue; // No intersection
				}

				const sqrtDiscriminant = Math.sqrt(discriminant);
				const t1 = (-b - sqrtDiscriminant) / (2 * a);
				const t2 = (-b + sqrtDiscriminant) / (2 * a);

				if (t1 >= 0 && t1 < minPosLambda) {
					minPosLambda = t1;
					// Calculate normal at intersection point
					const intersectionPoint = {
						x: at.x + dir.x * t1,
						y: at.y + dir.y * t1,
					};
					normal = normalizeVec2({
						x: intersectionPoint.x - circle.center.x,
						y: intersectionPoint.y - circle.center.y,
					});
				}
				if (t2 >= 0 && t2 < minPosLambda) {
					minPosLambda = t2;
					// Calculate normal at intersection point
					const intersectionPoint = {
						x: at.x + dir.x * t2,
						y: at.y + dir.y * t2,
					};
					normal = normalizeVec2({
						x: intersectionPoint.x - circle.center.x,
						y: intersectionPoint.y - circle.center.y,
					});
				}
			}

			// Check line segment intersections (top and bottom edges)
			const halfHeight = height / 2;
			const topLeftLocal: Vec2 = { x: -thick / 2, y: -halfHeight };
			const topRightLocal: Vec2 = { x: thick / 2, y: -halfHeight };
			const bottomLeftLocal: Vec2 = { x: -thick / 2, y: halfHeight };
			const bottomRightLocal: Vec2 = { x: thick / 2, y: halfHeight };

			const cornersWorld = [topLeftLocal, topRightLocal, bottomRightLocal, bottomLeftLocal].map((local) => ({
				x: pos.x + (Math.cos(rot) * local.x - Math.sin(rot) * local.y),
				y: pos.y + (Math.sin(rot) * local.x + Math.cos(rot) * local.y),
			}));

			const edges = [
				[cornersWorld[0], cornersWorld[1]], // Top edge
				[cornersWorld[1], cornersWorld[2]], // Right edge
				[cornersWorld[2], cornersWorld[3]], // Bottom edge
				[cornersWorld[3], cornersWorld[0]], // Left edge
			];

			for (const [p1, p2] of edges) {
				const denom = (p2.y - p1.y) * dir.x - (p2.x - p1.x) * dir.y;
				if (denom === 0) {
					continue; // Parallel lines
				}
				const t = ((p2.x - p1.x) * (at.y - p1.y) - (p2.y - p1.y) * (at.x - p1.x)) / denom;
				const u = ((at.x - p1.x) * dir.y - (at.y - p1.y) * dir.x) / denom;

				if (t >= 0 && u >= 0 && u <= 1) {
					if (t < minPosLambda) {
						minPosLambda = t;
						// Calculate normal (normalized)
						const edgeDir = { x: p2.x - p1.x, y: p2.y - p1.y };
						normal = normalizeVec2({ x: -edgeDir.y, y: edgeDir.x });
					}
				}
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
