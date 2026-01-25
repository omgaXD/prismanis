import { dist, doRotatedRectsOverlap, pointInRotatedRect } from "../math/geometry";
import { ToolHelper } from "../render";
import { Scene } from "../entities/scene";
import { AbstractTool, BaseToolOptions } from "./tool";
import { Rect, Vec2 } from "../primitives";

export type TransformToolOptions = BaseToolOptions & {
	hlp: ToolHelper;
	scene: Scene;
};

export class TransformTool extends AbstractTool {
	private state: "idle" | "rotating" | "short-click" | "moving" | "selecting" = "idle";
	private lastAngle = 0;
	private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
	private initialMousePos: { x: number; y: number } = { x: 0, y: 0 };
	private mouseDownClicked: string[] = [];
	private transformActionIndex: number | null = null;
	private rotatedObj: string | null = null;

	selectionRect: Rect | null = null;

	onToggled(enabled: boolean) {
		if (!enabled) {
			this.o.scene.deselect();
			this.state = "idle";
			this.selectionRect = null;
			this.transformActionIndex = null;
		}
	}

	constructor(private o: TransformToolOptions) {
		super(o);
		this.init();
	}

	private init() {
		this.o.hlp.registerMouseDownListener(this.onMouseDown.bind(this));
		this.o.hlp.registerMouseUpListener(this.onMouseUp.bind(this));
		this.o.hlp.registerMouseMoveListener(this.onMouseMove.bind(this));
	}

	private startTransform() {
		if (this.o.scene.selectedObjectIds.length === 0) return;
		this.transformActionIndex = this.o.scene.startTransform(this.o.scene.selectedObjectIds);
	}

	private endTransform() {
		if (this.transformActionIndex !== null) {
			this.o.scene.endTransform(this.transformActionIndex);
			this.transformActionIndex = null;
		}
	}

	private tryStartRotation(event: MouseEvent): boolean {
		if (this.o.scene.selectedObjectIds.length === 0) return false;

		const mousePos = this.o.hlp.mpg(event);
		for (const id of this.o.scene.selectedObjectIds) {
			const obj = this.o.scene.getObjectById(id);
			if (!obj) continue;

			const corners = obj.transform.getCorners();
			const centerTop = {
				x: (corners.tl.x + corners.tr.x) / 2,
				y: (corners.tl.y + corners.tr.y) / 2,
			};
			const handlePos = {
				x: centerTop.x + 30 * Math.sin(obj.transform.getRotation()),
				y: centerTop.y + -30 * Math.cos(obj.transform.getRotation()),
			};

			const handleRadius = 12;
			if (dist(mousePos, handlePos) <= handleRadius) {
				this.state = "rotating";
				this.rotatedObj = obj.id;
				this.lastAngle = Math.atan2(
					mousePos.y - obj.transform.getPosition().y,
					mousePos.x - obj.transform.getPosition().x,
				);
				this.transformActionIndex = this.o.scene.startTransform(this.o.scene.selectedObjectIds);
				return true;
			}
		}

		return false;
	}

	private onMouseDown(event: MouseEvent) {
		if (!this.isEnabled()) return;
		const shiftKey = event.shiftKey;
		const mousePos = this.o.hlp.mpg(event);

		this.initialMousePos = mousePos;
		this.lastMousePos = mousePos;

		if (this.tryStartRotation(event)) {
			return;
		}

		if (this.state === "idle") {
			const clickedObjs: string[] = [];
			for (const obj of this.o.scene.getObjects()) {
				const {tl,tr,bl,br} = obj.transform.getCorners();
				if (pointInRotatedRect(mousePos, tl, tr, bl, br)) {
					clickedObjs.push(obj.id);
				}
			}

			if (clickedObjs.length === 0) {
				this.startSelection(mousePos);
				return;
			}

			this.mouseDownClicked = clickedObjs;

			this.state = "short-click";
			this.startTransform();
		}
	}

	private startSelection(mousePos: Vec2) {
		this.state = "selecting";
		this.selectionRect = {
			x: mousePos.x,
			y: mousePos.y,
			width: 0,
			height: 0,
		};
	}

	private onMouseUp(event: MouseEvent) {
		if (!this.isEnabled()) return;

		if (this.state === "rotating") {
			this.endTransform();
			this.state = "idle";
			this.rotatedObj = null;
			return;
		} else if (this.state === "moving") {
			this.endTransform();
			this.state = "idle";
			return;
		} else if (this.state === "short-click") {
			const { clickedSelected, clickedNotSelected, nextReasonableSelection } = this.getSelectionDetails();

			if (clickedNotSelected.length > 0) {
				if (event.shiftKey) {
					this.o.scene.addToSelection(nextReasonableSelection!);
				} else {
					this.o.scene.selectOnly(nextReasonableSelection!);
				}
			} else if (clickedSelected.length > 0) {
				if (event.shiftKey) {
					this.o.scene.removeFromSelection(clickedSelected[0]);
				} else {
					this.o.scene.selectOnly(clickedSelected[0]);
				}
			} else {
				this.o.scene.deselect();
			}
			this.state = "idle";

			return;
		} else if (this.state === "selecting") {
			const mousePos = this.o.hlp.mpg(event);
			this.selectWithin(mousePos, event.shiftKey);
			this.state = "idle";
			return;
		}
	}

