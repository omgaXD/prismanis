import { LensAdder } from "../entities/sceneObjects";
import { calculateWidth, Lens } from "../math/lensHelpers";
import { Vec2 } from "../primitives";
import { CanvasInteractionHelper } from "../render";
import { Scene } from "../entities/scene";
import { AbstractTool, BaseToolOptions } from "./tool";
import {
	GLOBAL_MATERIAL_TOOL_SETTING,
	GLOBAL_SNAP_ANGLE_TOOL_SETTING,
	ToolSettingSnapAngle,
} from "../entities/toolSettings";
import { Material } from "../entities/material";

type LensToolOptions = BaseToolOptions & {
	hlp: CanvasInteractionHelper;
	scene: Scene;
	addLens: LensAdder;
};

export type PreviewLens = {
	lens: Lens;
	height: number;
	topLeft: Vec2;
	rotationRad: number;
};

export class LensTool extends AbstractTool {
	state: "idle" | "rectangle" | "firstRadius" | "secondRadius" | "rotate" = "idle";
	previewLens: PreviewLens | null = null;
	// for rect
	fixedAt: Vec2 | null = null;
	// for angle
	fixedAt2: Vec2 | null = null;
	reasonableDrag: boolean = false;
	snapAngle: number = 0;
	material: Material | null = null;

	constructor(private o: LensToolOptions) {
		super(o);
		this.init();
	}

	protected onToggled(enabled: boolean): void {
		if (enabled === false) {
			this.state = "idle";
			this.previewLens = null;
		}
	}

	init() {
		this.o.hlp.registerEscapeListener(() => {
			if (this.isEnabled() === false) return;
			this.state = "idle";
			this.previewLens = null;
		});
		this.o.hlp.registerMouseDownListener((e) => this.onMouseDown(e));
		this.o.hlp.registerMouseMoveListener((e) => this.onMouseMove(e));
		this.o.hlp.registerMouseUpListener((e) => this.onMouseUp(e));
		this.registerSetting(GLOBAL_SNAP_ANGLE_TOOL_SETTING, (newVal) => {
			this.snapAngle = newVal * (Math.PI / 180);
		});
		this.registerSetting(GLOBAL_MATERIAL_TOOL_SETTING, (val) => {
			this.material = val;
		});
	}

	private onMouseDown(e: MouseEvent): void {
		this.reasonableDrag = false;
		if (this.isEnabled() === false) return;
		if (this.state === "idle") {
			const pos = this.o.hlp.getMousePosition(e);
			this.startAt(pos);
			this.state = "rectangle";
		} else if (this.state === "rectangle") {
			this.state = "firstRadius";
		} else if (this.state === "firstRadius") {
			this.state = "secondRadius";
		} else if (this.state === "secondRadius") {
			this.state = "rotate";
			this.fixedAt2 = this.o.hlp.getMousePosition(e);
		} else if (this.state === "rotate") {
			const center = this.getCenter();
			if (!this.previewLens || !center) return;
			const { leftArc, rightArc } = calculateWidth(this.previewLens.lens, this.previewLens.height);
			const offset = (leftArc - rightArc) / 2;
			const sin = Math.sin(this.previewLens.rotationRad);
			const cos = Math.cos(this.previewLens.rotationRad);
			const offsetX = offset * cos;
			const offsetY = offset * sin;
			this.o.addLens(
				this.previewLens.lens,
				{
					x: center.x - offsetX,
					y: center.y - offsetY,
				},
				this.previewLens.height,
				this.previewLens.rotationRad,
				this.material || undefined,
			);
			this.state = "idle";
			this.previewLens = null;
		}
	}

	private onMouseUp(e: MouseEvent): void {
		if (this.isEnabled() === false) return;
		if (this.state === "rectangle" && this.reasonableDrag) {
			this.state = "firstRadius";
		}
	}

