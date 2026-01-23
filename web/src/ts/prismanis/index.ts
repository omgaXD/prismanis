import { Curve, drawCurve, drawCurveObject, Paint } from "./drawing";
import { LightRaycaster } from "./light";
import { curveAdderFactory, Scene } from "./scene";
import { initPaintTools, initLightRaycaster, setupToolSwitcher, setupClearButton } from "./toolSwitcher";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let currentScene = new Scene();

function adjustCanvasSize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - canvas.getBoundingClientRect().top;
}

function setupRender(paint: Paint, lightRaycaster: LightRaycaster) {
	function renderScene() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		dottedCanvas(ctx);
		currentScene.objects.forEach((obj) => {
			if (obj.type === "curve") {
				drawCurveObject(ctx, obj);
			}
		});
		if (paint.cur) {
			drawCurve(ctx, paint.cur);
		}
		for (const ray of lightRaycaster.rays) {
			drawCurve(ctx, ray);
		}
		requestAnimationFrame(renderScene);
	}
	requestAnimationFrame(renderScene);
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

function getTransformedCurvesFromScene(scene: Scene): Curve[] {
	const curves: Curve[] = [];
	for (const obj of scene.getAllOfType("curve")) {
		const transformedCurve: Curve = {
			points: obj.curve.points.map((p) => {
				const tp = obj.transform.apply(p);
				return { x: tp.x, y: tp.y };
			}),
			thickness: obj.curve.thickness,
			color: obj.curve.color,
			isClosed: obj.curve.isClosed,
		};
		curves.push(transformedCurve);
	}
	return curves;
}

if (ctx) {
	adjustCanvasSize();
	window.addEventListener("resize", adjustCanvasSize);

	const paint = initPaintTools(canvas, curveAdderFactory(currentScene));
	const lightRaycaster = initLightRaycaster(canvas, () => getTransformedCurvesFromScene(currentScene));

	setupToolSwitcher([
		{ tool: paint, name: "draw" },
		{ tool: lightRaycaster, name: "light-source" },
	]);
	setupClearButton(currentScene);
	setupRender(paint, lightRaycaster);
}
