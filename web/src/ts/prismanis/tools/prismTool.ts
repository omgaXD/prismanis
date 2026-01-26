import { CurveAdder } from "../entities/sceneObjects";
import { ToolSettingSelect, ToolSettingSnapAngle } from "../entities/toolSettings";
import { Curve, Vec2 } from "../primitives";
import { CanvasInteractionHelper } from "../render";
import { AbstractTool, BaseToolOptions } from "./tool";

type PrismToolOptions = BaseToolOptions & {
	hlp: CanvasInteractionHelper;
	addCurve: CurveAdder;
};

const RIGHT_TRIANGLE: Curve = {
	isClosed: true,
	points: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
	],
};

const EQUILATERAL_TRIANGLE: Curve = {
	isClosed: true,
	points: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 1 / 2, y: (Math.sqrt(3) * 1) / 2 },
	],
};

const SQUARE: Curve = {
	isClosed: true,
	points: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 1, y: 1 },
		{ x: 0, y: 1 },
	],
};

export class PrismTool extends AbstractTool {
	state: "idle" | "rect" | "rotate" = "idle";
	fixedAt: Vec2 | null = null;
	fixedAt2: Vec2 | null = null;
	fixedAt3: Vec2 | null = null;
	reasonableDrag: boolean = false;
	snapAngle: number = 0;
	curve: Curve = RIGHT_TRIANGLE;

	constructor(private o: PrismToolOptions) {
		super(o);
		this.init();
	}

	private init() {
		this.o.hlp.registerMouseDownListener((e) => this.onMouseDown(e));
		this.o.hlp.registerMouseMoveListener((e) => this.onMouseMove(e));
		this.o.hlp.registerMouseUpListener((e) => this.onMouseUp(e));
		this.o.hlp.registerEscapeListener(() => this.onEscape());

		this.registerSetting(
			new ToolSettingSnapAngle({
				id: "prism-tool-snap-angle",
			}),
			(val) => {
				this.snapAngle = val * (Math.PI / 180);
			},
		);

		this.registerSetting(
			new ToolSettingSelect({
				id: "prism-tool-type",
				displayName: "Prism Type",
				value: "right",
				default: "right",
				options: [
					{ value: "right", displayName: "Right Triangle" },
					{ value: "equilateral", displayName: "Equilateral Triangle" },
					{ value: "square", displayName: "Square" },
				],
			}),
			(val) => {
				switch (val) {
					case "right":
						this.curve = RIGHT_TRIANGLE;
						break;
					case "equilateral":
						this.curve = EQUILATERAL_TRIANGLE;
						break;
					case "square":
						this.curve = SQUARE;
						break;
				}
			},
		);
	}

	private onMouseDown(e: MouseEvent): void {
		if (!this.isEnabled()) return;
		this.reasonableDrag = false;
		if (this.state === "idle") {
			this.state = "rect";
		} else if (this.state === "rect") {
			this.state = "rotate";
		} else if (this.state === "rotate") {
			this.createPrism();
			this.state = "idle";
			this.fixedAt = null;
			this.fixedAt2 = null;
			this.fixedAt3 = null;
		}
	}

	private onMouseMove(e: MouseEvent): void {
		if (!this.isEnabled()) return;
		const pos = this.o.hlp.getMousePosition(e);
		if (this.state === "idle") {
			this.fixedAt = pos;
			this.fixedAt2 = { x: pos.x + 100, y: pos.y + 100 };
		} else if (this.state === "rect") {
			if (e.shiftKey && this.fixedAt) {
				// Maintain aspect ratio
				const dx = pos.x - this.fixedAt.x;
				const dy = pos.y - this.fixedAt.y;
				const size = Math.max(Math.abs(dx), Math.abs(dy));
				this.fixedAt2 = {
					x: this.fixedAt.x + Math.sign(dx) * size,
					y: this.fixedAt.y + Math.sign(dy) * size,
				};
				return;
			}
			this.fixedAt2 = pos;
			if (this.fixedAt && (Math.abs(this.fixedAt2.x - this.fixedAt.x) > 5 || Math.abs(this.fixedAt2.y - this.fixedAt.y) > 5)) {
				this.reasonableDrag = true;
			}
		} else if (this.state === "rotate") {
			this.fixedAt3 = pos;
		}
		this.previewPrism();
	}

	private onMouseUp(e: MouseEvent): void {
		if (!this.isEnabled()) return;
		if (this.state === "rect" && this.reasonableDrag) {
			this.state = "rotate";
		}
	}

	private onEscape(): void {
		if (!this.isEnabled()) return;
		this.state = "idle";
		this.fixedAt = null;
		this.fixedAt2 = null;
		this.fixedAt3 = null;
	}

	previewPrism(): Curve | null {
		if (!this.isEnabled()) return null;
		if (this.fixedAt && this.fixedAt2) {
			const scaleX = this.fixedAt2.x - this.fixedAt.x;
			const scaleY = this.fixedAt2.y - this.fixedAt.y;
			const previewCurve: Curve = {
				isClosed: this.curve.isClosed,
				points: this.curve.points.map((p) => ({
					x: this.fixedAt!.x + p.x * scaleX,
					y: this.fixedAt!.y + p.y * scaleY,
				})),
			};
			if (this.state === "rotate" && this.fixedAt3) {
				const centerX = (this.fixedAt.x + this.fixedAt2.x) / 2;
				const centerY = (this.fixedAt.y + this.fixedAt2.y) / 2;

				let angle = Math.atan2(this.fixedAt3.y - centerY, this.fixedAt3.x - centerX);
				if (this.snapAngle > 0) {
					const snapRad = this.snapAngle;
					const snappedAngle = Math.round(angle / snapRad) * snapRad;
					angle = snappedAngle;
				}
				const cosA = Math.cos(angle);
				const sinA = Math.sin(angle);

				// rotate around the center between fixedAt and fixedAt2

				const rotatedPoints: Vec2[] = previewCurve.points.map((p) => {
					const translatedX = p.x - centerX;
					const translatedY = p.y - centerY;
					return {
						x: translatedX * cosA - translatedY * sinA + centerX,
						y: translatedX * sinA + translatedY * cosA + centerY,
					};
				});

				previewCurve.points = rotatedPoints;
			}
			return previewCurve;
		} else {
			return null;
		}
	}

	private createPrism() {
		const previewCurve = this.previewPrism();
		if (previewCurve) {
			this.o.addCurve(previewCurve);
		}
	}

	protected onToggled(enabled: boolean): void {
		if (!enabled) {
			this.state = "idle";
		}
	}
}
