import { Scene } from "./entities/scene";
import { SceneObject } from "./entities/sceneObjects";

const sceneObjectsSelect = document.getElementById("scene-objects") as HTMLSelectElement;
const pointCountSpan = document.getElementById("point-count") as HTMLSpanElement;

export function trackSceneObjects(scene: Scene, switchToTransformTool: () => void) {
	function addSceneObject(obj: SceneObject) {
		const objOption = document.createElement("option");
		objOption.classList.add("text-xs", "p-1", "hover:bg-blue-800", "cursor-pointer");
		objOption.id = `scene-object-${obj.id}`;
		objOption.value = obj.id;

		const span = document.createElement("span");
		span.classList.add("h-8", "flex", "items-center");
		span.textContent = `${obj.type} ${obj.id}`;
		objOption.appendChild(span);

		objOption.classList.add("scene-object-entry");
		sceneObjectsSelect.appendChild(objOption);
	}

	sceneObjectsSelect.addEventListener("change", () => {
		const selectedOptions = Array.from(sceneObjectsSelect.selectedOptions);
		const selectedIds = selectedOptions.map((opt) => opt.value);
		scene.selectedObjectIds = selectedIds;
		switchToTransformTool();
	});

	function updateSceneObjectSelectionStates() {
		for (const obj of scene.getObjects()) {
			const option = document.getElementById(`scene-object-${obj.id}`) as HTMLOptionElement | null;
			if (option) {
				if (scene.selectedObjectIds.includes(obj.id)) {
					option.selected = true;
				} else {
					option.selected = false;
				}
			}
		}
	}

	function removeSceneObject(objId: string) {
		const objDiv = document.getElementById(`scene-object-${objId}`);
		if (objDiv) {
			sceneObjectsSelect.removeChild(objDiv);
		}
	}

	// Initial population
	for (const obj of scene.getObjects()) {
		addSceneObject(obj);
	}

	scene.addListener("scene-object-changed", (ev) => {
		for (const addedId of ev.addedObjectIds) {
			const obj = scene.getObjectById(addedId);
			if (obj) {
				addSceneObject(obj);
			}
		}
		for (const removedId of ev.removedObjectIds) {
			removeSceneObject(removedId);
		}
		updateSceneObjectSelectionStates();
		updatePointCount();
	});

	function updatePointCount() {
		let totalPoints = 0;
		for (const obj of scene.getObjects()) {
			if (obj.type === "curve") {
				totalPoints += obj.curve.points.length;
			} else if (obj.type === "lens") {
				totalPoints += 4;
			}
		}
		if (totalPoints < 1000) {
		} else if (totalPoints < 2500) {
			pointCountSpan.classList.add("warning-text");
		} else {
			pointCountSpan.classList.add("danger-text");
		}
		pointCountSpan.textContent = totalPoints.toString();
	}
}
