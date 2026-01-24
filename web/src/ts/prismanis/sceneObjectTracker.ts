import { Scene, SceneObject } from "./entities/scene";

const sceneObjectsDiv = document.getElementById("scene-objects") as HTMLDivElement;
const pointCountSpan = document.getElementById("point-count") as HTMLSpanElement;

export function trackSceneObjects(scene: Scene, switchToTransformTool: () => void) {
	function addSceneObject(obj: SceneObject) {
		const objEl = document.createElement("div");
		objEl.classList.add("select-none", "text-xs", "p-1", "hover:bg-blue-800", "cursor-pointer");
		objEl.id = `scene-object-${obj.id}`;
		objEl.addEventListener("click", (ev) => {
			switchToTransformTool();
			if (ev.shiftKey) {
				if (scene.selectedObjectIds.includes(obj.id)) {
					scene.removeFromSelection(obj.id);
				} else {
					scene.addToSelection(obj.id);
				}
			} else {
				if (scene.selectedObjectIds.includes(obj.id) && scene.selectedObjectIds.length === 1) {
					scene.deselect();
				} else {
					scene.selectOnly(obj.id);
				}
			}
		});

		const span = document.createElement("span");
		span.textContent = `${obj.type} ${obj.id}`;
		objEl.appendChild(span);

		objEl.classList.add("scene-object-entry");
		sceneObjectsDiv.appendChild(objEl);
	}

	function updateSceneObjectSelectionStates() {
		for (const obj of scene.getObjects()) {
			const objDiv = document.getElementById(`scene-object-${obj.id}`);
			if (objDiv) {
				if (scene.selectedObjectIds.includes(obj.id)) {
					objDiv.classList.add("selected");
				} else {
					objDiv.classList.remove("selected");
				}
			}
		}
	}

	function removeSceneObject(objId: string) {
		const objDiv = document.getElementById(`scene-object-${objId}`);
		if (objDiv) {
			sceneObjectsDiv.removeChild(objDiv);
		}
	}

	// Initial population
	for (const obj of scene.getObjects()) {
		addSceneObject(obj);
	}

	scene.addListener("scene-object-changed", (ev) => {
		console.log(ev);
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
