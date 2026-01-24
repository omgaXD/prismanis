import { dist, pointInRect } from "../math/geometry";
import { ToolHelper } from "../render";
import { Scene } from "../entities/scene";
import { AbstractTool, BaseToolOptions } from "./tool";

export type TransformToolOptions = BaseToolOptions & {
	hlp: ToolHelper;
	scene: Scene;
};

export class TransformTool extends AbstractTool {
	private dragging: boolean = false;
	private rotating: boolean = false;
	private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
	private initialMousePos: { x: number; y: number } = { x: 0, y: 0 };
	private isReasonableDrag = false;
	private mightDeselect: boolean = false;
	private recentlySelectedIds: Set<string> = new Set();
	private transformActionIndex: number | null = null;

	onToggled(enabled: boolean) {
		if (!enabled) {
			this.o.scene.deselect();
		}
	}

	constructor(private o: TransformToolOptions) {
		super(o);
		this.init();
	}

	init() {
		this.o.hlp.registerMouseDownListener(this.onMouseDown.bind(this));
		this.o.hlp.registerMouseUpListener(this.onMouseUp.bind(this));
		this.o.hlp.registerMouseMoveListener(this.onMouseMove.bind(this));
	}

	tryStartRotation(event: MouseEvent): boolean {
		if (this.o.scene.selectedObjectIds.length !== 1) return false;

		const mousePos = this.o.hlp.mpg(event);

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
			this.transformActionIndex = this.o.scene.startTransform(this.o.scene.selectedObjectIds);
			return true;
		}

		return false;
	}

	onMouseDown(event: MouseEvent) {
		if (!this.isEnabled()) return;
		// Find first object being touched
		const shiftKey = event.shiftKey;

		const mousePos = this.o.hlp.mpg(event);

		if (this.tryStartRotation(event)) {
			return;
		}

		for (const obj of this.o.scene.getObjects()) {
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
				this.transformActionIndex = this.o.scene.startTransform(this.o.scene.selectedObjectIds);
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
		if (!this.isEnabled()) return;
		if (this.dragging) {
			if (this.transformActionIndex !== null) {
				this.o.scene.endTransform(this.transformActionIndex);
				this.transformActionIndex = null;
			}
			this.dragging = false;
		}
		if (!this.o.scene.selectedObjectIds.length) return;
		if (this.rotating) {
			this.rotating = false;
			this.mightDeselect = false;
			if (this.transformActionIndex !== null) {
				this.o.scene.endTransform(this.transformActionIndex);
				this.transformActionIndex = null;
			}
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

		const mousePos = this.o.hlp.mpg(event);

		// Treat as click
		const objId = this.o.scene.selectedObjectIds[0];
		this.recentlySelectedIds.add(objId);
		for (const obj of this.o.scene.getObjects()) {
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
		const mousePos = this.o.hlp.mpg(event);

		this.lastMousePos = mousePos;

		const obj = this.o.scene.getObjectById(this.o.scene.selectedObjectIds[0]);
		if (!obj) return;

		const center = obj.transform.getPosition();
		const angle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x);
		obj.transform.setRotation(angle + Math.PI / 2);
	}
	drag(event: MouseEvent) {
		const mousePos = this.o.hlp.mpg(event);

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
		if (!this.isEnabled()) return;
		if (!this.o.scene.selectedObjectIds.length) return;
		if (this.dragging) this.drag(event);
		else if (this.rotating) this.rotate(event);
	}
}