	private onMouseMove(event: MouseEvent) {
		if (!this.isEnabled()) return;
		if (this.state === "rotating") {
			this.rotate(event);
		} else if (this.state === "moving" || this.state === "short-click") {
			this.drag(event);
		} else if (this.state === "selecting") {
			this.updateSelection(event);
		}
	}

	private getSelectionDetails() {
		const clickedSelected: string[] = [];
		const clickedNotSelected: string[] = [];
		let nextReasonableSelection: string | null = null;
		this.mouseDownClicked.forEach((el) => {
			if (this.o.scene.isObjectSelected(el)) {
				clickedSelected.push(el);
			} else {
				clickedNotSelected.push(el);
				if (clickedSelected.length > 0 && nextReasonableSelection === null) {
					nextReasonableSelection = el;
				}
			}
		});
		if (nextReasonableSelection === null && clickedNotSelected.length > 0) {
			nextReasonableSelection = clickedNotSelected[0];
		}
		return {
			clickedSelected,
			clickedNotSelected,
			nextReasonableSelection,
		};
	}

	private rotate(event: MouseEvent) {
		const mousePos = this.o.hlp.mpg(event);

		this.lastMousePos = mousePos;

		const obj = this.o.scene.getObjectById(this.rotatedObj!);
		if (!obj) return;

		const center = obj.transform.getPosition();
		const angle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x);
		const angleDelta = angle - this.lastAngle;
		this.lastAngle = angle;
		for (const id of this.o.scene.selectedObjectIds) {
			const selectedObj = this.o.scene.getObjectById(id);
			if (selectedObj) {
				selectedObj.transform.rotate(angleDelta);
			}
		}
	}
	private drag(event: MouseEvent) {
		const mousePos = this.o.hlp.mpg(event);

		const mouseDelta = {
			x: mousePos.x - this.lastMousePos.x,
			y: mousePos.y - this.lastMousePos.y,
		};
		this.lastMousePos = mousePos;

		if (this.state === "short-click") {
			const d = this.getSelectionDetails();
			if (d.clickedSelected.length > 0) {
				// ok move these
			} else {
				if (d.clickedNotSelected.length === 0)
					throw new Error("Impossible state reached: short-click, but no one  clicked");
				if (event.shiftKey) {
					this.o.scene.addToSelection(d.clickedNotSelected[0]);
				} else {
					this.o.scene.selectOnly(d.clickedNotSelected[0]);
				}
			}
		}

		if (this.state === "short-click" && dist(mousePos, this.initialMousePos) > 5) {
			this.state = "moving";
		}

		for (const id of this.o.scene.selectedObjectIds) {
			const obj = this.o.scene.getObjectById(id);
			if (obj) {
				obj.transform.translate(mouseDelta);
			}
		}
	}

	private selectWithin(mousePos: { x: number; y: number }, shiftKey: boolean) {
		const x1 = this.initialMousePos.x;
		const y1 = this.initialMousePos.y;
		const x2 = mousePos.x;
		const y2 = mousePos.y;
		const rect: Rect = {
			x: Math.min(x1, x2),
			y: Math.min(y1, y2),
			width: Math.abs(x2 - x1),
			height: Math.abs(y2 - y1),
		};
		this.selectionRect = null;

		const selectedIds: string[] = [];
		for (const obj of this.o.scene.getObjects()) {
			const { tl, tr, bl, br } = obj.transform.getCorners();
			const inRect = doRotatedRectsOverlap(tl, tr, bl, { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }, { x: rect.x, y: rect.y + rect.height });
			if (inRect) {
				selectedIds.push(obj.id);
			}
		}
		if (selectedIds.length > 0) {
			if (shiftKey) {
				for (const id of selectedIds) {
					this.o.scene.addToSelection(id);
				}
			} else {
				this.o.scene.selectOnly(selectedIds[0]);
				for (let i = 1; i < selectedIds.length; i++) {
					this.o.scene.addToSelection(selectedIds[i]);
				}
			}
		} else {
			if (shiftKey === false) {
				this.o.scene.deselect();
			}
		}
	}

	private updateSelection(ev: MouseEvent) {
		const mousePos = this.o.hlp.mpg(ev);
		const x1 = this.initialMousePos.x;
		const y1 = this.initialMousePos.y;
		const x2 = mousePos.x;
		const y2 = mousePos.y;
		this.selectionRect = {
			x: Math.min(x1, x2),
			y: Math.min(y1, y2),
			width: Math.abs(x2 - x1),
			height: Math.abs(y2 - y1),
		};
	}
}
