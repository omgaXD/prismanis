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
		drawingThreshold: 20,
	});
	const raycastTool = new RaycastTool({
		hlp: renderer.getToolHelper(),
		getTransformedCurves: () => getTransformedCurvesFromScene(currentScene),
		// Approximate solar visible spectral power distribution (blackbody ~5778K),
		// sampled across the visible band and normalized to the previous peak opacity (0.2).
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
		],
	});
	const transformTool = new TransformTool({
		hlp: renderer.getToolHelper(),
		scene: currentScene,
	});
	renderer.setupRender(currentScene, paintTool, raycastTool);

	setupTools(currentScene, [
		{ tool: paintTool, name: "paint" },
		{ tool: raycastTool, name: "raycast" },
		{ tool: transformTool, name: "transform" },
	]);
}
