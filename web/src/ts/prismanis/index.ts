import { drawCurve, Paint } from "./drawing";
import { LightRaycaster } from "./light";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function adjustCanvasSize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - canvas.getBoundingClientRect().top;
}

function initPaintTools() {
	const paint = new Paint({
		closedDistanceThreshold: 20,
		ctx: ctx,
		canvas: canvas,
	});
	paint.init();
	return paint;
}

function initLightRaycaster(paint: Paint) {
	const lightRaycaster = new LightRaycaster({
		history: paint.history,
		canvas: canvas,
	});
	lightRaycaster.init();
	return lightRaycaster;
}

function setupToolSwitcher(paint: Paint, lightRaycaster: LightRaycaster) {
	function adjustTool() {
		const checkedTool = (document.querySelector('input[name="tool"]:checked') as HTMLInputElement).value;
		paint.toggle(checkedTool === "toggle-draw");
		lightRaycaster.toggle(checkedTool === "toggle-light-source");
	}
	adjustTool();
	const toolInputs = document.querySelectorAll('input[name="tool"]');
	toolInputs.forEach((input) => {
		input.addEventListener("change", adjustTool);
	});
}

function setupClearButton(paint: Paint) {
	const clearButton = document.getElementById("clear-btn") as HTMLButtonElement;
	clearButton.addEventListener("click", () => {
		paint.clear();
	});
}

function setupRender(paint: Paint, lightRaycaster: LightRaycaster) {
	function render() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
        dottedCanvas(ctx);
		for (const curve of paint.history) {
			drawCurve(ctx, curve);
		}
		if (paint.cur) {
			drawCurve(ctx, paint.cur);
		}
		for (const ray of lightRaycaster.rays) {
			drawCurve(ctx, ray);
		}
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
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

if (ctx) {
	adjustCanvasSize();
	window.addEventListener("resize", adjustCanvasSize);

	const paint = initPaintTools();
	const lightRaycaster = initLightRaycaster(paint);

	setupToolSwitcher(paint, lightRaycaster);
	setupClearButton(paint);
	setupRender(paint, lightRaycaster);
}
