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

export function normalizeVec2(p: Vec2): Vec2 {
	const length = Math.hypot(p.x, p.y);
	if (length === 0) return { x: 0, y: 0 };
	return { x: p.x / length, y: p.y / length };
}
