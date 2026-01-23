import { RaycastTool } from "./tools/raycastTool";
import { PaintTool } from "./tools/paintTool";
import { Curve, Vec2 } from "./primitives";
import { Scene, SceneCurveObject, Transform } from "./scene";
import { wavelengthToRGB } from "./helpers";
import { registeredTools } from "./tools/tool";

const DEFAULT_THICKNESS = 8;
const DEFAULT_STROKE_COLOR = "#ffffff";
const DEFAULT_FILL_COLOR = "#ffffff88";

type MousePositionGetter = (ev: MouseEvent) => Vec2;

export type ToolHelper = {
	mpg: MousePositionGetter;
	registerMouseUpListener: (listener: (ev: MouseEvent) => void) => void;
	registerMouseDownListener: (listener: (ev: MouseEvent) => void) => void;
	registerMouseMoveListener: (listener: (ev: MouseEvent) => void) => void;
	registerMouseLeaveListener: (listener: (ev: MouseEvent) => void) => void;
};

export class Renderer {
	ctx: CanvasRenderingContext2D;
	canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("Could not get 2D context from canvas");
		}
		this.ctx = context;

		window.addEventListener("resize", this.adjustCanvasSize.bind(this));
		this.adjustCanvasSize();
	}

	adjustCanvasSize() {
		this.canvas.width = 1;
		this.canvas.width = this.canvas.parentElement!.getBoundingClientRect().width;
		this.canvas.height = window.innerHeight - this.canvas.getBoundingClientRect().top;
	}

	clear() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		dottedCanvas(this.ctx);
	}

	drawScene(scene: Scene, paint: PaintTool, lightRaycaster: RaycastTool) {
		this.clear();
		scene.getObjects().forEach((obj) => {
			if (obj.type === "curve") {
				drawCurveObject(this.ctx, obj);
			}
		});

		scene.selectedObjectIds.forEach((id) => {
			const obj = scene.getObjectById(id);
			if (obj) {
				drawSelectionAround(this.ctx, obj.transform);
			}
		});
		if (paint.cur) {
			drawCurve(this.ctx, paint.cur, "#ffff00");
		}
		for (const ray of lightRaycaster.rays) {
			const {r,g,b} = wavelengthToRGB(ray.wavelength);
			drawCurve(this.ctx, ray, `rgba(${r}, ${g}, ${b}, ${ray.opacity})`, true);
		}
	}

	setupRender(scene: Scene) {
		const paint = registeredTools.find(t => t instanceof PaintTool);
		const lightRaycaster = registeredTools.find(t => t instanceof RaycastTool);
		if (!(paint instanceof PaintTool) || !(lightRaycaster instanceof RaycastTool)) {
			throw new Error("PaintTool or RaycastTool not registered");
		}
		requestAnimationFrame(() => {
			this.drawScene(scene, paint, lightRaycaster);
			this.setupRender(scene);
		});
	}

	mousePositionFactory(): MousePositionGetter {
		return (ev: MouseEvent) => {
			const rect = this.canvas.getBoundingClientRect();
			return {
				x: ev.clientX - rect.left,
				y: ev.clientY - rect.top,
			};
		};
	}

	getToolHelper(): ToolHelper {
		return {
			mpg: this.mousePositionFactory(),
			registerMouseUpListener: (listener: (ev: MouseEvent) => void) => {
				this.canvas.addEventListener("mouseup", listener);
			},
			registerMouseDownListener: (listener: (ev: MouseEvent) => void) => {
				this.canvas.addEventListener("mousedown", listener);
			},
			registerMouseMoveListener: (listener: (ev: MouseEvent) => void) => {
				this.canvas.addEventListener("mousemove", listener);
			},
			registerMouseLeaveListener: (listener: (ev: MouseEvent) => void) => {
				this.canvas.addEventListener("pointerleave", listener);
			},
		};
	}
}

