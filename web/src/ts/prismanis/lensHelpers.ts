export type Lens = {
	middleExtraThickness: number;
	r1: number;
	r2: number;
};


export function calculateWidth(lens: Lens, height: number): {totalWidth: number, leftArc: number, rightArc: number} {
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

	const angle1 = Math.asin((h / 2) / Math.abs(r1)) * (r1 >= 0 ? 1 : -1);
	const angle2 = Math.asin((h / 2) / Math.abs(r2)) * (r2 >= 0 ? 1 : -1);	

	return { angle1, angle2 };
}