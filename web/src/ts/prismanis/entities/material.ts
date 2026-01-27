export type Material = {
	id: string;
	displayName: string;

	A: number;
	B: number;
	/**
	 * true if the material sums up with other overlapping materials
	 * false if it is omitted when there are overlapping materials
	 */
	overlaps: boolean;

	strokeColor: string;
	fillColor: string;
};

export const GLASS_MATERIAL: Material = {
	id: "glass",
	displayName: "Glass",
	overlaps: true,

	A: 1.5046,
	B: 0.0042,
	strokeColor: "rgba(197,216,235,0.8)",
	fillColor: "rgba(197,216,235,0.2)",
};

export const EXAGGERATED_GLASS_MATERIAL: Material = {
	id: "exaggerated-glass",
	displayName: "Exaggerated Glass",
	overlaps: true,

	A: 1.5,
	B: 4000,
	strokeColor: "rgba(207,226,255,0.9)",
	fillColor: "rgba(197,216,255,0.2)",
};

export const MIRROR_MATERIAL: Material = {
	id: "mirror",
	displayName: "Mirror",
	overlaps: true,

	A: 0,
	B: 0,
	strokeColor: "rgba(255,255,255,1)",
	fillColor: "rgba(200,200,200,1)",
};

export const WATER_MATERIAL: Material = {
	id: "water",
	displayName: "Water",
	overlaps: false,

	A: 1.324,
	B: 0.0031,
	strokeColor: "rgba(64,164,223,0.8)",
	fillColor: "rgba(64,164,223,0.2)",
};

export const AIR_MATERIAL: Material = {
	id: "air",
	displayName: "Air",
	overlaps: false,

	A: 1.000293,
	B: 0.0,
	strokeColor: "rgba(255,255,255,0.2)",
	fillColor: "rgba(255,255,255,0.1)",
};

export const VACUUM_MATERIAL: Material = {
	id: "vacuum",
	displayName: "Vacuum",
	overlaps: false,

	A: 1.0,
	B: 0.0,
	strokeColor: "rgba(255,255,255,0.2)",
	fillColor: "rgba(0,0,0,0.5)",
};

export const MATERIALS: Material[] = [
	GLASS_MATERIAL,
	EXAGGERATED_GLASS_MATERIAL,
	MIRROR_MATERIAL,
	WATER_MATERIAL,
	AIR_MATERIAL,
	VACUUM_MATERIAL,
];
