import { Curve } from "./painting";
import { Rect, Vec2 } from "./primitives";

export class Scene {
	objects: SceneObject[];
	selectedObjectIds: string[];

	constructor() {
		this.objects = [];
		this.selectedObjectIds = [];
	}

	getAllOfType<T extends SceneObject>(type: SceneObject["type"]): T[] {
		return this.objects.filter((obj) => obj.type === type) as T[];
	}

	getObjectById(objectId: string): SceneObject | undefined {
		return this.objects.find((obj) => obj.id === objectId);
	}

	objectExists(objectId: string): boolean {
		return this.objects.some((obj) => obj.id === objectId);
	}

	private ensureObjectExists(objectId: string) {
		if (this.objectExists(objectId) === false) {
			throw new Error(`Object with ID ${objectId} does not exist in the scene.`);
		}
	}

	selectOnly(objectId: string) {
		this.ensureObjectExists(objectId);

		this.selectedObjectIds.length = 0;
		this.selectedObjectIds.push(objectId);
	}

	isObjectSelected(objectId: string): boolean {
		return this.selectedObjectIds.includes(objectId);
	}

	addToSelection(objectId: string) {
		this.ensureObjectExists(objectId);

		if (!this.isObjectSelected(objectId)) {
			this.selectedObjectIds.push(objectId);
		}
	}

	deselect() {
		this.selectedObjectIds.length = 0;
	}

	clear() {
		this.objects.length = 0;
		this.selectedObjectIds.length = 0;
	}
}

export function curveAdderFactory(scene: Scene) {
	return function (curve: Curve) {
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
			id: crypto.randomUUID(),
			type: "curve",
			curve: curve,
			transform: transform,
		};

		scene.objects.push(sceneObject);
		return sceneObject;
	};
}

export type SceneAction = {
	type: string;
};

export type SceneAddObjectAction = SceneAction & {
	object: SceneObject;
};

export type SceneRemoveObjectAction = SceneAction & {
	objectId: string;
};

export type SceneTransformObjectAction = SceneAction & {
	objectId: string;
	oldTransform: Transform;
	newTransform: Transform;
};

export type SceneBase = {
	id: string;
	transform: Transform;
};

export type SceneCurveObject = SceneBase & {
	type: "curve";
	curve: Curve;
};

export type SceneObject = SceneCurveObject;

export class Transform {
	/** transform origin (tries to be the center) */
	private pos: Vec2;
	private size: Vec2;
	/** rotation around the transform origin, radians */
	private rot: number;
	/** scale applied to the transform */
	private scale: Vec2;

	constructor(
		pos: Vec2 = { x: 0, y: 0 },
		rot: number = 0,
		size: Vec2 = { x: 1, y: 1 },
		scale: Vec2 = { x: 1, y: 1 },
	) {
		this.pos = pos;
		this.rot = rot;
		this.size = size;
		this.scale = scale;
	}

	clone(): Transform {
		return new Transform(
			{ x: this.pos.x, y: this.pos.y },
			this.rot,
			{ x: this.size.x, y: this.size.y },
			{ x: this.scale.x, y: this.scale.y },
		);
	}

	/**
	 * Returns the top-left corner of the rotated bounding rect
	 */
	getCorners(): { tl: Vec2; tr: Vec2; br: Vec2; bl: Vec2 } {
		const cos = Math.cos(this.rot);
		const sin = Math.sin(this.rot);

		const hw = (this.size.x / 2) * this.scale.x;
		const hh = (this.size.y / 2) * this.scale.y;

		const corners = {
			tl: { x: -hw, y: -hh },
			tr: { x: hw, y: -hh },
			br: { x: hw, y: hh },
			bl: { x: -hw, y: hh },
		};

		for (const key in corners) {
			const corner = corners[key as keyof typeof corners];
			const xNew = corner.x * cos - corner.y * sin;
			const yNew = corner.x * sin + corner.y * cos;
			corner.x = xNew + this.pos.x;
			corner.y = yNew + this.pos.y;
		}

		return corners;
	}

	/**
	 * Minimal axis-aligned bounding rectangle of the transformed object
	 */
	getBoundingRect(): Rect {
		const corners = this.getCorners();
		const minX = Math.min(corners.tl.x, corners.tr.x, corners.br.x, corners.bl.x);
		const maxX = Math.max(corners.tl.x, corners.tr.x, corners.br.x, corners.bl.x);
		const minY = Math.min(corners.tl.y, corners.tr.y, corners.br.y, corners.bl.y);
		const maxY = Math.max(corners.tl.y, corners.tr.y, corners.br.y, corners.bl.y);

		return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY,
		};
	}

	getPosition(): Vec2 {
		return this.pos;
	}

	setPosition(pos: Vec2) {
		this.pos = pos;
	}

	getRotation(): number {
		return this.rot;
	}

	setRotation(rot: number) {
		this.rot = rot;
	}

	getSize(): Vec2 {
		return { x: this.size.x * this.scale.x, y: this.size.y * this.scale.y };
	}

	getScale(): Vec2 {
		return this.scale;
	}

	setScale(scale: Vec2) {
		this.scale = scale;
	}

	resizeAgainstCorner(corner: "tl" | "tr" | "br" | "bl", newSize: Vec2) {
		const oldVisualSize = { x: this.size.x * this.scale.x, y: this.size.y * this.scale.y };
		const deltaSize = { x: newSize.x - oldVisualSize.x, y: newSize.y - oldVisualSize.y };

		switch (corner) {
			case "tl":
				this.pos.x -= deltaSize.x;
				this.pos.y -= deltaSize.y;
				break;
			case "tr":
				this.pos.y -= deltaSize.y;
				break;
			case "br":
				// no position change
				break;
			case "bl":
				this.pos.x -= deltaSize.x;
				break;
		}

		this.scale = { x: newSize.x / this.size.x, y: newSize.y / this.size.y };
	}

	apply(point: Vec2): Vec2 {
		const cos = Math.cos(this.rot);
		const sin = Math.sin(this.rot);

		// Scale
		let x = point.x * this.scale.x;
		let y = point.y * this.scale.y;

		// Rotate
		const xRotated = x * cos - y * sin;
		const yRotated = x * sin + y * cos;

		// Translate
		return {
			x: xRotated + this.pos.x,
			y: yRotated + this.pos.y,
		};
	}

	translate(delta: Vec2) {
		this.pos.x += delta.x;
		this.pos.y += delta.y;
	}
}
