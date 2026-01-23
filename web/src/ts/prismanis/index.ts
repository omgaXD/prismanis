import { curveAdderFactory, Scene } from "./scene";
import { setupTools } from "./tools";
import { Renderer } from "./render";
import { getTransformedCurvesFromScene } from "./helpers";
import { PaintTool } from "./tools/paintTool";
import { RaycastTool } from "./tools/raycastTool";
import { TransformTool } from "./tools/transformTool";
import { registerTool } from "./tools/tool";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let currentScene = new Scene();

if (ctx) {
	const renderer = new Renderer(canvas);

	registerTool(new PaintTool({
			id: "paint",
			displayName: "Paint Tool",
			displayDescription: "Draw freeform closed curves on the canvas.",
			hlp: renderer.getToolHelper(),
			onCurveClosed: curveAdderFactory(currentScene),
		}));
	registerTool(new RaycastTool({
		id: "raycast",
		displayName: "Raycast Tool",
		displayDescription: "Cast rays from points on closed curves.",
		hlp: renderer.getToolHelper(),
		getTransformedCurves: () => getTransformedCurvesFromScene(currentScene),
		rayConfig: [
			{ wavelength: 380, opacity: 0.05, initialAngle: 0 },
			{ wavelength: 420, opacity: 0.12, initialAngle: 0 },
			{ wavelength: 460, opacity: 0.18, initialAngle: 0 },
			{ wavelength: 500, opacity: 0.2, initialAngle: 0 },
			{ wavelength: 540, opacity: 0.196, initialAngle: 0 },
			{ wavelength: 580, opacity: 0.17, initialAngle: 0 },
			{ wavelength: 620, opacity: 0.12, initialAngle: 0 },
			{ wavelength: 660, opacity: 0.07, initialAngle: 0 },
			{ wavelength: 700, opacity: 0.036, initialAngle: 0 },
			{ wavelength: 740, opacity: 0.01, initialAngle: 0 },
		]
	}))
	registerTool(new TransformTool({
		id: "transform",
		displayName: "Transform Tool",
		displayDescription: "Select, move, rotate, and scale objects.",
		hlp: renderer.getToolHelper(),
		scene: currentScene,
	}));

	renderer.setupRender(currentScene);

	setupTools(currentScene);
}