function drawRotationHandle(ctx: CanvasRenderingContext2D, obj: Transform) {
	const rect = obj.getCorners();
	const centerTop = {
		x: (rect.tl.x + rect.tr.x) / 2,
		y: (rect.tl.y + rect.tr.y) / 2,
	};
	const handlePos = {
		x: centerTop.x + 30 * Math.sin(obj.getRotation()),
		y: centerTop.y + -30 * Math.cos(obj.getRotation()),
	};

	ctx.save();
	ctx.strokeStyle = "#ff8888";
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(centerTop.x, centerTop.y);
	ctx.lineTo(handlePos.x, handlePos.y);
	ctx.stroke();

	ctx.fillStyle = "#ff8888";
	ctx.beginPath();
	ctx.arc(handlePos.x, handlePos.y, 8, 0, 2 * Math.PI);
	ctx.fill();
	ctx.restore();
}

function drawSelectionAround(ctx: CanvasRenderingContext2D, obj: Transform) {
	const rect = obj.getCorners();
	ctx.save();
	ctx.strokeStyle = "#8888ff";
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.moveTo(rect.tl.x, rect.tl.y);
	ctx.lineTo(rect.tr.x, rect.tr.y);
	ctx.lineTo(rect.br.x, rect.br.y);
	ctx.lineTo(rect.bl.x, rect.bl.y);
	ctx.closePath();
	ctx.stroke();
	ctx.restore();

	drawRotationHandle(ctx, obj);
}

function dottedCanvas(ctx: CanvasRenderingContext2D) {
	// Dotted grid background
	const gridSize = 50;
	ctx.strokeStyle = "#ffffff22";
	ctx.lineWidth = 1;
	for (let x = 0; x < ctx.canvas.width; x += gridSize) {
		for (let y = 0; y < ctx.canvas.height; y += gridSize) {
			ctx.beginPath();
			ctx.arc(x, y, 1, 0, 2 * Math.PI);
			ctx.fillStyle = "#ffffff22";
			ctx.fill();
		}
	}
}

export function drawCurveObject(ctx: CanvasRenderingContext2D, curveObj: SceneCurveObject) {
	const curve = curveObj.curve;
	if (curve.points.length === 0) return;

	const thickness = DEFAULT_THICKNESS;
	const strokeColor = curveObj.material.strokeColor;
	const fillColor = curveObj.material.fillColor;

	ctx.save();
	ctx.lineWidth = thickness;
	ctx.strokeStyle = strokeColor;
	ctx.fillStyle = fillColor;

	const pos = curveObj.transform.getPosition();
	const rot = curveObj.transform.getRotation();
	ctx.translate(pos.x, pos.y);
	ctx.rotate(rot);
	ctx.beginPath();
	ctx.moveTo(curve.points[0].x, curve.points[0].y);
	for (let i = 1; i < curve.points.length; i++) {
		ctx.lineTo(curve.points[i].x, curve.points[i].y);
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	// ctx.fillStyle = "#ff0000";
	// for (let i = 0; i < curve.points.length; i++) {
	// 	const p = curve.points[i];
	// 	ctx.beginPath();
	// 	ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
	// 	ctx.fill();
	// }
	ctx.restore();
}

export function drawCurve(ctx: CanvasRenderingContext2D, curve: Curve, color: string = DEFAULT_STROKE_COLOR, lightBlending: boolean = false) {
	if (curve.points.length === 0) return;

	const thickness = DEFAULT_THICKNESS;

	ctx.save();
	ctx.lineWidth = thickness;
	ctx.strokeStyle = color;
	if (lightBlending) {
		ctx.globalCompositeOperation = "screen";
	}

	ctx.beginPath();
	ctx.moveTo(curve.points[0].x, curve.points[0].y);
	for (let i = 1; i < curve.points.length; i++) {
		ctx.lineTo(curve.points[i].x, curve.points[i].y);
	}
	if (curve.isClosed) {
		ctx.closePath();
		ctx.fillStyle = DEFAULT_FILL_COLOR;
		ctx.fill();
	}
	ctx.stroke();
	ctx.restore();
}
