import { Material } from "./material";
import { Curve, Rect, Vec2 } from "./primitives";
import { Scene } from "./scene";

export function dist(p1: Vec2, p2: Vec2): number {
	return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Counter-clockwise rotation of a vector by angleRad radians
 */
export function rotateVec(v: Vec2, angleRad: number): Vec2 {
	const cosA = Math.cos(angleRad);
	const sinA = Math.sin(angleRad);
	return {
		x: v.x * cosA - v.y * sinA,
		y: v.x * sinA + v.y * cosA,
	};
}

export function pointInRect(point: Vec2, rect: Rect): boolean {
	return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function wavelengthToRGB(wavelength: number): { r: number; g: number; b: number } {
	let r = 0,
		g = 0,
		b = 0;
	if (wavelength >= 380 && wavelength < 440) {
		r = -(wavelength - 440) / (440 - 380);
		g = 0;
		b = 1;
	} else if (wavelength >= 440 && wavelength < 490) {
		r = 0;
		g = (wavelength - 440) / (490 - 440);
		b = 1;
	} else if (wavelength >= 490 && wavelength < 510) {
		r = 0;
		g = 1;
		b = -(wavelength - 510) / (510 - 490);
	} else if (wavelength >= 510 && wavelength < 580) {
		r = (wavelength - 510) / (580 - 510);
		g = 1;
		b = 0;
	} else if (wavelength >= 580 && wavelength < 645) {
		r = 1;
		g = -(wavelength - 645) / (645 - 580);
		b = 0;
	} else if (wavelength >= 645 && wavelength <= 780) {
		r = 1;
		g = 0;
		b = 0;
	}
	// Intensity correction
	let factor = 0;
	if (wavelength >= 380 && wavelength < 420) {
		factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
	} else if (wavelength >= 420 && wavelength < 701) {
		factor = 1;
	} else if (wavelength >= 701 && wavelength <= 780) {
		factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
	}
	r = Math.round(r * factor * 255);
	g = Math.round(g * factor * 255);
	b = Math.round(b * factor * 255);
	return { r, g, b };
}

export type TransformedCurve = Curve & {material: Material};
export function getTransformedCurvesFromScene(scene: Scene): TransformedCurve[] {
	const curves: TransformedCurve[] = [];
	for (const obj of scene.getAllOfType("curve")) {
		const transformedCurve: TransformedCurve = {
			points: obj.curve.points.map((p) => {
				const tp = obj.transform.apply(p);
				return { x: tp.x, y: tp.y };
			}),
			isClosed: obj.curve.isClosed,
			material: obj.material,
		};
		curves.push(transformedCurve);
	}
	return curves;
}

export function normalizeVec2(p: Vec2): Vec2 {
	const length = Math.hypot(p.x, p.y);
	if (length === 0) return { x: 0, y: 0 };
	return { x: p.x / length, y: p.y / length };
}