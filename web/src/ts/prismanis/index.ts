import { curveAdderFactory, Scene } from "./scene";
import { setupTools } from "./tools";
import { Renderer } from "./render";
import { getTransformedCurvesFromScene } from "./helpers";
import { PaintTool } from "./tools/paintTool";
import { RaycastTool } from "./tools/raycastTool";
import { TransformTool } from "./tools/transformTool";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let currentScene = new Scene();

if (ctx) {
	const renderer = new Renderer(canvas);

	const paintTool = new PaintTool({
		hlp: renderer.getToolHelper(),
		onCurveClosed: curveAdderFactory(currentScene),
		closedDistanceThreshold: 40,
		drawingThreshold: 20
	})
	const raycastTool = new RaycastTool({
		hlp: renderer.getToolHelper(),
		getTransformedCurves: () => getTransformedCurvesFromScene(currentScene)
	})
	const transformTool = new TransformTool({
		hlp: renderer.getToolHelper(),
		scene: currentScene
	})
	renderer.setupRender(currentScene, paintTool, raycastTool);

	setupTools(currentScene, [
		{ tool: paintTool, name: "paint" },
		{ tool: raycastTool, name: "raycast" },
		{ tool: transformTool, name: "transform" },
	]);
}
