import { Curve, Paint } from "./painting";
import { LightRaycaster } from "./light";
import { curveAdderFactory, Scene, Transform } from "./scene";
import {
	initPaintTools,
	initLightRaycaster,
	setupToolSwitcher,
	setupClearButton,
	initTransformTool,
} from "./toolSwitcher";
import { Renderer } from "./render";
import { getTransformedCurvesFromScene } from "./helpers";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let currentScene = new Scene();


if (ctx) {
	const renderer = new Renderer(canvas);

	const paint = initPaintTools(renderer.getToolHelper(), curveAdderFactory(currentScene));
	const lightRaycaster = initLightRaycaster(renderer.getToolHelper(), () => getTransformedCurvesFromScene(currentScene));
	const transformTool = initTransformTool(renderer.getToolHelper(), currentScene);
	renderer.setupRender(currentScene, paint, lightRaycaster);

	setupToolSwitcher([
		{ tool: paint, name: "draw" },
		{ tool: lightRaycaster, name: "light-source" },
		{ tool: transformTool, name: "transform" },
	]);
	setupClearButton(currentScene);
}
