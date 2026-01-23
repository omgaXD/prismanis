import { Curve, Paint } from "./painting";
import { LightRaycaster } from "./light";
import { Scene } from "./scene";
import { TransformTool } from "./transformTool";

export function initPaintTools(canvas: HTMLCanvasElement, onClosed: (curve: Curve) => void) {
	const paint = new Paint({
		closedDistanceThreshold: 20,
		drawingThreshold: 20,
		canvas: canvas,
		onCurveClosed: onClosed,
	});
	paint.init();
	return paint;
}

export function initLightRaycaster(canvas: HTMLCanvasElement, getTransformedCurves: () => Curve[]) {
	const lightRaycaster = new LightRaycaster({
		canvas,
		getTransformedCurves,
	});
	lightRaycaster.init();
	return lightRaycaster;
}

export function initTransformTool(canvas: HTMLCanvasElement, scene: Scene) {
	const transformTool = new TransformTool({
		canvas,
		scene,
	});
	return transformTool;
}

interface Toggleable {
	toggle(bool: boolean): void;
}

type Tool = {
	tool: Toggleable;
	name: string;
};

export function setupToolSwitcher(tools: Tool[]) {
	function adjustTool() {
		const checkedTool = (document.querySelector('input[name="tool"]:checked') as HTMLInputElement).value;
		tools.forEach(({ tool, name }) => {
			tool.toggle(`toggle-${name}` === checkedTool);
		});
	}
	adjustTool();
	const toolInputs = document.querySelectorAll('input[name="tool"]');
	toolInputs.forEach((input) => {
		input.addEventListener("change", adjustTool);
	});
}

export function setupClearButton(scene: Scene) {
	const clearButton = document.getElementById("clear-btn") as HTMLButtonElement;
	clearButton.addEventListener("click", () => {
		scene.clear();
	});
}
