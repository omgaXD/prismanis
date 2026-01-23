import { EXAGGERATED_GLASS_MATERIAL, GLASS_MATERIAL, Material } from "./material";
import { Rect, Vec2, Curve } from "./primitives";

type BaseEvent = {};

type HistoryAvailabilityChangedEvent = BaseEvent & {
	type: "history-availability-changed";
	which: "undo" | "redo";
	available: boolean;
};

type SceneObjectEvent = BaseEvent & {
	type: "scene-object-changed";
	addedObjectIds: string[];
	removedObjectIds: string[];
	selectedObjectIds: string[];
};

export type SceneEvent = HistoryAvailabilityChangedEvent | SceneObjectEvent;

type EventMap = {
	"history-availability-changed": HistoryAvailabilityChangedEvent;
	"scene-object-changed": SceneObjectEvent;
};

export class Scene {
	private objects: SceneObject[];
	selectedObjectIds: string[];
	past: SceneAction[] = [];
	future: SceneAction[] = [];
	historyMutationInProgress: boolean = false;
	private historyAvailabilityChangedListeners: ((event: HistoryAvailabilityChangedEvent) => void)[] = [];
	private sceneObjectChangedListeners: ((event: SceneObjectEvent) => void)[] = [];

	constructor() {
		this.objects = [];
		this.selectedObjectIds = [];
	}

	addListener<K extends keyof EventMap>(type: K, listener: (event: EventMap[K]) => void) {
		if (type === "history-availability-changed") {
			this.historyAvailabilityChangedListeners.push(listener as (event: HistoryAvailabilityChangedEvent) => void);
		} else if (type === "scene-object-changed") {
			this.sceneObjectChangedListeners.push(listener as (event: SceneObjectEvent) => void);
		}
	}

	removeListener<K extends keyof EventMap>(type: K, listener: (event: EventMap[K]) => void) {
		if (type === "history-availability-changed") {
			this.historyAvailabilityChangedListeners = this.historyAvailabilityChangedListeners.filter(
				(l) => l !== (listener as (event: HistoryAvailabilityChangedEvent) => void),
			);
		} else if (type === "scene-object-changed") {
			this.sceneObjectChangedListeners = this.sceneObjectChangedListeners.filter(
				(l) => l !== (listener as (event: SceneObjectEvent) => void),
			);
		}
	}

	private notifySceneObjectChanged(addedObjectIds: string[], removedObjectIds: string[]) {
		const event: SceneObjectEvent = {
			type: "scene-object-changed",
			addedObjectIds,
			removedObjectIds,
			selectedObjectIds: [...this.selectedObjectIds],
		};
		for (const listener of this.sceneObjectChangedListeners) {
			listener(event);
		}
	}

	private notifyHistoryAvailabilityChanged(
		type: "history-availability-changed",
		which: "undo" | "redo",
		available: boolean,
	) {
		const event: HistoryAvailabilityChangedEvent = { type, which, available };
		for (const listener of this.historyAvailabilityChangedListeners) {
			listener(event);
		}
	}

	private updateHistoryAvailability() {
		this.notifyHistoryAvailabilityChanged("history-availability-changed", "undo", this.canUndo());
		this.notifyHistoryAvailabilityChanged("history-availability-changed", "redo", this.canRedo());
	}

	getObjects(): readonly SceneObject[] {
		return this.objects;
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
		this.notifySceneObjectChanged([], []);
	}

	isObjectSelected(objectId: string): boolean {
		return this.selectedObjectIds.includes(objectId);
	}

	addToSelection(objectId: string) {
		this.ensureObjectExists(objectId);

		if (!this.isObjectSelected(objectId)) {
			this.selectedObjectIds.push(objectId);
			this.notifySceneObjectChanged([], []);
		}
	}

	removeFromSelection(objectId: string) {
		this.ensureObjectExists(objectId);

		this.selectedObjectIds = this.selectedObjectIds.filter((id) => id !== objectId);
		this.notifySceneObjectChanged([], []);
	}

	deselect() {
		this.selectedObjectIds.length = 0;
		this.notifySceneObjectChanged([], []);
	}

	clear() {
		this.selectedObjectIds.length = 0;
		this.remove(this.objects);
	}

	isPointInbounds(point: Vec2): boolean {
		if (point.x < 0 || point.y < 0) return false;
		if (point.x > 1920 || point.y > 1080) return false;
		return true;
	}

