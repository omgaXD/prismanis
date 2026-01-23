import { curveAdderFactory, Scene } from "./scene";
import { setupTools, switchToTool } from "./tools";
import { Renderer } from "./render";
import { getTransformedCurvesFromScene } from "./helpers";
import { PaintTool } from "./tools/paintTool";
import { RaycastTool } from "./tools/raycastTool";
import { TransformTool } from "./tools/transformTool";
import { registerTool } from "./tools/tool";
import { trackSceneObjects } from "./sceneObjectTracker";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let currentScene = new Scene();

if (ctx) {
	const renderer = new Renderer(canvas);

	registerTool(new PaintTool({
			id: "paint",
			displayName: "Paint Tool",
			displayDescription: "Draw freeform closed curves. Open curves will dissapear.",
			hlp: renderer.getToolHelper(),
			onCurveClosed: curveAdderFactory(currentScene),
		}));
	registerTool(new RaycastTool({
		id: "raycast",
		displayName: "Raycast Tool",
		displayDescription: "Cast rays. Hold left click to fix the ray origin.",
		hlp: renderer.getToolHelper(),
		getTransformedCurves: () => getTransformedCurvesFromScene(currentScene),
		scene: currentScene,
	}))
	const transformTool = registerTool(new TransformTool({
		id: "transform",
		displayName: "Transform Tool",
		displayDescription: "Select, move and rotate objects.",
		hlp: renderer.getToolHelper(),
		scene: currentScene,
		preservesSelection: true,
	}));

	renderer.setupRender(currentScene);

	setupTools(currentScene);

	trackSceneObjects(currentScene, () => {
		switchToTool(transformTool, currentScene);
	});
}
