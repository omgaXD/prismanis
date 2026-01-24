import { normalizeVec2 } from "./helpers";
import { Vec2 } from "./primitives";
import { SceneLensObject } from "./scene";

export type Lens = {
	middleExtraThickness: number;
	r1: number;
	r2: number;
};

export function calculateWidth(lens: Lens, height: number): { totalWidth: number; leftArc: number; rightArc: number } {
	const h = height;
	const t = lens.middleExtraThickness;
	const r1 = lens.r1;
	const r2 = lens.r2;

	const leftArc = Math.abs(r1) - Math.sqrt(r1 * r1 - (h * h) / 4);
	const rightArc = Math.abs(r2) - Math.sqrt(r2 * r2 - (h * h) / 4);

	const totalWidth = leftArc + t + rightArc;

	return { totalWidth, leftArc, rightArc };
}

/**
 * Positive angles mean convex, negative angles mean concave
 */
export function calculateArcAngles(lens: Lens, height: number): { angle1: number; angle2: number } {
	const h = height;
	const r1 = lens.r1;
	const r2 = lens.r2;

	const angle1 = Math.asin(h / 2 / Math.abs(r1)) * (r1 >= 0 ? 1 : -1);
	const angle2 = Math.asin(h / 2 / Math.abs(r2)) * (r2 >= 0 ? 1 : -1);

	return { angle1, angle2 };
}

/**
 * Returns the smallest positive solution lambda for the intersection point at at + dir * lambda, or null if no intersection
 * accounts for all possible intersections with the lens shape:
 * - two spherical caps (or flat surfaces)
 * - for concave lenses, the "inside" edges of the spherical caps
 * - the top and bottom edges of the thickness in the middle
 */
