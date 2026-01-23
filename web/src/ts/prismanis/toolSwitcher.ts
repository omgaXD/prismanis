import { Curve, Paint } from "./drawing";
import { LightRaycaster } from "./light";
import { Scene } from "./scene";

export function initPaintTools(canvas: HTMLCanvasElement, onClosed: (curve: Curve) => void) {
    const paint = new Paint({
        closedDistanceThreshold: 20,
        canvas: canvas,
        onCurveClosed: onClosed,
    });
    paint.init();
    return paint;
}

export function initLightRaycaster(canvas: HTMLCanvasElement, getTransformedCurves: () => Curve[]) {
    const lightRaycaster = new LightRaycaster({
        canvas, getTransformedCurves
    });
    lightRaycaster.init();
    return lightRaycaster;
}

export function setupToolSwitcher(paint: Paint, lightRaycaster: LightRaycaster) {
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

export function setupClearButton(paint: Paint) {
    const clearButton = document.getElementById("clear-btn") as HTMLButtonElement;
    clearButton.addEventListener("click", () => {
        paint.clear();
    });
}