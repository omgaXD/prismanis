import { Scene, Transform } from "./entities/scene";
import { SceneCurveObject, SceneLensObject, SceneLightObject } from "./entities/sceneObjects";
import { wavelengthToRGB } from "./math/colorPhysics";
import { calculateWidth } from "./math/lensHelpers";
import { bake, rays } from "./math/raycasting";
import { Vec2, Curve, Rect } from "./primitives";
import { LensTool, PreviewLens } from "./tools/lensTool";
import { PaintTool } from "./tools/paintTool";
import { RaycastRay, RaycastTool } from "./tools/raycastTool";
import { registeredTools } from "./tools/tool";
import { TransformTool } from "./tools/transformTool";


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
	registerEscapeListener: (listener: () => void) => void;
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

	drawScene(scene: Scene, paint: PaintTool, lightRaycaster: RaycastTool, lensTool: LensTool, transformTool: TransformTool) {
		this.clear();
		scene.getObjects().forEach((obj) => {
			if (obj.type === "curve") {
				drawCurveObject(this.ctx, obj);
			} else if (obj.type === "lens") {
				drawLensObject(this.ctx, obj);
			} else if (obj.type === "light") {
				const rays = bake(obj, scene);
				drawLightSourceObj(this.ctx, obj);
				drawRays(this.ctx, rays);
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
		drawRays(this.ctx, lightRaycaster.previewRays);
		if (lensTool.previewLens) {
			drawLensPreview(this.ctx, lensTool.previewLens);
		}
		if (transformTool.selectionRect) {
			drawSelectionRect(this.ctx, transformTool.selectionRect);
		}
	}

	setupRender(scene: Scene) {
		const paint = registeredTools.find((t) => t instanceof PaintTool);
		const lightRaycaster = registeredTools.find((t) => t instanceof RaycastTool);
		const lensTool = registeredTools.find((t) => t instanceof LensTool);
		const transformTool = registeredTools.find((t) => t instanceof TransformTool);
		if (!(paint instanceof PaintTool)) {
			throw new Error("Paint tool not registered");
		}
		if (!(lightRaycaster instanceof RaycastTool)) {
			throw new Error("Raycast tool not registered");
		}
		if (!(lensTool instanceof LensTool)) {
			throw new Error("Lens tool not registered");
		}
		function drawLoop(drawScene: typeof Renderer.prototype.drawScene) {
			requestAnimationFrame(() => {
				drawScene(scene, paint!, lightRaycaster!, lensTool!, transformTool!);
				drawLoop(drawScene);
			});
		}
		drawLoop(this.drawScene.bind(this));
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
			registerEscapeListener: (listener: () => void) => {
				window.addEventListener("keydown", (ev) => {
					if (ev.key === "Escape") {
						listener();
					}
				});
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

function drawCurveObject(ctx: CanvasRenderingContext2D, curveObj: SceneCurveObject) {
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

function drawLensObject(ctx: CanvasRenderingContext2D, lensObj: SceneLensObject) {
	const lens = lensObj.lens;
	const pos = lensObj.transform.getPosition();
	const rot = lensObj.transform.getRotation();
	const height = lensObj.transform.getSize().y;
	const thick = lens.middleExtraThickness;

	ctx.save();

	const { leftArc, rightArc } = calculateWidth(lens, height);
	const heightHalf = height / 2;
	const small1 = Math.sqrt(lens.r1 * lens.r1 - heightHalf * heightHalf);
	const small2 = Math.sqrt(lens.r2 * lens.r2 - heightHalf * heightHalf);

	ctx.translate(pos.x, pos.y);
	ctx.rotate(rot);

	ctx.fillStyle = lensObj.material.fillColor;
	ctx.strokeStyle = lensObj.material.strokeColor;
	ctx.lineWidth = DEFAULT_THICKNESS;

	// adjust the context position according to the lens curvature
	const diff = (rightArc - leftArc) / 2;
	ctx.translate(-diff, 0);

	ctx.beginPath();
	ctx.moveTo(-thick / 2, -height / 2);

	if (lens.r1 < 0) {
		ctx.lineTo(-thick / 2 - leftArc, -height / 2);
		ctx.arcTo(
			(heightHalf * heightHalf) / small1 - thick / 2 - leftArc,
			0,
			-thick / 2 - leftArc,
			height / 2,
			Math.abs(lens.r1),
		);
	} else {
		ctx.arcTo(-((heightHalf * heightHalf) / small1) - thick / 2, 0, -thick / 2, height / 2, Math.abs(lens.r1));
	}

	ctx.lineTo(thick / 2, height / 2);

	if (lens.r2 < 0) {
		ctx.lineTo(thick / 2 + rightArc, height / 2);
		ctx.arcTo(
			-((heightHalf * heightHalf) / small2) + thick / 2 + rightArc,
			0,
			thick / 2 + rightArc,
			-height / 2,
			Math.abs(lens.r2),
		);
	} else {
		ctx.arcTo((heightHalf * heightHalf) / small2 + thick / 2, 0, thick / 2, -height / 2, Math.abs(lens.r2));
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function drawLensPreview(ctx: CanvasRenderingContext2D, previewLens: PreviewLens) {
	// equivalent to (-thick/2, height/2)
	const tl = previewLens.topLeft;
	// equivalent to (thick/2, -height/2)
	const br = {
		x: previewLens.topLeft.x + previewLens.lens.middleExtraThickness,
		y: previewLens.topLeft.y + previewLens.height,
	};

	const height = previewLens.height;
	const lens = previewLens.lens;

	const { leftArc, rightArc } = calculateWidth(lens, height);
	const heightHalf = height / 2;
	const small1 = Math.sqrt(lens.r1 * lens.r1 - heightHalf * heightHalf);
	const small2 = Math.sqrt(lens.r2 * lens.r2 - heightHalf * heightHalf);

	ctx.save();
	ctx.strokeStyle = "#ffff00";
	ctx.lineWidth = DEFAULT_THICKNESS;

	ctx.beginPath();
	ctx.moveTo(tl.x, tl.y);

	if (lens.r1 === Infinity) {
		ctx.lineTo(tl.x, br.y);
	} else if (lens.r1 < 0) {
		ctx.lineTo(tl.x - leftArc, tl.y);
		ctx.arcTo(
			(heightHalf * heightHalf) / small1 - leftArc + tl.x,
			tl.y + heightHalf,
			tl.x - leftArc,
			br.y,
			Math.abs(lens.r1),
		);
	} else {
		ctx.arcTo(-((heightHalf * heightHalf) / small1) + tl.x, tl.y + heightHalf, tl.x, br.y, Math.abs(lens.r1));
	}

	ctx.lineTo(br.x, br.y);

	if (lens.r2 === Infinity) {
		ctx.lineTo(br.x, tl.y);
	} else if (lens.r2 < 0) {
		ctx.lineTo(br.x + rightArc, br.y);
		ctx.arcTo(
			-((heightHalf * heightHalf) / small2) + br.x + rightArc,
			tl.y + heightHalf,
			br.x + rightArc,
			tl.y,
			Math.abs(lens.r2),
		);
	} else {
		ctx.arcTo((heightHalf * heightHalf) / small2 + br.x, tl.y + heightHalf, br.x, tl.y, Math.abs(lens.r2));
	}
	ctx.closePath();
	ctx.stroke();
	ctx.restore();
}

function drawCurve(
	ctx: CanvasRenderingContext2D,
	curve: Curve,
	color: string = DEFAULT_STROKE_COLOR,
	lightBlending: boolean = false,
) {
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

function drawLightSourceObj(ctx: CanvasRenderingContext2D, lightSourceObject: SceneLightObject) {
	const corners = lightSourceObject.transform.getCorners();
	ctx.save();
	ctx.fillStyle = "#ffff00";
	ctx.beginPath();
	ctx.moveTo(corners.tl.x, corners.tl.y);
	ctx.lineTo(corners.tr.x, corners.tr.y);
	ctx.lineTo(corners.br.x, corners.br.y);
	ctx.lineTo(corners.bl.x, corners.bl.y);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

function drawRays(ctx: CanvasRenderingContext2D, rays: RaycastRay[]) {
	for (const ray of rays) {
		const { r, g, b } = wavelengthToRGB(ray.wavelength);
		drawCurve(ctx, ray, `rgba(${r}, ${g}, ${b}, ${ray.opacity})`, true);
	}
}

function drawSelectionRect(ctx: CanvasRenderingContext2D, rect: Rect) {
	ctx.save();
	ctx.strokeStyle = "#8888ff";
	ctx.fillStyle = "#8888ff33";
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.rect(rect.x, rect.y, rect.width, rect.height);
	ctx.stroke();
	ctx.fill();
	ctx.restore();
}