	private onMouseMove(e: MouseEvent): void {
		if (this.isEnabled() === false) return;
		if (this.state === "rectangle") {
			this.adjustPreviewRect(this.o.hlp.getMousePosition(e));
		} else if (this.state === "firstRadius") {
			const r1 = this.getRadius1(this.o.hlp.getMousePosition(e)) ?? Infinity;
			this.previewLens!.lens.r1 = r1;
		} else if (this.state === "secondRadius") {
			const r2 = this.getRadius2(this.o.hlp.getMousePosition(e)) ?? Infinity;
			this.previewLens!.lens.r2 = r2;
		} else if (this.state === "rotate") {
			this.adjustRotation(this.o.hlp.getMousePosition(e));
		}
	}

	private startAt(mousePos: Vec2) {
		this.previewLens = {
			lens: {
				r1: Infinity,
				r2: Infinity,
				middleExtraThickness: 1,
			},
			height: 1,
			topLeft: { x: mousePos.x, y: mousePos.y },
			rotationRad: 0,
		};
		this.fixedAt = mousePos;
	}

	private getCenter(): Vec2 | null {
		if (this.previewLens) {
			return {
				x: this.previewLens.topLeft.x + this.previewLens.lens.middleExtraThickness / 2,
				y: this.previewLens.topLeft.y + this.previewLens.height / 2,
			};
		}
		return null;
	}

	private adjustRotation(mousePos: Vec2) {
		if (!this.previewLens || !this.getCenter()) return;
		const center = this.getCenter()!;
		const angle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x);
		const initialAngle = Math.atan2(this.fixedAt2!.y - center.y, this.fixedAt2!.x - center.x);
		const deltaAngle = angle - initialAngle;
		let snappedAngle = deltaAngle;
		if (this.snapAngle > 0) {
			const snapRad = this.snapAngle;
			snappedAngle = Math.round(deltaAngle / snapRad) * snapRad;
		}
		this.previewLens.rotationRad = snappedAngle;
	}

	private adjustPreviewRect(mousePos: Vec2) {
		if (!this.previewLens || !this.fixedAt) return;
		this.previewLens.height = Math.abs(mousePos.y - this.fixedAt.y);
		this.previewLens.topLeft.y = Math.min(mousePos.y, this.fixedAt.y);
		this.previewLens.lens.middleExtraThickness = Math.abs(mousePos.x - this.fixedAt.x);
		this.previewLens.topLeft.x = Math.min(mousePos.x, this.fixedAt.x);
		if (this.previewLens.lens.middleExtraThickness < 1) {
			this.previewLens.lens.middleExtraThickness = 1;
		}
		if (this.previewLens.height < 1) {
			this.previewLens.height = 1;
		}
		if (this.previewLens.lens.middleExtraThickness > 10 && this.previewLens.height > 10) {
			this.reasonableDrag = true;
		}
	}

	/**
	 * Null if called in invalid state or if radius is impossible for given height
	 */
	private getRadius1(mousePos: Vec2): number | null {
		if (!this.getCenter()) return null;
		const height = this.previewLens!.height;
		let diffX = this.previewLens!.topLeft.x - mousePos.x;
		if (diffX > 0) {
			diffX = Math.min(diffX, height / 2 - 1);
		} else {
			diffX = Math.max(diffX, -height / 2 + 1);
		}
		const radius = (diffX * diffX + (height * height) / 4) / (2 * diffX);
		return Math.abs(radius) >= height / 2 ? radius : null;
	}

	/**
	 * Null if called in invalid state or if radius is impossible for given width
	 */
	private getRadius2(mousePos: Vec2): number | null {
		if (!this.getCenter()) return null;
		const height = this.previewLens!.height;
		let diffX = this.previewLens!.topLeft.x + this.previewLens!.lens.middleExtraThickness - mousePos.x;
		if (diffX > 0) {
			diffX = Math.min(diffX, height / 2 - 1);
		} else {
			diffX = Math.max(diffX, -height / 2 + 1);
		}
		const radius = (diffX * diffX + (height * height) / 4) / (2 * diffX);
		return Math.abs(radius) >= height / 2 ? -radius : null;
	}
}
