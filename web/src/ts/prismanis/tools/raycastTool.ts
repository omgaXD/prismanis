import { RAY_CONFIGS, RayOptions } from "../entities/rayConfigs";
import { normalizeVec2 } from "../math/geometry";
import { Curve, Vec2 } from "../primitives";
import { CanvasInteractionHelper } from "../render";
import { Scene } from "../entities/scene";
import { ToolSettingSelect, ToolSettingSnapAngle } from "../entities/toolSettings";
import { AbstractTool, BaseToolOptions } from "./tool";
import { rays } from "../math/raycasting/raycasting";
import { LightSourceAdder } from "../entities/sceneObjects";

export type RaycastToolOptions = BaseToolOptions & {
	hlp: CanvasInteractionHelper;
	scene: Scene;
	addLightSource: LightSourceAdder;
};

export type RaycastRay = Curve & {
	wavelength: number;
	opacity: number;
};

export class RaycastTool extends AbstractTool {
	previewRays: RaycastRay[] = [];
	rayConfig: RayOptions[] = [];
	state: "idle" | "choose-direction" = "idle";
	fixedAt: Vec2 | null = null;
	isReasonableDrag = false;
	snapAngle: number = 0;

	constructor(private o: RaycastToolOptions) {
		super(o);
		this.init();
	}

	addToScene(clickedAt: Vec2) {
		if (!this.fixedAt) return;
		const dir = normalizeVec2({
			x: clickedAt.x - this.fixedAt.x,
			y: clickedAt.y - this.fixedAt.y,
		});
		if (this.snapAngle > 0) {
			const angle = Math.atan2(dir.y, dir.x);
			const snappedAngle = Math.round(angle / this.snapAngle) * this.snapAngle;
			dir.x = Math.cos(snappedAngle);
			dir.y = Math.sin(snappedAngle);
		}
		this.o.addLightSource(this.rayConfig, this.fixedAt, dir);
	}

	init() {
		this.o.hlp.registerMouseDownListener((ev) => {
			if (!this.isEnabled()) {
				return;
			}
			if (this.state === "idle") {
				this.fixedAt = this.o.hlp.getMousePosition(ev);
				this.isReasonableDrag = false;
				this.state = "choose-direction";
			} else if (this.state === "choose-direction") {
				this.addToScene(this.o.hlp.getMousePosition(ev));
				this.state = "idle";
				this.fixedAt = null;
				this.previewRays = [];
			}
		});

		this.o.hlp.registerMouseUpListener((ev) => {
			if (!this.isEnabled()) {
				return;
			}
			if (this.state === "choose-direction" && this.isReasonableDrag) {
				this.addToScene(this.o.hlp.getMousePosition(ev));
				this.state = "idle";
				this.fixedAt = null;
				this.previewRays = [];
			}
		});

		this.o.hlp.registerMouseMoveListener((ev) => {
			if (!this.isEnabled()) {
				return;
			}
			const mouse = this.o.hlp.getMousePosition(ev);
			let at: Vec2;
			let mainDir: Vec2;
			if (this.state === "idle") {
				at = mouse;
				mainDir = { x: 1, y: 0 };
			} else if (this.state === "choose-direction" && this.fixedAt) {
				at = this.fixedAt;
				if (!this.isReasonableDrag) {
					const dragDist = Math.hypot(mouse.x - this.fixedAt.x, mouse.y - this.fixedAt.y);
					if (dragDist > 5) {
						this.isReasonableDrag = true;
					}
				}
				let dir = normalizeVec2({
					x: mouse.x - this.fixedAt.x,
					y: mouse.y - this.fixedAt.y,
				});
				if (this.snapAngle > 0) {
					const angle = Math.atan2(dir.y, dir.x);
					const snappedAngle = Math.round(angle / this.snapAngle) * this.snapAngle;
					dir = { x: Math.cos(snappedAngle), y: Math.sin(snappedAngle) };
				}
				mainDir = dir;
			} else throw new Error("Invalid state in mouse move listener");
			this.previewRays = rays(at, mainDir, this.rayConfig, this.o.scene);
		});

		this.o.hlp.registerMouseLeaveListener(() => {
			if (!this.isEnabled()) {
				return;
			}
			this.previewRays.length = 0;
		});

		this.o.hlp.registerEscapeListener(() => {
			if (this.isEnabled() === false) return;
			this.state = "idle";
			this.fixedAt = null;
		});

		this.registerSetting(
			new ToolSettingSelect({
				id: "raycast-type",
				displayName: "Raycast Type",
				options: [
					{ value: "sunlight", displayName: "Sunlight" },
					{ value: "laser", displayName: "Simple Laser" },
					{ value: "flashlight", displayName: "Flashlight" },
					{ value: "lamp", displayName: "Lamp" },
					{ value: "floodlight", displayName: "Flood Light" },
					{ value: "floodsunlight", displayName: "Flood Sunlight" },
				],
				default: "sunlight",
				value: "sunlight",
			}),
			(newValue) => {
				if (!(newValue in RAY_CONFIGS)) {
					throw new Error(`Unsupported raycast type: ${newValue}`);
				}
				this.rayConfig = RAY_CONFIGS[newValue as keyof typeof RAY_CONFIGS];
			},
		);

		this.registerSetting(new ToolSettingSnapAngle({ id: "raycast-snap-angle" }), (newVal) => {
			this.snapAngle = newVal * (Math.PI / 180);
		});
	}

	onToggled(enabled: boolean) {
		if (!enabled) {
			this.previewRays = [];
		}
	}
}
