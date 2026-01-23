import { curveAdderFactory, Scene } from "./scene";
import { initPaintTools, initLightRaycaster, setupTools, initTransformTool } from "./tools";
import { Renderer } from "./render";
import { getTransformedCurvesFromScene } from "./helpers";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let currentScene = new Scene();

if (ctx) {
	const renderer = new Renderer(canvas);

	const paint = initPaintTools(renderer.getToolHelper(), curveAdderFactory(currentScene));
	const lightRaycaster = initLightRaycaster(renderer.getToolHelper(), () =>
		getTransformedCurvesFromScene(currentScene),
	);
	const transformTool = initTransformTool(renderer.getToolHelper(), currentScene);
	renderer.setupRender(currentScene, paint, lightRaycaster);

	setupTools(currentScene, [
		{ tool: paint, name: "draw" },
		{ tool: lightRaycaster, name: "light-source" },
		{ tool: transformTool, name: "transform" },
	]);
}
