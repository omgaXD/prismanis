import { AIR_MATERIAL } from "../../entities/material";
import { RayOptions } from "../../entities/rayConfigs";
import { Scene } from "../../entities/scene";
import { SceneObject, WithMaterial } from "../../entities/sceneObjects";
import { Vec2 } from "../../primitives";
import { RaycastRay } from "../../tools/raycastTool";
import { normalizeVec2 } from "../geometry";
import { intersectLensWith } from "../lensHelpers";

function isRayNegligible(ray: RayOptions): boolean {
	return ray.opacity < 0.0002;
}

function getRefractiveIndex(material: { A: number; B: number }, wavelength: number): number {
	return material.A + material.B / (wavelength * wavelength);
}

function whoContainsPoint(point: Vec2, scene: Scene): (SceneObject & WithMaterial)[] {
	const containingObjects: (SceneObject & WithMaterial)[] = [];
	for (const obj of scene.getObjects()) {
		if (obj.hasMaterial === false) continue;
		if (isVec2InObject(point, obj)) {
			containingObjects.push(obj as SceneObject & WithMaterial);
		}
	}
	return containingObjects;
}

function getABfor(objects: (SceneObject & WithMaterial)[]): { A: number; B: number } {
    if (objects.length === 0) {
        return AIR_MATERIAL;
    }
    let A = 0, B = 0;
    for (const obj of objects) {
        if (!obj.material) continue;
        A += obj.material.A;
        B += obj.material.B;
    }
    if (A === 0 && B === 0) {
        return objects[objects.length-1].material;
    } else {
        return { A, B };
    }
}

function exitOrEnter(
	insideObjects: (SceneObject & WithMaterial)[],
	obj: SceneObject & WithMaterial,
	wavelength: number,
): { n1: number; n2: number; action: "entering" | "exiting" } {
	const n1 = getRefractiveIndex(getABfor(insideObjects), wavelength);

	if (insideObjects.find((o) => o.id === obj.id)) {
		const without = insideObjects.filter((o) => o.id !== obj.id);
		const n2 = getRefractiveIndex(getABfor(without), wavelength);
		return { n1, n2, action: "exiting" };
	} else {
        const withObj = [...insideObjects, obj];
        const n2 = getRefractiveIndex(getABfor(withObj), wavelength);
        return { n1, n2, action: "entering" };
	}
}

type IntersectionResult = { lambda: number; point: Vec2; normal: Vec2; sceneObject: SceneObject };
function intersect(at: Vec2, dir: Vec2, obj: SceneObject & WithMaterial): IntersectionResult | null {
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
		const { lambda, normal: candidateNormal } = intersectLensWith(at, dir, obj) ?? {
			lambda: Infinity,
			normal: { x: 0, y: 0 },
		};
		if (lambda < minPosLambda) {
			minPosLambda = lambda;
			normal = candidateNormal;
		}
	}
	return {
		lambda: minPosLambda,
		normal,
		sceneObject: obj,
		point: { x: at.x + dir.x * minPosLambda, y: at.y + dir.y * minPosLambda },
	};
}

function findNearestIntersection(at: Vec2, dir: Vec2, scene: Scene): IntersectionResult | null {
	let nearestIntersection: IntersectionResult | null = null;
	let minLambda = Infinity;

	for (const obj of scene.getObjects()) {
		if (!obj.hasMaterial) continue;
		const result = intersect(at, dir, obj as SceneObject & WithMaterial);
		if (result && result.lambda < minLambda) {
			minLambda = result.lambda;
			nearestIntersection = result;
		}
	}
	return nearestIntersection;
}

type SnellResult = {
	refractedDir: Vec2 | null;
	reflectedDir: Vec2;
	reflectance: number;
};

function snell(incidentDir: Vec2, normal: Vec2, n1: number, n2: number): SnellResult {
	let cosThetaI = -(incidentDir.x * normal.x + incidentDir.y * normal.y);
	let workingNormal = normal;

	// Flip normal if cosThetaI is negative to ensure consistent orientation
	if (cosThetaI < 0) {
		cosThetaI = -cosThetaI;
		workingNormal = { x: -normal.x, y: -normal.y };
	}

	const sin2ThetaI = Math.max(0, 1 - cosThetaI * cosThetaI);
	const nRatio = n1 / n2;
	const sin2ThetaT = nRatio * nRatio * sin2ThetaI;

	let refractedDir: Vec2 | null = null;
	let cosThetaT = 0;
	let reflectance = 1; // Default to total internal reflection

	if (sin2ThetaT <= 1) {
		cosThetaT = Math.sqrt(1 - sin2ThetaT);
		refractedDir = {
			x: nRatio * incidentDir.x + (nRatio * cosThetaI - cosThetaT) * workingNormal.x,
			y: nRatio * incidentDir.y + (nRatio * cosThetaI - cosThetaT) * workingNormal.y,
		};
		refractedDir = normalizeVec2(refractedDir);

		// Fresnel equations (unpolarized light)
		const rS = (n1 * cosThetaI - n2 * cosThetaT) / (n1 * cosThetaI + n2 * cosThetaT);
		const rP = (n1 * cosThetaT - n2 * cosThetaI) / (n1 * cosThetaT + n2 * cosThetaI);
		reflectance = (rS * rS + rP * rP) / 2;
		// Clamp to valid range in case of numerical errors
		reflectance = Math.max(0, Math.min(1, reflectance));
	}

	const reflectedDir = {
		x: incidentDir.x + 2 * cosThetaI * workingNormal.x,
		y: incidentDir.y + 2 * cosThetaI * workingNormal.y,
	};
	return { refractedDir, reflectedDir: normalizeVec2(reflectedDir), reflectance };
}

