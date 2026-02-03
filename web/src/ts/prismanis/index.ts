import { Renderer } from "./render";
import { PaintTool } from "./tools/paintTool";
import { RaycastTool } from "./tools/raycastTool";
import { TransformTool } from "./tools/transformTool";
import { registerTool } from "./tools/tool";
import { trackSceneObjects } from "./sceneObjectTracker";
import { LensTool } from "./tools/lensTool";
import { Scene } from "./entities/scene";
import { curveAdderFactory, lensAdderFactory, lightSourceAdderFactory } from "./entities/sceneObjects";
import { setupTools, switchToTool } from "./entities/tools";
import { PrismTool } from "./tools/prismTool";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let currentScene = new Scene();

if (ctx) {
	const renderer = new Renderer(canvas);

	registerTool(
		new PaintTool({
			id: "paint",
			displayName: "Paint Tool",
			displayDescription: "Draw freeform closed curves. Open curves will dissapear.",
			hlp: renderer.getCanvasInteractionHelper(),
			addCurve: curveAdderFactory(currentScene),
		}),
	);
	registerTool(
		new RaycastTool({
			id: "raycast",
			displayName: "Raycast Tool",
			displayDescription: "Place light sources. Choose position and direction.",
			hlp: renderer.getCanvasInteractionHelper(),
			scene: currentScene,
			addLightSource: lightSourceAdderFactory(currentScene),
		}),
	);
	const transformTool = registerTool(
		new TransformTool({
			id: "transform",
			displayName: "Transform Tool",
			displayDescription: "Select, move and rotate objects. [Shift] to select multiple.",
			hlp: renderer.getCanvasInteractionHelper(),
			scene: currentScene,
			preservesSelection: true,
		}),
	);
	const lensTool = registerTool(
		new LensTool({
			id: "lens",
			displayName: "Lens Tool",
			displayDescription: "Place lenses. Draw a rectangle and choose the radius for each side.",
			hlp: renderer.getCanvasInteractionHelper(),
			scene: currentScene,
			preservesSelection: true,
			addLens: lensAdderFactory(currentScene),
		}),
	);
	const prismTool = registerTool(
		new PrismTool({
			id: "prism",
			displayName: "Prism Tool",
			displayDescription: "Place prisms. Pick points to define the base shape. [Shift] for perfect aspect ratio.",
			hlp: renderer.getCanvasInteractionHelper(),
			preservesSelection: true,
			addCurve: curveAdderFactory(currentScene),
		}),
	);

	renderer.setupRender(currentScene);

	setupTools(currentScene);

	trackSceneObjects(currentScene, () => {
		switchToTool(transformTool, currentScene);
	});
}
