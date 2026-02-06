import { createField, doMove, getMoveDestination, highlightTileAt, parseMove, parsePosition, posToVec2, renderField } from "./game";

const field = createField();
renderField(field);

const input = document.getElementById("input") as HTMLInputElement;
input.addEventListener("keypress", (e) => {
	if (e.key === "Enter") {
		const command = input.value.trim().toLowerCase();
		const move = parseMove(command);
		if (move) {
			const result = doMove(field, move);
			if (result.valid) {
				renderField(field);
                input.placeholder = command;
			} else {
                console.log(result.reason);
                shakeInput();
            }
		} else {
            console.log("Invalid move format");
            shakeInput();
		}
        input.value = "";
        highlightTileAt(field, null);
	}
});
input.addEventListener("input", () => {
    const command = input.value.trim().toLowerCase();
    const move = parseMove(command);
    if (move) {
        input.classList.remove("border-red-500");
        input.classList.add("border-green-500");

        const dest = getMoveDestination(move);
        highlightTileAt(field, dest);
    } else {
        input.classList.remove("border-green-500");
        input.classList.add("border-red-500");
    }

    if (command.length === 2) {
        const pos = parsePosition(command);
        if (pos) {
            highlightTileAt(field, pos);
        }
    }

    if (command === "") {
        highlightTileAt(field, null);
    }
});
input.focus();

function shakeInput() {
    input.animate([
        { transform: "translateX(0)" },
        { transform: "translateX(-10px)" },
        { transform: "translateX(10px)" },
        { transform: "translateX(-10px)" },
        { transform: "translateX(10px)" },
        { transform: "translateX(0)" },
    ], {
        duration: 100,
        easing: "ease-in-out",
    });
}