export function intersectLensWith(at: Vec2, dir: Vec2, lens: SceneLensObject): { lambda: number; normal: Vec2 } | null {
	type Arc = {
		center: Vec2;
		radius: number;
		/**
		 * radians. 0 is to the right, positive is counter-clockwise
		 */
		startAngle: number;
		/**
		 * radians. 0 is to the right, positive is counter-clockwise
		 */
		endAngle: number;
	};

	const height = lens.transform.getSize().y;
	const { leftArc: leftArcWidth, rightArc: rightArcWidth } = calculateWidth(lens.lens, height);
	const { angle1: leftArcAngle, angle2: rightArcAngle } = calculateArcAngles(lens.lens, height);
	const thick = lens.lens.middleExtraThickness;
	const offsetX = (leftArcWidth - rightArcWidth) / 2;

	const arcs: Arc[] = [];

	// Left arc
	{
		let centerX;
		if (lens.lens.r1 > 0) {
			centerX = Math.sqrt(lens.lens.r1 * lens.lens.r1 - (height * height) / 4) - thick / 2 + offsetX;
		} else {
			centerX =
				-Math.sqrt(lens.lens.r1 * lens.lens.r1 - (height * height) / 4) - thick / 2 - leftArcWidth + offsetX;
		}
		const center = lens.transform.apply({ x: centerX, y: 0 });
		const radius = Math.abs(lens.lens.r1);
		let startAngle, endAngle: number;
		if (lens.lens.r1 > 0) {
			startAngle = Math.PI - leftArcAngle + lens.transform.getRotation();
			endAngle = Math.PI + leftArcAngle + lens.transform.getRotation();
		} else {
			startAngle = leftArcAngle + lens.transform.getRotation();
			endAngle = -leftArcAngle + lens.transform.getRotation();
		}
		arcs.push({ center, radius, startAngle, endAngle });
	}
	// Right arc
	{
		let centerX;
		if (lens.lens.r2 > 0) {
			centerX = thick / 2 - Math.sqrt(lens.lens.r2 * lens.lens.r2 - (height * height) / 4) + offsetX;
		} else {
			centerX =
				Math.sqrt(lens.lens.r2 * lens.lens.r2 - (height * height) / 4) + thick / 2 + rightArcWidth + offsetX;
		}
		const center = lens.transform.apply({ x: centerX, y: 0 });
		const radius = Math.abs(lens.lens.r2);
		let startAngle, endAngle: number;
		if (lens.lens.r2 > 0) {
			startAngle = -rightArcAngle + lens.transform.getRotation();
			endAngle = rightArcAngle + lens.transform.getRotation();
		} else {
			startAngle = Math.PI + rightArcAngle + lens.transform.getRotation();
			endAngle = Math.PI - rightArcAngle + lens.transform.getRotation();
		}
		arcs.push({ center, radius, startAngle, endAngle });
	}

	const lines: { p1: Vec2; p2: Vec2 }[] = [];

	// Bottom line (includes middle thickness and concave edges)
	{
		const y = height / 2;
		let p1, p2: Vec2;
		if (lens.lens.r1 < 0) {
			p1 = lens.transform.apply({ x: -leftArcWidth - thick / 2 + offsetX, y });
		} else {
			p1 = lens.transform.apply({ x: -thick / 2 + offsetX, y });
		}

		if (lens.lens.r2 < 0) {
			p2 = lens.transform.apply({ x: rightArcWidth + thick / 2 + offsetX, y });
		} else {
			p2 = lens.transform.apply({ x: thick / 2 + offsetX, y });
		}
		lines.push({ p1, p2 });
	}

	// Top line
	{
		const y = -height / 2;
		let p1, p2: Vec2;
		if (lens.lens.r1 < 0) {
			p1 = lens.transform.apply({ x: -leftArcWidth - thick / 2 + offsetX, y });
		} else {
			p1 = lens.transform.apply({ x: -thick / 2 + offsetX, y });
		}

		if (lens.lens.r2 < 0) {
			p2 = lens.transform.apply({ x: rightArcWidth + thick / 2 + offsetX, y });
		} else {
			p2 = lens.transform.apply({ x: thick / 2 + offsetX, y });
		}
		lines.push({ p1, p2 });
	}

	// Now calculate intersections with all arcs and lines, return the smallest positive t
	let closestT: number | null = null;
	let closestNormal: Vec2 | null = null;

	function intersectCircle(at: Vec2, dir: Vec2, center: Vec2, radius: number): number[] {
		const toCenter = { x: at.x - center.x, y: at.y - center.y };
		const a = dir.x * dir.x + dir.y * dir.y;
		const b = 2 * (toCenter.x * dir.x + toCenter.y * dir.y);
		const c = toCenter.x * toCenter.x + toCenter.y * toCenter.y - radius * radius;
		const discriminant = b * b - 4 * a * c;

		if (discriminant < 0) {
			return [];
		}

		const sqrtDisc = Math.sqrt(discriminant);
		const t1 = (-b - sqrtDisc) / (2 * a);
		const t2 = (-b + sqrtDisc) / (2 * a);
		return [t1, t2];
	}

	function isAngleBetween(angle: number, startAngle: number, endAngle: number): boolean {
		const modAngle = (angle + 2 * Math.PI) % (2 * Math.PI);
		const modStart = (startAngle + 2 * Math.PI) % (2 * Math.PI);
		const modEnd = (endAngle + 2 * Math.PI) % (2 * Math.PI);

		if (modStart < modEnd) {
			return modAngle >= modStart && modAngle <= modEnd;
		} else {
			return modAngle >= modStart || modAngle <= modEnd;
		}
	}

	for (const arc of arcs) {
		const ts = intersectCircle(at, dir, arc.center, arc.radius);
		for (const t of ts) {
			if (t > 0) {
				const intersectionPoint: Vec2 = { x: at.x + dir.x * t, y: at.y + dir.y * t };
				const angle = Math.atan2(intersectionPoint.y - arc.center.y, intersectionPoint.x - arc.center.x);
				if (isAngleBetween(angle, arc.startAngle, arc.endAngle)) {
					if (closestT === null || t < closestT) {
						closestT = t;
						const normalDir = {
							x: intersectionPoint.x - arc.center.x,
							y: intersectionPoint.y - arc.center.y,
						};
						closestNormal = normalizeVec2(normalDir);
					}
				}
			}
		}
	}

	function intersectLine(at: Vec2, dir: Vec2, p1: Vec2, p2: Vec2): number | null {
		const lineDir: Vec2 = { x: p2.x - p1.x, y: p2.y - p1.y };
		const det = dir.x * lineDir.y - dir.y * lineDir.x;

		if (Math.abs(det) < 1e-10) {
			return null; // Parallel
		}

		const t = ((p1.x - at.x) * lineDir.y - (p1.y - at.y) * lineDir.x) / det;
		const u = ((p1.x - at.x) * dir.y - (p1.y - at.y) * dir.x) / det;

		if (t >= 0 && u >= 0 && u <= 1) {
			return t;
		}

		return null;
	}

	for (const line of lines) {
		const t = intersectLine(at, dir, line.p1, line.p2);
		if (t !== null) {
			if (closestT === null || t < closestT) {
				closestT = t;
				const lineDir: Vec2 = { x: line.p2.x - line.p1.x, y: line.p2.y - line.p1.y };
				const normalDir: Vec2 = { x: -lineDir.y, y: lineDir.x };
				closestNormal = normalizeVec2(normalDir);
			}
		}
	}

	return closestT !== null && closestNormal !== null ? { lambda: closestT, normal: closestNormal } : null;
}
