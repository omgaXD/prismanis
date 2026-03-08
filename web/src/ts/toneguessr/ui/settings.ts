import { BaseGameParams, Flavor, GameMode, GameParams, NotesGameParams } from "..";
import { fadeOut } from "../../shared/helpers/animations";

function ensureMinMax(
	minElement: HTMLInputElement,
	maxElement: HTMLInputElement,
	addInvalidClassTo: HTMLElement | null = null,
) {
	const min = parseFloat(minElement.value);
	const max = parseFloat(maxElement.value);
	const valid = !isNaN(min) && !isNaN(max) && min <= max;
	if (addInvalidClassTo) {
		addInvalidClassTo.classList.toggle("danger-text", !valid);
	}
	return valid;
}

function getGameMode(): GameMode {
	const notesChecked = (document.getElementById("mode-notes") as HTMLInputElement).checked;
	const freqChecked = (document.getElementById("mode-freq") as HTMLInputElement).checked;
	if (notesChecked) return "notes";
	if (freqChecked) return "freq";
	throw new Error("No game mode selected");
}

function getFlavor(): Flavor {
	return (document.getElementById("flavor") as HTMLSelectElement).value as "sine" | "piano";
}

function initInputValidation() {
	const notesMinElement = document.getElementById("notes-octaves-min") as HTMLInputElement;
	const notesMaxElement = document.getElementById("notes-octaves-max") as HTMLInputElement;
	const notesMinMaxContainer = document.getElementById("notes-octaves") as HTMLElement;
	const freqMinElement = document.getElementById("freq-hz-min") as HTMLInputElement;
	const freqMaxElement = document.getElementById("freq-hz-max") as HTMLInputElement;
	const freqMinMaxContainer = document.getElementById("freq-hz") as HTMLElement;

	const handleNotes = () => ensureMinMax(notesMinElement, notesMaxElement, notesMinMaxContainer);
	notesMinElement.addEventListener("input", handleNotes);
	notesMaxElement.addEventListener("input", handleNotes);

	const handleFreq = () => ensureMinMax(freqMinElement, freqMaxElement, freqMinMaxContainer);
	freqMinElement.addEventListener("input", handleFreq);
	freqMaxElement.addEventListener("input", handleFreq);
}

function buildNotesGameParams(): Omit<NotesGameParams, keyof BaseGameParams> {
	const tuningA4Hz = parseFloat((document.getElementById("notes-a-hz") as HTMLSelectElement).value);
	const notesOctavesMin = parseInt((document.getElementById("notes-octaves-min") as HTMLInputElement).value);
	const notesOctavesMax = parseInt((document.getElementById("notes-octaves-max") as HTMLInputElement).value);
	return { tuningA4Hz, notesOctavesMin, notesOctavesMax };
}

function buildFreqGameParams(): Omit<GameParams, keyof BaseGameParams> {
	const freqHzMin = parseFloat((document.getElementById("freq-hz-min") as HTMLInputElement).value);
	const freqHzMax = parseFloat((document.getElementById("freq-hz-max") as HTMLInputElement).value);
	return { type: "freq", freqHzMin, freqHzMax };
}

function buildParams(mode: GameMode, flavor: Flavor): GameParams {
	const baseParams: BaseGameParams = { type: mode, flavor };
	if (mode === "notes") {
		return { ...baseParams, ...buildNotesGameParams() } as GameParams;
	} else {
		return { ...baseParams, ...buildFreqGameParams() } as GameParams;
	}
}

export function hideSettings() {
	const settings = document.getElementById("settings")!;
	return fadeOut({ element: settings, displayNone: true });
}

export async function initSettings(): Promise<GameParams> {
	initInputValidation();
	const promise = new Promise<GameParams>((resolve) => {
		document.getElementById("start-button")!.addEventListener("click", () => {
			const mode = getGameMode();
			const flavor = getFlavor();
			resolve(buildParams(mode, flavor));
		});
	});
	return promise;
}
