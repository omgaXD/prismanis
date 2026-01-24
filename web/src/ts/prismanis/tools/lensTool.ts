import { calculateWidth, Lens } from "../lensHelpers";
import { Vec2 } from "../primitives";
import { ToolHelper } from "../render";
import { LensAdder, Scene, SceneLensObject, Transform } from "../scene";
import { AbstractTool, BaseToolOptions } from "./tool";

type LensToolOptions = BaseToolOptions & {
	hlp: ToolHelper;
	scene: Scene;
	lensAdder: LensAdder;
};

export type PreviewLens = {
	lens: Lens;
	height: number;
	topLeft: Vec2;
};

export class LensTool extends AbstractTool {
	state: "idle" | "rectangle" | "firstRadius" | "secondRadius" = "idle";
	previewLens: PreviewLens | null = null;
	fixedPoint: Vec2 | null = null;
	reasonableDrag: boolean = false;

	constructor(private o: LensToolOptions) {
		super(o);
		this.init();
	}

	protected onToggled(enabled: boolean): void {
		console.log("Lens tool toggled:", enabled);
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
		this.o.hlp.registerMouseDownListener((e) => {
			if (this.isEnabled() === false) return;
            if (e.button === 2) {
                this.state = "idle";
                this.previewLens = null;
                return;
            }
			if (this.state === "idle") {
				this.state = "rectangle";
				this.reasonableDrag = false;
				this.fixedPoint = this.o.hlp.mpg(e);
				this.previewLens = {
					lens: {
						middleExtraThickness: 0,
						r1: Infinity,
						r2: Infinity,
					},
					height: 0,
					topLeft: this.o.hlp.mpg(e),
				};
			} else if (this.state === "rectangle") {
				this.adjustPreviewRect(this.o.hlp.mpg(e));
				this.state = "firstRadius";
			} else if (this.state === "firstRadius") {
				const r1 = this.getRadius1(this.o.hlp.mpg(e));
				if (r1 !== null && this.previewLens) {
					this.previewLens.lens.r1 = r1;
					this.state = "secondRadius";
				}
			} else if (this.state === "secondRadius") {
				const r2 = this.getRadius2(this.o.hlp.mpg(e));
				if (r2 !== null && this.previewLens) {
					this.previewLens.lens.r2 = r2;
					const w = calculateWidth(this.previewLens.lens, this.previewLens.height);
					const offsetX = (w.leftArc - w.rightArc) / 2;
					const center = this.getCenter();
					center!.x -= offsetX;
					this.o.lensAdder(this.previewLens!.lens, center!, this.previewLens!.height);
					this.previewLens = null;
					this.state = "idle";
				}
			}
		});
		this.o.hlp.registerMouseUpListener((e) => {
			if (this.isEnabled() === false) return;

			if (this.state === "rectangle") {
				if (this.reasonableDrag) {
					this.state = "firstRadius";
				} else {
					// probably user expects to not drag but rather click the corners
				}
			}
		});
		this.o.hlp.registerMouseMoveListener((e) => {
			if (this.isEnabled() === false) return;
			if (this.state === "rectangle") {
				this.adjustPreviewRect(this.o.hlp.mpg(e));
			} else if (this.state === "firstRadius") {
				// Update preview for radius 1
				const r1 = this.getRadius1(this.o.hlp.mpg(e)) ?? Infinity;
				this.previewLens!.lens.r1 = r1;
			} else if (this.state === "secondRadius") {
				// Update preview for radius 2
				const r2 = this.getRadius2(this.o.hlp.mpg(e)) ?? Infinity;
				this.previewLens!.lens.r2 = r2;
			}
		});
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

	private adjustPreviewRect(clickedAt: Vec2) {
		if (!this.previewLens || !this.fixedPoint) return;
		this.previewLens.height = Math.abs(clickedAt.y - this.fixedPoint.y);
		this.previewLens.topLeft.y = Math.min(clickedAt.y, this.fixedPoint.y);
		this.previewLens.lens.middleExtraThickness = Math.abs(clickedAt.x - this.fixedPoint.x);
		this.previewLens.topLeft.x = Math.min(clickedAt.x, this.fixedPoint.x);
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
	private getRadius1(clickedAt: Vec2): number | null {
		if (!this.getCenter()) return null;
		const height = this.previewLens!.height;
		let diffX = this.previewLens!.topLeft.x - clickedAt.x;
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
	private getRadius2(clickedAt: Vec2): number | null {
		if (!this.getCenter()) return null;
		const height = this.previewLens!.height;
		let diffX = this.previewLens!.topLeft.x + this.previewLens!.lens.middleExtraThickness - clickedAt.x;
		if (diffX > 0) {
			diffX = Math.min(diffX, height / 2 - 1);
		} else {
			diffX = Math.max(diffX, -height / 2 + 1);
		}
		const radius = (diffX * diffX + (height * height) / 4) / (2 * diffX);
		return Math.abs(radius) >= height / 2 ? radius : null;
	}
}
