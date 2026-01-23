import { dist, pointInRect } from "./helpers";
import { Scene } from "./scene";

export type TransformToolOptions = {
	canvas: HTMLCanvasElement;
	scene: Scene;
};

export class TransformTool {
	private enabled: boolean = false;
	private dragging: boolean = false;
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

	onMouseDown(event: MouseEvent) {
		if (!this.enabled) return;
		// Find first object being touched
		const shiftKey = event.shiftKey;

		const rect = this.o.canvas.getBoundingClientRect();
		const mousePos = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};

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
		if (!this.mightDeselect) {
            this.isReasonableDrag = false;
            return;
        }
        if (this.isReasonableDrag === true) {
            this.isReasonableDrag = false;
            this.mightDeselect = false;
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

	onMouseMove(event: MouseEvent) {
		if (!this.enabled) return;
		if (!this.o.scene.selectedObjectIds.length) return;
		if (!this.dragging) return;

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
}
