import { RayOptions } from "../../entities/rayConfigs";
import { Scene } from "../../entities/scene";
import { SceneLightObject } from "../../entities/sceneObjects";
import { Vec2 } from "../../primitives";
import { RaycastRay } from "../../tools/raycastTool";
import { rotateVec } from "../geometry";
import { shootRay } from "./frenselRaycasting";

export function rays(mainAt: Vec2, mainDir: Vec2, config: RayOptions[], scene: Scene): RaycastRay[] {
	return config.map((o) => {
		let at = { ...mainAt };
		if (o.startPosOffset) {
			// Usually dir is facing {1, 0}; in that situation, offset is applied directly
			// but if dir is rotated, offset needs to be rotated as well
			const offsetRotated = rotateVec(o.startPosOffset, Math.atan2(mainDir.y, mainDir.x));
			at = {
				x: at.x + offsetRotated.x,
				y: at.y + offsetRotated.y,
			};
		}

		const dir = {
			x: rotateVec(mainDir, o.initialAngle).x,
			y: rotateVec(mainDir, o.initialAngle).y,
		};

		return shootRay(at, dir, o, scene);
	}).flat();
}

export function bake(obj: SceneLightObject, scene: Scene): RaycastRay[] {
	const pos = obj.transform.getPosition();
	const dir = {
		x: Math.cos(obj.transform.getRotation()),
		y: Math.sin(obj.transform.getRotation()),
	};
	return rays(pos, dir, obj.rayConfig, scene);
}

