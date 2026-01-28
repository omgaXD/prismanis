import { Lens, calculateWidth } from "../math/lensHelpers";
import { Curve, Vec2 } from "../primitives";
import { Scene, Transform } from "./scene";
import { EXAGGERATED_GLASS_MATERIAL, Material } from "./material";
import { RayOptions } from "./rayConfigs";
import uuid from "../uuid";

export type CurveAdder = (curve: Curve, material?: Material) => SceneCurveObject;
export function curveAdderFactory(scene: Scene): CurveAdder {
	return function (curve: Curve, material?: Material) {
		// Calculate bounding box
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		for (const point of curve.points) {
			if (point.x < minX) minX = point.x;
			if (point.y < minY) minY = point.y;
			if (point.x > maxX) maxX = point.x;
			if (point.y > maxY) maxY = point.y;
		}

		// Alter curve points to be relative to center
		for (const point of curve.points) {
			point.x -= (minX + maxX) / 2;
			point.y -= (minY + maxY) / 2;
		}

		const transform = new Transform({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, 0, {
			x: maxX - minX,
			y: maxY - minY,
		});

		const sceneObject: SceneCurveObject = {
			id: uuid(),
			type: "curve",
			curve: curve,
			transform: transform,
			material: material ?? EXAGGERATED_GLASS_MATERIAL,
			hasMaterial: true,
		};

		scene.add(sceneObject);
		return sceneObject;
	};
}

export type LensAdder = (
	lens: Lens,
	position: Vec2,
	height: number,
	rotationRad: number,
	material?: Material,
) => SceneLensObject;
export function lensAdderFactory(scene: Scene): LensAdder {
	return function (lens: Lens, position: Vec2, height: number, rotationRad: number, material?: Material) {
		const { totalWidth, leftArc, rightArc } = calculateWidth(lens, height);
		console.log(totalWidth, leftArc, rightArc);
		const transform = new Transform({ x: position.x, y: position.y }, rotationRad, {
			x: totalWidth,
			y: height,
		});

		const sceneObject: SceneLensObject = {
			id: uuid(),
			type: "lens",
			lens: lens,
			transform: transform,
			material: material ?? EXAGGERATED_GLASS_MATERIAL,
			hasMaterial: true,
		};

		scene.add(sceneObject);
		return sceneObject;
	};
}

export type LightSourceAdder = (rayConfig: RayOptions[], pos: Vec2, dir: Vec2) => void;
export function lightSourceAdderFactory(scene: Scene): LightSourceAdder {
	return function (rayConfig: RayOptions[], pos: Vec2, dir: Vec2) {
		const SIZE = 10; // Tangibility for selection
		const transform = new Transform({ x: pos.x, y: pos.y }, Math.atan2(dir.y, dir.x), {
			x: SIZE,
			y: SIZE,
		});

		const sceneObject: SceneLightObject = {
			id: uuid(),
			type: "light",
			rayConfig: rayConfig,
			transform: transform,
			hasMaterial: false,
		};
		scene.add(sceneObject);
	};
}

export type WithMaterial = { hasMaterial: true; material: Material };
export type WithoutMaterial = { hasMaterial: false };

export type SceneObjectBase = {
	id: string;
	transform: Transform;
};

export type SceneCurveObject = SceneObjectBase & {
	type: "curve";
	curve: Curve;
} & WithMaterial;

export type SceneLensObject = SceneObjectBase & {
	type: "lens";
	lens: Lens;
} & WithMaterial;

export type SceneLightObject = SceneObjectBase & {
	type: "light";
	rayConfig: RayOptions[];
} & WithoutMaterial;

export type SceneObject = SceneCurveObject | SceneLensObject | SceneLightObject;
