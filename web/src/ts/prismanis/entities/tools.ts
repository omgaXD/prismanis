import { AbstractTool, registeredTools } from "../tools/tool";
import { Scene } from "./scene";
import { ToolSettingSelect, ToolSettingNumber, ToolSettingSlider, ToolSettingSnapAngle } from "./toolSettings";


const toolNameElem = document.getElementById("tool-name") as HTMLHeadingElement;
const toolDescriptionElem = document.getElementById("tool-description") as HTMLParagraphElement;
const toolOptionsElem = document.getElementById("tool-options") as HTMLDivElement;

export function setupTools(currentScene: Scene) {
	function adjustTool() {
		const checkedInput = (document.querySelector('input[name="tool"]:checked') as HTMLInputElement).value;
		const checkedTool = registeredTools.find((tool) => `toggle-${tool.id}` === checkedInput);
		if (checkedTool) {
			switchToTool(checkedTool, currentScene);
		}
	}
	adjustTool();
	const toolInputs = document.querySelectorAll('input[name="tool"]');
	toolInputs.forEach((input) => {
		input.addEventListener("change", adjustTool);
	});

	setupClearButton(currentScene);
	setupUndoRedoButtons(currentScene);
	setupDeleteKeyListener(currentScene);
}

export function switchToTool(tool: AbstractTool, currentScene: Scene) {
	registeredTools.forEach((t) => {
		t.toggle(t === tool);
	});

	if (tool.preservesSelection === false) {
		currentScene.deselect();
	}

	// just in case, also set the radio button
	const toolRadioInputs = document.querySelector(`input[name="tool"][value="toggle-${tool.id}"]`) as HTMLInputElement;
	toolRadioInputs.checked = true;

	toolNameElem.textContent = tool.displayName;
	toolDescriptionElem.textContent = tool.displayDescription;
	toolOptionsElem.innerHTML = "";

	tool.settings.forEach((setting) => {
		const optionDiv = document.createElement("div");
		optionDiv.classList.add("tool-option");

		const label = document.createElement("label");
		label.classList.add("form-label");
		label.textContent = setting.displayName;
		label.htmlFor = `option-${setting.id}`;
		optionDiv.appendChild(label);

		let input: HTMLElement;

		if (setting instanceof ToolSettingSelect) {
			const select = document.createElement("select");
			select.id = `option-${setting.id}`;
			setting.options.forEach((opt) => {
				const optionElem = document.createElement("option");
				optionElem.value = opt.value;
				optionElem.textContent = opt.displayName;
				if (opt.value === setting.getValue()) {
					optionElem.selected = true;
				}
				select.appendChild(optionElem);
			});
			select.addEventListener("change", () => {
				setting.setValue(select.value);
			});
			input = select;
		} else if (setting instanceof ToolSettingNumber) {
			const numberInput = document.createElement("input");
			numberInput.type = "number";
			numberInput.id = `option-${setting.id}`;
			numberInput.value = setting.getValue().toString();
			numberInput.min = setting.min.toString();
			numberInput.max = setting.max.toString();
			numberInput.addEventListener("change", () => {
				setting.setValue(Number(numberInput.value));
			});
			input = numberInput;
		} else if (setting instanceof ToolSettingSlider) {
			const sliderInput = document.createElement("input");
			sliderInput.type = "range";
			sliderInput.id = `option-${setting.id}`;
			sliderInput.value = setting.getValue().toString();
			sliderInput.min = setting.min.toString();
			sliderInput.max = setting.max.toString();
			sliderInput.step = setting.step.toString();
			sliderInput.addEventListener("input", () => {
				setting.setValue(Number(sliderInput.value));
			});
			input = sliderInput;

			const output = document.createElement("output");
			output.htmlFor = sliderInput.id;
			output.value = sliderInput.value;
			sliderInput.addEventListener("input", () => {
				output.value = sliderInput.value;
			});
			optionDiv.appendChild(output);
		} else if (setting instanceof ToolSettingSnapAngle) {
			const radioGroup = document.createElement("div");
			radioGroup.classList.add("compact-radio-group");
			const options = [0, 15, 30, 45, 90];
			options.forEach((angle) => {
				const radioLabel = document.createElement("label");
				radioLabel.className = "round rect text-base px-1 hover-highlight checked-highlight";
				radioLabel.textContent = angle === 0 ? "None" : `${angle}°`;

				const radioInput = document.createElement("input");
				radioInput.type = "radio";
				radioInput.name = `snap-angle-${setting.id}`;
				radioInput.value = angle.toString();
				radioInput.classList.add("form-check-input");
				if (setting.getValue() === angle) {
					radioInput.checked = true;
				}
				radioInput.addEventListener("change", () => {
					if (radioInput.checked) {
						setting.setValue(angle);
					}
				});

				radioLabel.prepend(radioInput);
				radioGroup.appendChild(radioLabel);
			});
			input = radioGroup;
		} else {
			throw new Error(`Unsupported tool option type for option ${setting.id}`);
		}

		optionDiv.appendChild(input);
		toolOptionsElem.appendChild(optionDiv);
	});
}

function setupClearButton(scene: Scene) {
	const clearButton = document.getElementById("clear-btn") as HTMLButtonElement;
	clearButton.addEventListener("click", () => {
		scene.clear();
	});

	window.addEventListener("keydown", (ev) => {
		if (ev.shiftKey && ev.key === "Delete") {
			scene.clear();
			ev.preventDefault();
		}
	});
}

function setupUndoRedoButtons(scene: Scene) {
	const undoButton = document.getElementById("undo-btn") as HTMLButtonElement;
	const redoButton = document.getElementById("redo-btn") as HTMLButtonElement;

	undoButton.addEventListener("click", () => {
		scene.undo();
	});

	redoButton.addEventListener("click", () => {
		scene.redo();
	});

	scene.addListener("history-availability-changed", (ev) => {
		if (ev.which !== "undo") return;
		undoButton.disabled = !ev.available;
	});
	scene.addListener("history-availability-changed", (ev) => {
		if (ev.which !== "redo") return;
		redoButton.disabled = !ev.available;
	});

	undoButton.disabled = !scene.canUndo();
	redoButton.disabled = !scene.canRedo();

	window.addEventListener("keydown", (ev) => {
		if (ev.ctrlKey && ev.key === "z") {
			scene.undo();
			ev.preventDefault();
		} else if (ev.ctrlKey && (ev.key === "y" || (ev.shiftKey && ev.key === "Z"))) {
			scene.redo();
			ev.preventDefault();
		}
	});
}

function setupDeleteKeyListener(scene: Scene) {
	window.addEventListener("keydown", (ev) => {
		if (ev.key === "Delete") {
			scene.remove(scene.selectedObjectIds);
			ev.preventDefault();
		}
	});
}
