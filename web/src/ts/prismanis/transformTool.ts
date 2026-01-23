import { dist, pointInRect } from "./helpers";
import { Scene } from "./scene";

export type TransformToolOptions = {
	canvas: HTMLCanvasElement;
	scene: Scene;
};

export class TransformTool {
	private enabled: boolean = false;
	private dragging: boolean = false;
	private rotating: boolean = false;
	private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
	private initialMousePos: { x: number; y: number } = { x: 0, y: 0 };
	private isReasonableDrag = false;
	private mightDeselect: boolean = false;
	private recentlySelectedIds: Set<string> = new Set();

	toggle(enabled: boolean) {
		this.enabled = enabled;
		if (!this.enabled) {
			this.o.scene.deselect();
		}
	}

	constructor(private o: TransformToolOptions) {
		this.o.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
		this.o.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
		this.o.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
	}

	tryStartRotation(event: MouseEvent): boolean {
		if (this.o.scene.selectedObjectIds.length !== 1) return false;

		const rect = this.o.canvas.getBoundingClientRect();
		const mousePos = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};

		const obj = this.o.scene.getObjectById(this.o.scene.selectedObjectIds[0]);
		if (!obj) return false;

		const corners = obj.transform.getCorners();
		const centerTop = {
			x: (corners.tl.x + corners.tr.x) / 2,
			y: (corners.tl.y + corners.tr.y) / 2,
		};
		const handlePos = {
			x: centerTop.x + 30 * Math.sin(obj.transform.getRotation()),
			y: centerTop.y + -30 * Math.cos(obj.transform.getRotation()),
		};

		const handleRadius = 8;
		if (dist(mousePos, handlePos) <= handleRadius) {
			this.rotating = true;
			return true;
		}

		return false;
	}

	onMouseDown(event: MouseEvent) {
		if (!this.enabled) return;
		// Find first object being touched
		const shiftKey = event.shiftKey;

		const rect = this.o.canvas.getBoundingClientRect();
		const mousePos = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};

		if (this.tryStartRotation(event)) {
			return;
		}

		for (const obj of this.o.scene.objects) {
			if (this.recentlySelectedIds.has(obj.id)) continue;
			const rect = obj.transform.getBoundingRect();
			if (pointInRect(mousePos, rect)) {
				if (shiftKey) {
					this.o.scene.addToSelection(obj.id);
				} else {
					if (this.o.scene.isObjectSelected(obj.id) && this.o.scene.selectedObjectIds.length === 1) {
						this.mightDeselect = true;
					} else {
						this.o.scene.selectOnly(obj.id);
					}
				}
				this.dragging = true;
				this.lastMousePos = mousePos;
				this.initialMousePos = mousePos;
				return;
			}
		}
		this.recentlySelectedIds.clear();
		if (!shiftKey) {
			this.o.scene.deselect();
		}
	}

	onMouseUp(event: MouseEvent) {
		if (!this.enabled) return;
		this.dragging = false;
		if (!this.o.scene.selectedObjectIds.length) return;
		if (this.rotating) {
			this.rotating = false;
			this.mightDeselect = false;
			return;
		}
		if (this.isReasonableDrag === true) {
			this.isReasonableDrag = false;
			this.mightDeselect = false;
			return;
		}
		if (!this.mightDeselect) {
			this.isReasonableDrag = false;
			return;
		}

		const rect = this.o.canvas.getBoundingClientRect();
		const mousePos = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};

		// Treat as click
		const objId = this.o.scene.selectedObjectIds[0];
		this.recentlySelectedIds.add(objId);
		for (const obj of this.o.scene.objects) {
			if (this.recentlySelectedIds.has(obj.id)) continue;
			const rect = obj.transform.getBoundingRect();
			if (pointInRect(mousePos, rect)) {
				this.o.scene.selectOnly(obj.id);
				this.mightDeselect = false;
				return;
			}
		}
		this.recentlySelectedIds.clear();
		this.o.scene.deselect();
		this.mightDeselect = false;
	}

	rotate(event: MouseEvent) {
		const rect = this.o.canvas.getBoundingClientRect();
		const mousePos = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		this.lastMousePos = mousePos;

		const obj = this.o.scene.getObjectById(this.o.scene.selectedObjectIds[0]);
		if (!obj) return;

		const center = obj.transform.getPosition();
		const angle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x);
		obj.transform.setRotation(angle + Math.PI / 2);
	}
	drag(event: MouseEvent) {
		const rect = this.o.canvas.getBoundingClientRect();
		const mousePos = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		const mouseDelta = {
			x: mousePos.x - this.lastMousePos.x,
			y: mousePos.y - this.lastMousePos.y,
		};
		this.lastMousePos = mousePos;

		if (dist(mousePos, this.initialMousePos) > 5) {
			this.isReasonableDrag = true;
		}

		for (const id of this.o.scene.selectedObjectIds) {
			const obj = this.o.scene.getObjectById(id);
			if (obj) {
				obj.transform.translate(mouseDelta);
			}
		}
	}

	onMouseMove(event: MouseEvent) {
		if (!this.enabled) return;
		if (!this.o.scene.selectedObjectIds.length) return;
		if (this.dragging) this.drag(event);
		else if (this.rotating) this.rotate(event);
	}
}
