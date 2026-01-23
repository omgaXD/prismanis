import { Curve, Paint } from "./painting";
import { LightRaycaster } from "./light";
import { Scene } from "./scene";
import { TransformTool } from "./transformTool";
import { ToolHelper } from "./render";

export function initPaintTools(hlp: ToolHelper, onClosed: (curve: Curve) => void) {
	const paint = new Paint({
		closedDistanceThreshold: 20,
		drawingThreshold: 20,
		hlp,
		onCurveClosed: onClosed,
	});
	paint.init();
	return paint;
}

export function initLightRaycaster(hlp: ToolHelper, getTransformedCurves: () => Curve[]) {
	const lightRaycaster = new LightRaycaster({
		hlp,
		getTransformedCurves,
	});
	lightRaycaster.init();
	return lightRaycaster;
}

export function initTransformTool(hlp: ToolHelper, scene: Scene) {
	const transformTool = new TransformTool({
		hlp,
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