type BreadthFirstRaycastNode = {
	at: Vec2;
	dir: Vec2;
	insideObjects: (SceneObject & WithMaterial)[];
	rayOptions: RayOptions;
	depth: number;
};

function pushRay(to: RaycastRay[], p1: Vec2, p2: Vec2, wavelength: number, opacity: number) {
	to.push({
		points: [p1, p2],
		wavelength,
		opacity,
		isClosed: false,
	});
}

export function shootRay(at: Vec2, dir: Vec2, o: RayOptions, scene: Scene): RaycastRay[] {
	const rays: RaycastRay[] = [];
	const insideObjects = whoContainsPoint(at, scene);

	const queue: BreadthFirstRaycastNode[] = [{ at, dir, rayOptions: o, depth: 0, insideObjects }];

	while (queue.length > 0) {
		const node = queue.shift()!;
		if (isRayNegligible(node.rayOptions)) {
			continue;
		}
		if (node.depth > 50) {
			continue;
		}
        if (rays.length > 5000) {
            break;
        }

		let curDir = normalizeVec2(node.dir);
		let curAt = {
			x: node.at.x + curDir.x * 0.01,
			y: node.at.y + curDir.y * 0.01,
		};
		let curRayOptions = node.rayOptions;
		let insideObjects = node.insideObjects;
		const nearestIntersection = findNearestIntersection(curAt, curDir, scene);

		if (!nearestIntersection) {
			pushRay(
				rays,
				curAt,
				{ x: curAt.x + curDir.x * 5000, y: curAt.y + curDir.y * 5000 },
				curRayOptions.wavelength,
				curRayOptions.opacity,
			);
			continue;
		}

		const best = nearestIntersection.sceneObject as SceneObject & WithMaterial;
		const intersectionPoint = nearestIntersection.point;

		pushRay(rays, curAt, intersectionPoint, curRayOptions.wavelength, curRayOptions.opacity);

		const enterExit = exitOrEnter(insideObjects, best, o.wavelength);
		let reflectingInsideObjects: (SceneObject & WithMaterial)[] = [...insideObjects];
		let refractingInsideObjects: (SceneObject & WithMaterial)[] = [...insideObjects];
		if (enterExit.action === "entering") {
			refractingInsideObjects.push(best);
		} else {
			refractingInsideObjects = refractingInsideObjects.filter((obj) => obj.id !== best.id);
		}
		const n1 = enterExit.n1;
		const n2 = enterExit.n2;

		const snellResult = snell(curDir, nearestIntersection.normal, n1, n2);
		// Reflected ray
		queue.push({
			at: intersectionPoint,
			dir: snellResult.reflectedDir,
			insideObjects: reflectingInsideObjects,
			rayOptions: {
				wavelength: curRayOptions.wavelength,
				opacity: curRayOptions.opacity * snellResult.reflectance,
				initialAngle: curRayOptions.initialAngle,
				startPosOffset: curRayOptions.startPosOffset,
			},
			depth: node.depth + 1,
		});

		// Refracted ray
		if (snellResult.refractedDir) {
			queue.push({
				at: intersectionPoint,
				dir: snellResult.refractedDir,
				insideObjects: refractingInsideObjects,
				rayOptions: {
					wavelength: curRayOptions.wavelength,
					opacity: curRayOptions.opacity * (1 - snellResult.reflectance),
					initialAngle: curRayOptions.initialAngle,
					startPosOffset: curRayOptions.startPosOffset,
				},
				depth: node.depth + 1,
			});
		}
	}

	return rays;
}


function isVec2InObject(point: Vec2, obj: SceneObject): boolean {
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

			const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
			if (intersect) inside = !inside;
		}
		return inside;
	} else if (obj.type === "lens") {
		return false;
	} else {
		return false;
	}
}