	startTransform(on: string[]): number {
		this.pushAction({
			type: "transform",
			affectedObjects: on.map((id) => {
				const obj = this.getObjectById(id);
				if (!obj) {
					throw new Error(`Object with ID ${id} does not exist in the scene.`);
				}
				return {
					id: id,
					oldTransform: obj.transform.clone(),
					newTransform: obj.transform.clone(),
				};
			}),
		});
		this.historyMutationInProgress = true;
		return this.past.length - 1;
	}

	endTransform(of: number) {
		this.historyMutationInProgress = false;
		const action = this.past[of];
		if (action && action.type === "transform") {
			for (const affected of action.affectedObjects) {
				const obj = this.getObjectById(affected.id);
				if (obj) {
					affected.newTransform = obj.transform.clone();
				}
			}
		}
	}

	pushAction(action: SceneAction) {
		this.past.push(action);
		this.future.length = 0;
		this.updateHistoryAvailability();
	}

	add(object: SceneObject) {
		this.objects.push(object);
		this.pushAction({
			type: "add",
			object: object,
		});
		this.notifySceneObjectChanged([object.id], []);
	}

	remove(objects: SceneObject[] | string[] | SceneObject | string) {
		const objsToRemove: SceneObject[] = [];

		if (Array.isArray(objects)) {
			for (const objOrId of objects) {
				const obj = typeof objOrId === "string" ? this.getObjectById(objOrId) : objOrId;
				if (obj) {
					objsToRemove.push(obj);
				}
			}
		} else {
			const obj = typeof objects === "string" ? this.getObjectById(objects) : objects;
			if (obj) {
				objsToRemove.push(obj);
			}
		}

		this.objects = this.objects.filter((obj) => !objsToRemove.includes(obj));
		this.pushAction({
			type: "remove",
			objects: objsToRemove,
		});
		this.notifySceneObjectChanged(
			[],
			objsToRemove.map((o) => o.id),
		);
	}

	undo() {
		if (this.historyMutationInProgress) {
			return;
		}

		const action = this.past.pop();
		if (!action) {
			return;
		}

		switch (action.type) {
			case "add":
				this.objects = this.objects.filter((obj) => obj.id !== action.object.id);
				break;
			case "remove":
				this.objects.push(...action.objects);
				break;
			case "transform":
				for (const affected of action.affectedObjects) {
					const obj = this.getObjectById(affected.id);
					if (obj) {
						obj.transform = affected.oldTransform;
					}
				}
				break;
		}

		this.future.push(action);
		this.updateHistoryAvailability();
	}

	redo() {
		if (this.historyMutationInProgress) {
			return;
		}

		const action = this.future.pop();
		if (!action) {
			return;
		}

		switch (action.type) {
			case "add":
				this.objects.push(action.object);
				break;
			case "remove":
				this.objects = this.objects.filter((obj) => !action.objects.some((o) => o.id === obj.id));
				break;
			case "transform":
				for (const affected of action.affectedObjects) {
					const obj = this.getObjectById(affected.id);
					if (obj) {
						obj.transform = affected.newTransform;
					}
				}
				break;
		}

		this.past.push(action);
		this.updateHistoryAvailability();
	}

	canUndo() {
		return this.past.length > 0 && this.historyMutationInProgress === false;
	}
	canRedo() {
		return this.future.length > 0 && this.historyMutationInProgress === false;
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
			material: EXAGGERATED_GLASS_MATERIAL,
		};

		scene.add(sceneObject);
		return sceneObject;
	};
}

export type SceneActionBase = {};

export type SceneAddObjectAction = SceneActionBase & {
	type: "add";
	object: SceneObject;
};

export type SceneRemoveObjectAction = SceneActionBase & {
	type: "remove";
	objects: SceneObject[];
};

export type SceneTransformObjectAction = SceneActionBase & {
	type: "transform";
	affectedObjects: {
		id: string;
		oldTransform: Transform;
		newTransform: Transform;
	}[];
};

export type SceneAction = SceneAddObjectAction | SceneRemoveObjectAction | SceneTransformObjectAction;

export type SceneObjectBase = {
	id: string;
	transform: Transform;
};

export type SceneCurveObject = SceneObjectBase & {
	type: "curve";
	curve: Curve;
	material: Material;
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
