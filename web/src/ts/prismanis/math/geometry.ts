import { Vec2, Rect } from "../primitives";

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

export function pointInRotatedRect(point: Vec2, tl: Vec2, tr: Vec2, bl: Vec2, br?: Vec2) {
	// Use barycentric coordinates to check if point is inside the rotated rectangle
	const br_computed = br || {
		x: bl.x + (tr.x - tl.x),
		y: bl.y + (tr.y - tl.y),
	};

	const v0 = { x: tr.x - tl.x, y: tr.y - tl.y }; // top side (tl -> tr)
	const v1 = { x: bl.x - tl.x, y: bl.y - tl.y }; // left side (tl -> bl)
	const v2 = { x: point.x - tl.x, y: point.y - tl.y };

	const dot00 = v0.x * v0.x + v0.y * v0.y;
	const dot01 = v0.x * v1.x + v0.y * v1.y;
	const dot02 = v0.x * v2.x + v0.y * v2.y;
	const dot11 = v1.x * v1.x + v1.y * v1.y;
	const dot12 = v1.x * v2.x + v1.y * v2.y;

	const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
	const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
	const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

	return u >= 0 && v >= 0 && u <= 1 && v <= 1;
}

export function doRotatedRectsOverlap(tl1: Vec2, tr1: Vec2, bl1: Vec2, tl2: Vec2, tr2: Vec2, bl2: Vec2): boolean {
	const br1 = { x: bl1.x + (tr1.x - tl1.x), y: bl1.y + (tr1.y - tl1.y) };
	const br2 = { x: bl2.x + (tr2.x - tl2.x), y: bl2.y + (tr2.y - tl2.y) };

	const points1 = [tl1, tr1, br1, bl1];
	const points2 = [tl2, tr2, br2, bl2];

	for (const p of points1) {
		if (pointInRotatedRect(p, tl2, tr2, bl2, br2)) return true;
	}
	for (const p of points2) {
		if (pointInRotatedRect(p, tl1, tr1, bl1, br1)) return true;
	}

	return false;
}

export function normalizeVec2(p: Vec2): Vec2 {
	const length = Math.hypot(p.x, p.y);
	if (length === 0) return { x: 0, y: 0 };
	return { x: p.x / length, y: p.y / length };
}
